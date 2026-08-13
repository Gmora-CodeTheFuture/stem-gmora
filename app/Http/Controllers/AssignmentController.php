<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\AuditLog;
use App\Models\Enrollment;
use App\Models\Submission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Student-side assignments (Plan §4.5). Uploads are validated by type and
 * size and stored on the private disk; links are stored as URLs.
 */
class AssignmentController extends Controller
{
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
                ...$assignment->only(['id', 'title', 'description', 'deadline_at', 'max_marks']),
                'course' => $assignment->course?->only(['id', 'title', 'slug']),
                'submission' => $assignment->submissions->first()?->only([
                    'id', 'type', 'file_url', 'repo_url', 'link_url', 'notes',
                    'status', 'marks_awarded', 'feedback', 'graded_at', 'created_at',
                ]),
                'is_overdue' => $assignment->deadline_at?->isPast() ?? false,
            ])->values(),
        ]);
    }

    public function show(Request $request, Assignment $assignment): Response
    {
        abort_unless($assignment->is_published, 404);

        $submission = Submission::where('assignment_id', $assignment->id)
            ->where('user_id', $request->user()->id)
            ->first();

        return Inertia::render('Dashboard/AssignmentDetail', [
            'assignment' => [
                ...$assignment->only(['id', 'title', 'description', 'deadline_at', 'max_marks', 'rubric']),
                'course' => $assignment->course?->only(['id', 'title', 'slug']),
                'is_overdue' => $assignment->deadline_at?->isPast() ?? false,
            ],
            'submission' => $submission?->only([
                'id', 'type', 'file_url', 'repo_url', 'link_url', 'notes',
                'status', 'marks_awarded', 'feedback', 'graded_at', 'created_at',
            ]),
        ]);
    }

    /**
     * Submit or resubmit. A graded submission is locked — a student cannot
     * overwrite work an instructor has already marked.
     */
    public function store(Request $request, Assignment $assignment): RedirectResponse
    {
        abort_unless($assignment->is_published, 404);

        $validated = $request->validate([
            'type' => ['required', 'in:file,repo,link'],
            'file' => ['required_if:type,file', 'file', 'max:20480', 'mimes:pdf,zip,png,jpg,jpeg,doc,docx,ipynb'],
            'repo_url' => ['required_if:type,repo', 'nullable', 'url', 'max:255'],
            'link_url' => ['required_if:type,link', 'nullable', 'url', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
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
            'repo_url' => $validated['repo_url'] ?? null,
            'link_url' => $validated['link_url'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending',
            'marks_awarded' => null,
            'feedback' => null,
            'graded_at' => null,
            'graded_by' => null,
        ])->save();

        AuditLog::record('submission.created', 'submission', $submission->id, [
            'assignment_id' => $assignment->id,
            'late' => $assignment->deadline_at?->isPast() ?? false,
        ], $request->user()->id);

        return back()->with('success', 'Submission received.');
    }
}
