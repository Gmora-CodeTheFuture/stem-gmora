<?php

namespace App\Http\Controllers;

use App\Events\ExperienceEarned;
use App\Models\AuditLog;
use App\Models\Enrollment;
use App\Models\Progress;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Services\GradingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Quiz attempts (Plan §4.4). Every route is enrollment-gated, and no response
 * on the attempt path carries an answer key — see Question::forStudent().
 */
class QuizController extends Controller
{
    public function __construct(private readonly GradingService $grading) {}

    /** Quiz intro: rules, attempts used, previous results. */
    public function show(Request $request, Quiz $quiz): Response
    {
        abort_unless($quiz->is_published, 404);

        $attempts = $this->attemptsFor($request, $quiz);

        return Inertia::render('Quiz/Show', [
            'quiz' => [
                ...$quiz->only(['id', 'title', 'description', 'time_limit_seconds', 'max_attempts', 'passing_score']),
                'question_count' => $quiz->questions()->count(),
                'total_points' => (int) $quiz->questions()->sum('points'),
                'course' => $quiz->course->only(['id', 'title', 'slug']),
            ],
            'attempts' => $attempts->map(fn (QuizAttempt $attempt) => [
                ...$attempt->only(['id', 'score', 'points_earned', 'points_possible', 'status', 'submitted_at']),
                'passed' => $this->grading->hasPassed($quiz, $attempt),
            ])->values(),
            'attemptsRemaining' => max($quiz->max_attempts - $attempts->count(), 0),
            'activeAttemptId' => $attempts->firstWhere('status', QuizAttempt::STATUS_IN_PROGRESS)?->id,
        ]);
    }

    /**
     * Start an attempt. Resumes an in-progress one rather than burning a try,
     * so a dropped connection does not cost the student an attempt.
     */
    public function start(Request $request, Quiz $quiz): RedirectResponse
    {
        abort_unless($quiz->is_published, 404);

        $attempts = $this->attemptsFor($request, $quiz);
        $active = $attempts->firstWhere('status', QuizAttempt::STATUS_IN_PROGRESS);

        if ($active) {
            return redirect()->route('quiz.attempt', $active);
        }

        if ($attempts->count() >= $quiz->max_attempts) {
            return back()->with('error', 'You have used all your attempts for this quiz.');
        }

        $attempt = QuizAttempt::create([
            'user_id' => $request->user()->id,
            'quiz_id' => $quiz->id,
            'answers' => [],
            'status' => QuizAttempt::STATUS_IN_PROGRESS,
            'started_at' => now(),
        ]);

        return redirect()->route('quiz.attempt', $attempt);
    }

    /** The attempt player. */
    public function attempt(Request $request, QuizAttempt $attempt): Response|RedirectResponse
    {
        $this->authorizeAttempt($request, $attempt);

        if (! $attempt->isInProgress()) {
            return redirect()->route('quiz.result', $attempt);
        }

        // A player that sat idle past the limit is closed out on next contact.
        if ($attempt->hasExpired()) {
            $this->grading->grade($attempt, $attempt->answers ?? []);

            return redirect()->route('quiz.result', $attempt)
                ->with('warning', 'Time ran out — your answers were submitted automatically.');
        }

        $quiz = $attempt->quiz;
        $questions = $quiz->questions;

        if ($quiz->shuffle_questions) {
            $questions = $questions->shuffle();
        }

        return Inertia::render('Quiz/Attempt', [
            'quiz' => $quiz->only(['id', 'title', 'time_limit_seconds', 'passing_score']),
            'attempt' => [
                'id' => $attempt->id,
                'answers' => (object) ($attempt->answers ?? []),
                'started_at' => $attempt->started_at->toIso8601String(),
                'deadline' => $attempt->deadline()?->toIso8601String(),
            ],
            'questions' => $questions->map->forStudent()->values(),
        ]);
    }

    /** Autosave — keeps answers durable without ending the attempt. */
    public function save(Request $request, QuizAttempt $attempt): RedirectResponse
    {
        $this->authorizeAttempt($request, $attempt);
        abort_unless($attempt->isInProgress(), 409, 'This attempt has already been submitted.');

        $validated = $request->validate([
            'answers' => ['required', 'array'],
        ]);

        $attempt->update(['answers' => $validated['answers']]);

        return back();
    }

    /** Submit for grading. */
    public function submit(Request $request, QuizAttempt $attempt): RedirectResponse
    {
        $this->authorizeAttempt($request, $attempt);

        if (! $attempt->isInProgress()) {
            return redirect()->route('quiz.result', $attempt);
        }

        $validated = $request->validate([
            'answers' => ['sometimes', 'array'],
        ]);

        // Answers submitted after the deadline are ignored; whatever was
        // autosaved before time ran out is what gets graded.
        $answers = $attempt->hasExpired()
            ? ($attempt->answers ?? [])
            : ($validated['answers'] ?? $attempt->answers ?? []);

        DB::transaction(function () use ($attempt, $answers) {
            $this->grading->grade($attempt, $answers);
            $this->syncLessonProgress($attempt);
        });

        AuditLog::record('quiz.submitted', 'quiz_attempt', $attempt->id, [
            'quiz_id' => $attempt->quiz_id,
            'score' => (float) $attempt->score,
        ], $attempt->user_id);

        // XP for a pass, and only for the first passing attempt.
        if ($this->grading->hasPassed($attempt->quiz, $attempt) && $this->isFirstPass($attempt)) {
            ExperienceEarned::dispatch(
                $request->user(),
                (int) config('gamification.xp.quiz_passed'),
                'quiz_passed',
            );
        }

        return redirect()->route('quiz.result', $attempt);
    }

    /** Results, with the answer key revealed now that grading is done. */
    public function result(Request $request, QuizAttempt $attempt): Response|RedirectResponse
    {
        $this->authorizeAttempt($request, $attempt);

        if ($attempt->isInProgress()) {
            return redirect()->route('quiz.attempt', $attempt);
        }

        $quiz = $attempt->quiz;
        $answers = $attempt->answers ?? [];

        return Inertia::render('Quiz/Result', [
            'quiz' => [
                ...$quiz->only(['id', 'title', 'passing_score', 'max_attempts']),
                'course' => $quiz->course->only(['id', 'title', 'slug']),
            ],
            'attempt' => [
                ...$attempt->only(['id', 'score', 'points_earned', 'points_possible', 'status', 'submitted_at']),
                'passed' => $this->grading->hasPassed($quiz, $attempt),
                'awaiting_review' => $attempt->status === QuizAttempt::STATUS_SUBMITTED,
            ],
            'questions' => $quiz->questions->map(fn ($question) => [
                ...$question->forStudent(revealAnswers: true),
                'given_answer' => $answers[$question->id] ?? null,
                'is_correct' => $question->isAutoGradable()
                    ? $this->grading->isCorrect($question, $answers[$question->id] ?? null)
                    : null,
            ])->values(),
            'attemptsRemaining' => max(
                $quiz->max_attempts - $this->attemptsFor($request, $quiz)->count(),
                0,
            ),
        ]);
    }

    /**
     * A passing attempt completes the quiz's lesson, so quizzes count toward
     * course completion like any other lesson (Plan §8.8).
     */
    private function syncLessonProgress(QuizAttempt $attempt): void
    {
        $lessonId = $attempt->quiz->lesson_id;

        if (! $lessonId || ! $this->grading->hasPassed($attempt->quiz, $attempt)) {
            return;
        }

        $enrollment = Enrollment::where('user_id', $attempt->user_id)
            ->where('course_id', $attempt->quiz->course_id)
            ->where('status', Enrollment::STATUS_ACTIVE)
            ->first();

        if (! $enrollment) {
            return;
        }

        Progress::updateOrCreate(
            ['enrollment_id' => $enrollment->id, 'lesson_id' => $lessonId],
            [
                'status' => Progress::STATUS_COMPLETED,
                'watch_percentage' => 100,
                'completed_at' => now(),
            ],
        );
    }

    /** @return Collection<int, QuizAttempt> */
    /** True when this is the earliest passing attempt for the quiz. */
    private function isFirstPass(QuizAttempt $attempt): bool
    {
        $threshold = (float) $attempt->quiz->passing_score;

        return ! QuizAttempt::where('user_id', $attempt->user_id)
            ->where('quiz_id', $attempt->quiz_id)
            ->whereKeyNot($attempt->id)
            ->where('score', '>=', $threshold)
            ->exists();
    }

    private function attemptsFor(Request $request, Quiz $quiz)
    {
        return QuizAttempt::where('user_id', $request->user()->id)
            ->where('quiz_id', $quiz->id)
            ->orderBy('started_at')
            ->get();
    }

    private function authorizeAttempt(Request $request, QuizAttempt $attempt): void
    {
        abort_unless($attempt->user_id === $request->user()->id, 403);
    }
}
