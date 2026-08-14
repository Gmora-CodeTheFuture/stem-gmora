<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Course;
use App\Notifications\CourseReviewed;
use App\Services\CourseContentService;
use App\Services\CourseReadiness;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The review queue (Plan §8.9): courses instructors have submitted, each with
 * the checklist a reviewer needs before letting it into the public catalog.
 */
class CourseApprovalController extends Controller
{
    public function __construct(
        private readonly CourseReadiness $readiness,
        private readonly CourseContentService $content,
    ) {}

    public function index(Request $request): Response
    {
        $pending = Course::where('status', Course::STATUS_PENDING_REVIEW)
            ->with(['instructor:id,full_name,email', 'modules.lessons'])
            ->orderBy('submitted_for_review_at')
            ->get()
            ->map(fn (Course $course) => [
                'id' => $course->id,
                'title' => $course->title,
                'slug' => $course->slug,
                'subtitle' => $course->subtitle,
                'category' => $course->category,
                'difficulty' => $course->difficulty,
                'price' => $course->price,
                'currency' => $course->currency,
                'total_lessons' => $course->total_lessons,
                'submitted_at' => $course->submitted_for_review_at?->toIso8601String(),
                'instructor' => $course->instructor?->only(['id', 'full_name', 'email']),
                'readiness' => $this->readiness->for($course),
            ])
            ->values()
            ->all();

        return Inertia::render('Admin/Courses/Approvals', [
            'pending' => $pending,
            'counts' => [
                'pending' => count($pending),
                'published' => Course::where('status', Course::STATUS_PUBLISHED)->count(),
                'draft' => Course::where('status', Course::STATUS_DRAFT)->count(),
            ],
            'recentlyReviewed' => Course::whereNotNull('reviewed_at')
                ->with(['instructor:id,full_name', 'reviewer:id,full_name'])
                ->latest('reviewed_at')
                ->take(8)
                ->get()
                ->map(fn (Course $course) => [
                    'id' => $course->id,
                    'title' => $course->title,
                    'status' => $course->status,
                    'reviewed_at' => $course->reviewed_at?->toIso8601String(),
                    'reviewer' => $course->reviewer?->full_name,
                    'instructor' => $course->instructor?->full_name,
                ])
                ->all(),
        ]);
    }

    /** Approve and publish. */
    public function approve(Request $request, Course $course): RedirectResponse
    {
        abort_unless($course->status === Course::STATUS_PENDING_REVIEW, 409, 'This course is not awaiting review.');

        $readiness = $this->readiness->for($course);

        if ($readiness['blocking'] > 0) {
            return back()->with('error', 'Resolve the failing checks before publishing this course.');
        }

        $course->update([
            'status' => Course::STATUS_PUBLISHED,
            'review_notes' => null,
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
        ]);

        $this->content->syncCounters($course);

        AuditLog::record('course.approved', 'course', $course->id, [
            'title' => $course->title,
        ], $request->user()->id);

        $course->instructor?->notify(new CourseReviewed($course, approved: true));

        return back()->with('success', "\"{$course->title}\" is now published.");
    }

    /** Send it back with a reason. */
    public function reject(Request $request, Course $course): RedirectResponse
    {
        abort_unless($course->status === Course::STATUS_PENDING_REVIEW, 409, 'This course is not awaiting review.');

        $validated = $request->validate([
            'review_notes' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $course->update([
            'status' => Course::STATUS_DRAFT,
            'review_notes' => $validated['review_notes'],
            'reviewed_at' => now(),
            'reviewed_by' => $request->user()->id,
        ]);

        AuditLog::record('course.changes_requested', 'course', $course->id, [
            'notes' => $validated['review_notes'],
        ], $request->user()->id);

        $course->instructor?->notify(new CourseReviewed($course, approved: false));

        return back()->with('info', "Sent back to {$course->instructor?->full_name} with your notes.");
    }
}
