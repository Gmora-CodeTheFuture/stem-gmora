<?php

namespace App\Http\Controllers\Instructor;

use App\Events\ExperienceEarned;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\QuizAttempt;
use App\Models\Submission;
use App\Notifications\SubmissionGraded;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The instructor grading queue (Plan §4.10): ungraded assignment submissions
 * plus quiz attempts holding essay/code answers the auto-grader deferred.
 *
 * Row-level ownership applies on top of the role gate — an instructor only
 * ever sees work from their own courses, unless they are a platform admin
 * (Plan §7.2).
 */
class GradingController extends Controller
{
    public function index(Request $request): Response
    {
        $courseIds = $this->gradableCourseIds($request);

        $submissions = Submission::whereIn('status', ['pending', 'returned'])
            ->whereHas('assignment', fn ($q) => $q->whereIn('course_id', $courseIds))
            ->with(['assignment:id,course_id,title,max_marks,deadline_at', 'assignment.course:id,title', 'user:id,full_name,email'])
            ->latest()
            ->get();

        $attempts = QuizAttempt::where('status', QuizAttempt::STATUS_SUBMITTED)
            ->whereHas('quiz', fn ($q) => $q->whereIn('course_id', $courseIds))
            ->with(['quiz:id,course_id,title,passing_score', 'quiz.course:id,title', 'quiz.questions', 'user:id,full_name'])
            ->latest('submitted_at')
            ->get();

        return Inertia::render('Instructor/Grading', [
            'submissions' => $submissions->map(fn (Submission $submission) => [
                ...$submission->only(['id', 'type', 'repo_url', 'link_url', 'notes', 'status', 'created_at']),
                'has_file' => $submission->file_url !== null,
                'student' => $submission->user?->only(['id', 'full_name', 'email']),
                'assignment' => [
                    ...$submission->assignment->only(['id', 'title', 'max_marks', 'deadline_at']),
                    'course' => $submission->assignment->course?->only(['id', 'title']),
                ],
                'is_late' => $submission->assignment->deadline_at
                    ? $submission->created_at->gt($submission->assignment->deadline_at)
                    : false,
            ])->values(),
            'quizAttempts' => $attempts->map(fn (QuizAttempt $attempt) => [
                ...$attempt->only(['id', 'score', 'points_earned', 'points_possible', 'submitted_at']),
                'student' => $attempt->user?->only(['id', 'full_name']),
                'quiz' => [
                    ...$attempt->quiz->only(['id', 'title', 'passing_score']),
                    'course' => $attempt->quiz->course?->only(['id', 'title']),
                ],
                // The written answers the auto-grader could not score.
                'manual_answers' => $attempt->quiz->questions
                    ->reject(fn ($question) => $question->isAutoGradable())
                    ->map(fn ($question) => [
                        'id' => $question->id,
                        'type' => $question->type,
                        'body' => $question->body,
                        'points' => $question->points,
                        'answer' => data_get($attempt->answers, $question->id),
                    ])
                    ->values(),
            ])->values(),
        ]);
    }

    /** Record marks and feedback against a submission. */
    public function grade(Request $request, Submission $submission): RedirectResponse
    {
        $submission->loadMissing('assignment');

        abort_unless(
            $this->gradableCourseIds($request)->contains($submission->assignment->course_id),
            403,
            'You can only grade work from your own courses.',
        );

        $validated = $request->validate([
            'marks_awarded' => ['required', 'integer', 'min:0', 'max:'.$submission->assignment->max_marks],
            'feedback' => ['nullable', 'string', 'max:5000'],
            'status' => ['required', 'in:graded,returned'],
        ]);

        $previousStatus = $submission->status;

        $submission->update([
            ...$validated,
            'graded_at' => now(),
            'graded_by' => $request->user()->id,
        ]);

        AuditLog::record('submission.graded', 'submission', $submission->id, [
            'marks_awarded' => $validated['marks_awarded'],
            'status' => $validated['status'],
        ], $request->user()->id);

        $submission->user?->notify(new SubmissionGraded($submission->fresh('assignment')));

        // XP once per assignment, when it is first marked (not on re-grades).
        if ($validated['status'] === 'graded' && $submission->user && $previousStatus !== 'graded') {
            ExperienceEarned::dispatch(
                $submission->user,
                (int) config('gamification.xp.assignment_graded'),
                'assignment_graded',
            );
        }

        return back()->with('success', 'Grade recorded.');
    }

    /**
     * Finalise a quiz attempt that held manually-graded questions. The
     * instructor awards the outstanding points; the score is recomputed.
     */
    public function gradeAttempt(Request $request, QuizAttempt $attempt): RedirectResponse
    {
        $attempt->loadMissing('quiz');

        abort_unless(
            $this->gradableCourseIds($request)->contains($attempt->quiz->course_id),
            403,
            'You can only grade work from your own courses.',
        );

        $validated = $request->validate([
            'points_earned' => ['required', 'integer', 'min:0', 'max:'.$attempt->points_possible],
        ]);

        $attempt->update([
            'points_earned' => $validated['points_earned'],
            'score' => $attempt->points_possible > 0
                ? round($validated['points_earned'] / $attempt->points_possible * 100, 2)
                : 0,
            'status' => QuizAttempt::STATUS_GRADED,
        ]);

        AuditLog::record('quiz_attempt.graded', 'quiz_attempt', $attempt->id, [
            'points_earned' => $validated['points_earned'],
        ], $request->user()->id);

        return back()->with('success', 'Attempt graded.');
    }

    /** Download a student's submitted file from the private disk. */
    public function download(Request $request, Submission $submission)
    {
        $submission->loadMissing('assignment');

        abort_unless(
            $this->gradableCourseIds($request)->contains($submission->assignment->course_id)
                || $submission->user_id === $request->user()->id,
            403,
        );

        abort_unless($submission->file_url && Storage::disk('local')->exists($submission->file_url), 404);

        return Storage::disk('local')->download($submission->file_url);
    }

    /** @return Collection<int, string> */
    private function gradableCourseIds(Request $request)
    {
        $user = $request->user();

        return $user->isAdmin()
            ? Course::pluck('id')
            : Course::where('instructor_id', $user->id)->pluck('id');
    }
}
