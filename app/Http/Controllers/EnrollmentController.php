<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Course;
use App\Models\Enrollment;
use App\Services\VideoAccessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EnrollmentController extends Controller
{
    public function __construct(private readonly VideoAccessService $videoAccess) {}

    /**
     * Enroll in a course. Free courses are granted immediately; paid courses
     * are routed to checkout (Stripe/PayHere — Plan §9.1, not yet wired).
     */
    public function store(Request $request, Course $course): RedirectResponse
    {
        abort_unless($course->isPublished(), 404);

        $user = $request->user();

        // Paid enrollment goes through Stripe/PayHere checkout (Plan §9.1),
        // which is not wired yet — this is the seam it will plug into.
        if (! $course->isFree()) {
            return redirect()
                ->route('courses.show', $course->slug)
                ->with('info', 'Checkout for paid courses is not available yet.');
        }

        $enrollment = Enrollment::firstOrNew([
            'user_id' => $user->id,
            'course_id' => $course->id,
        ]);

        if ($enrollment->exists && $enrollment->isActive()) {
            return redirect()->route('learn.show', $course->slug);
        }

        $enrollment->fill([
            'status' => Enrollment::STATUS_ACTIVE,
            'enrolled_at' => now(),
            'completed_at' => null,
        ])->save();

        $course->increment('total_enrollments');

        AuditLog::record('enrollment.created', 'enrollment', $enrollment->id, [
            'course_id' => $course->id,
            'price' => (string) $course->price,
        ], $user->id);

        return redirect()
            ->route('learn.show', $course->slug)
            ->with('success', "You're enrolled in {$course->title}.");
    }

    /**
     * Refund/withdraw — reverses access and, per Plan §9.1.3, immediately
     * invalidates any live video tickets for this enrollment.
     */
    public function destroy(Request $request, Enrollment $enrollment): RedirectResponse
    {
        abort_unless($enrollment->user_id === $request->user()->id, 403);

        $enrollment->update(['status' => Enrollment::STATUS_REFUNDED]);
        $revoked = $this->videoAccess->revokeAllForEnrollment($enrollment->id);

        AuditLog::record('enrollment.revoked', 'enrollment', $enrollment->id, [
            'tokens_revoked' => $revoked,
        ], $request->user()->id);

        return redirect()->route('dashboard.courses')->with('info', 'Course access removed.');
    }
}
