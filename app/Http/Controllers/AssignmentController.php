<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\AuditLog;
use App\Models\Enrollment;
use App\Models\Submission;
use App\Services\CurriculumGate;
use App\Services\DashboardCache;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Student-side assignments. Supports legacy file/repo/link submissions and
 * question-based answer submissions (MCQ / short answer / normal).
 */
class AssignmentController extends Controller
{
    public function __construct(private readonly CurriculumGate $curriculum) {}

    /** Every assignment across the student's active courses. */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $courseIds = Enrollment::where('user_id', $user->id)
            ->whereIn('status', [Enrollment::STATUS_ACTIVE, Enrollment::STATUS_COMPLETED])
            ->pluck('course_id');

        $assignments = Assignment::whereIn('course_id', $courseIds)
            ->where('is_published', true)
            ->with('course:id,title,slug')
            ->with(['submissions' => fn ($q) => $q->where('user_id', $user->id)])
            ->orderByRaw('deadline_at is null, deadline_at')
            ->get();

        return Inertia::render('Dashboard/Assignments', [
            'assignments' => $assignments->map(fn (Assignment $assignment) => [
                ...$assignment->only(['id', 'title', 'description', 'deadline_at', 'max_marks', 'is_required', 'module_id']),
                'course' => $assignment->course?->only(['id', 'title', 'slug']),
                'submission' => $assignment->submissions->first()?->only([
                    'id', 'type', 'file_url', 'repo_url', 'link_url', 'notes', 'answers',
                    'status', 'marks_awarded', 'feedback', 'graded_at', 'created_at',
                ]),
                'is_overdue' => $assignment->deadline_at?->isPast() ?? false,
            ])->values(),
        ]);
    }

    public function show(Request $request, Assignment $assignment): Response
    {
        abort_unless($assignment->is_published, 404);

        $assignment->load(['questions' => fn ($q) => $q->orderBy('order_index'), 'course:id,title,slug']);

        $submission = Submission::where('assignment_id', $assignment->id)
            ->where('user_id', $request->user()->id)
            ->first();

        $reveal = $submission && in_array($submission->status, ['graded', 'returned'], true);

        return Inertia::render('Dashboard/AssignmentDetail', [
            'assignment' => [
                ...$assignment->only(['id', 'title', 'description', 'deadline_at', 'max_marks', 'rubric', 'is_required', 'module_id']),
                'course' => $assignment->course?->only(['id', 'title', 'slug']),
                'is_overdue' => $assignment->deadline_at?->isPast() ?? false,
                'questions' => $assignment->questions->map(fn ($q) => $q->forStudent($reveal))->values(),
            ],
            'submission' => $submission?->only([
                'id', 'type', 'file_url', 'repo_url', 'link_url', 'notes', 'answers',
                'status', 'marks_awarded', 'feedback', 'graded_at', 'created_at',
            ]),
        ]);
    }

    /**
     * Submit or resubmit. A graded submission is locked.
     * Type `answers` is used when the assignment has questions.
     */
    public function store(Request $request, Assignment $assignment): RedirectResponse
    {
        abort_unless($assignment->is_published, 404);

        $assignment->load('questions');
        $hasQuestions = $assignment->questions->isNotEmpty();

        if ($hasQuestions || $request->input('type') === 'answers') {
            return $this->storeAnswers($request, $assignment);
        }

        $validated = $request->validate([
            'type' => ['required', 'in:file,repo,link'],
            'file' => [
                'required_if:type,file',
                'file',
                'max:20480',
                'mimes:pdf,zip,png,jpg,jpeg,gif,webp',
            ],
            'repo_url' => [
                'required_if:type,repo',
                'nullable',
                'url',
                'max:255',
                Rule::when(
                    $request->input('type') === 'repo',
                    ['regex:/^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(\/.*)?$/i'],
                ),
            ],
            'link_url' => [
                'required_if:type,link',
                'nullable',
                'url',
                'max:255',
                Rule::when(
                    $request->input('type') === 'link',
                    ['regex:/^https?:\/\//i'],
                ),
            ],
            'notes' => ['nullable', 'string', 'max:2000'],
        ], [
            'repo_url.regex' => 'Enter a valid GitHub repository URL (https://github.com/owner/repo).',
            'file.mimes' => 'Only images, PDF, or ZIP files are allowed.',
        ]);

        $submission = Submission::firstOrNew([
            'assignment_id' => $assignment->id,
            'user_id' => $request->user()->id,
        ]);

        if ($submission->exists && $submission->status === 'graded') {
            return back()->with('error', 'This submission has been graded and can no longer be changed.');
        }

        $filePath = $submission->file_url;

        if ($validated['type'] === 'file' && $request->hasFile('file')) {
            $filePath = $request->file('file')->store(
                "submissions/{$assignment->id}",
                ['disk' => 'local'],
            );
        }

        $submission->fill([
            'type' => $validated['type'],
            'file_url' => $validated['type'] === 'file' ? $filePath : null,
            'repo_url' => $validated['type'] === 'repo' ? $this->sanitizeUrl($validated['repo_url'] ?? null) : null,
            'link_url' => $validated['type'] === 'link' ? $this->sanitizeUrl($validated['link_url'] ?? null) : null,
            'notes' => $this->sanitizeNotes($validated['notes'] ?? null),
            'answers' => null,
            'status' => 'pending',
            'marks_awarded' => null,
            'feedback' => null,
            'graded_at' => null,
            'graded_by' => null,
        ])->save();

        $this->afterSubmit($request, $assignment, $submission);

        return back()->with('success', 'Submission received.');
    }

    private function storeAnswers(Request $request, Assignment $assignment): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['sometimes', 'in:answers'],
            'answers' => ['required', 'array'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $submission = Submission::firstOrNew([
            'assignment_id' => $assignment->id,
            'user_id' => $request->user()->id,
        ]);

        if ($submission->exists && $submission->status === 'graded') {
            return back()->with('error', 'This submission has been graded and can no longer be changed.');
        }

        $answers = $this->sanitizeAnswers($validated['answers']);
        $score = $this->curriculum->scoreAnswers($assignment->questions, $answers);

        $status = $score['needs_manual'] ? 'pending' : 'graded';
        $marks = $score['possible'] > 0
            ? (int) round($score['earned'] / $score['possible'] * $assignment->max_marks)
            : null;

        $submission->fill([
            'type' => 'answers',
            'file_url' => null,
            'repo_url' => null,
            'link_url' => null,
            'notes' => $this->sanitizeNotes($validated['notes'] ?? null),
            'answers' => $answers,
            'status' => $status,
            'marks_awarded' => $score['needs_manual'] ? null : $marks,
            'feedback' => null,
            'graded_at' => $status === 'graded' ? now() : null,
            'graded_by' => null,
        ])->save();

        $this->afterSubmit($request, $assignment, $submission);

        return back()->with('success', 'Answers submitted.');
    }

    private function afterSubmit(Request $request, Assignment $assignment, Submission $submission): void
    {
        DashboardCache::forget($request->user()->id);

        AuditLog::record('submission.created', 'submission', $submission->id, [
            'assignment_id' => $assignment->id,
            'late' => $assignment->deadline_at?->isPast() ?? false,
            'type' => $submission->type,
        ], $request->user()->id);
    }

    /** Strip HTML/script tags and control characters from free-text notes. */
    private function sanitizeNotes(?string $notes): ?string
    {
        if ($notes === null || $notes === '') {
            return null;
        }

        $clean = strip_tags($notes);
        // Remove ASCII control chars except tab/newline.
        $clean = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $clean) ?? '';
        $clean = trim($clean);

        return $clean === '' ? null : mb_substr($clean, 0, 2000);
    }

    private function sanitizeUrl(?string $url): ?string
    {
        if ($url === null || $url === '') {
            return null;
        }

        $clean = strip_tags(trim($url));

        return mb_substr($clean, 0, 255);
    }

    /**
     * @param  array<string, mixed>  $answers
     * @return array<string, mixed>
     */
    private function sanitizeAnswers(array $answers): array
    {
        $clean = [];

        foreach ($answers as $questionId => $answer) {
            $key = is_string($questionId) ? strip_tags($questionId) : (string) $questionId;

            if (is_string($answer)) {
                $clean[$key] = $this->sanitizeNotes($answer) ?? '';
            } elseif (is_array($answer)) {
                $clean[$key] = array_map(
                    fn ($item) => is_string($item) ? (strip_tags($item)) : $item,
                    $answer,
                );
            } else {
                $clean[$key] = $answer;
            }
        }

        return $clean;
    }
}
