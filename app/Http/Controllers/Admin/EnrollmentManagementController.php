<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Payment;
use App\Models\User;
use App\Services\CourseCompletion;
use App\Services\DashboardCache;
use App\Services\VideoAccessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class EnrollmentManagementController extends Controller
{
    public function __construct(
        private readonly VideoAccessService $videoAccess,
        private readonly CourseCompletion $completion,
    ) {}

    public function index(Request $request): Response
    {
        $query = Enrollment::with([
            'user:id,full_name,email',
            'course:id,title,slug',
        ]);

        if ($search = $request->input('search')) {
            $query->whereHas('user', fn ($q) => $q->whereLike('full_name', "%{$search}%")
                ->orWhereLike('email', "%{$search}%"));
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $enrollments = $query->latest()->paginate(20)->withQueryString();

        return Inertia::render('Admin/Enrollments/Index', [
            'enrollments' => $enrollments,
            'filters' => $request->only(['search', 'status']),
            // Selects stay short so the grant form stays usable on a phone.
            'users' => User::latest()->take(50)->get(['id', 'full_name', 'email']),
            'courses' => Course::where('status', Course::STATUS_PUBLISHED)
                ->orderBy('title')
                ->get(['id', 'title', 'price', 'currency']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'course_id' => ['required', 'exists:courses,id'],
            'record_payment' => ['sometimes', 'boolean'],
        ]);

        $course = Course::findOrFail($validated['course_id']);

        $existing = Enrollment::withTrashed()
            ->where('user_id', $validated['user_id'])
            ->where('course_id', $validated['course_id'])
            ->first();

        // A lapsed or refunded enrollment is reactivated rather than blocked —
        // the unique (user, course) index makes a second row impossible anyway.
        if ($existing && $existing->status === Enrollment::STATUS_ACTIVE && ! $existing->trashed()) {
            return Redirect::back()->with('error', 'User is already enrolled in this course.');
        }

        $enrollment = $existing ?? new Enrollment([
            'user_id' => $validated['user_id'],
            'course_id' => $validated['course_id'],
        ]);
        $enrollment->deleted_at = null;
        $enrollment->fill([
            'user_id' => $validated['user_id'],
            'course_id' => $validated['course_id'],
            'status' => Enrollment::STATUS_ACTIVE,
            'enrolled_at' => now(),
            'completed_at' => null,
        ])->save();

        $recordPayment = $request->boolean('record_payment', true);

        // Paid grants need a ledger row so reports match dashboard revenue —
        // card checkout is not wired, so this is the commerce seam for now.
        if ($recordPayment && ! $course->isFree()) {
            Payment::create([
                'user_id' => $validated['user_id'],
                'course_id' => $course->id,
                'provider' => Payment::PROVIDER_MANUAL,
                'amount' => $course->price,
                'currency' => $course->currency,
                'status' => Payment::STATUS_COMPLETED,
                'metadata' => ['source' => 'admin_grant', 'enrollment_id' => $enrollment->id],
            ]);
        }

        $this->syncEnrollmentCount($enrollment->course_id);
        DashboardCache::forget($enrollment->user_id);

        AuditLog::record('enrollment.granted', 'enrollment', $enrollment->id, [
            'user_id' => $enrollment->user_id,
            'course_id' => $enrollment->course_id,
            'payment_recorded' => $recordPayment && ! $course->isFree(),
        ], $request->user()->id);

        return Redirect::back()->with('success', 'User enrolled successfully.');
    }

    public function update(Request $request, Enrollment $enrollment): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,completed,refunded,suspended'],
        ]);

        $previous = $enrollment->status;

        if ($validated['status'] === Enrollment::STATUS_COMPLETED) {
            $this->completion->markCompleted($enrollment);
        } else {
            $enrollment->update($validated);
        }

        // Losing access must also kill any live video ticket, exactly as the
        // student-initiated refund path does (Plan §9.1.3).
        $revoked = 0;
        if (in_array($validated['status'], [Enrollment::STATUS_REFUNDED, Enrollment::STATUS_SUSPENDED], true)) {
            $revoked = $this->videoAccess->revokeAllForEnrollment($enrollment->id);
        }

        $this->syncEnrollmentCount($enrollment->course_id);
        DashboardCache::forget($enrollment->user_id);

        AuditLog::record('enrollment.status_changed', 'enrollment', $enrollment->id, [
            'from' => $previous,
            'to' => $validated['status'],
            'tokens_revoked' => $revoked,
        ], $request->user()->id);

        return Redirect::back()
            ->with('success', "Enrollment status changed to \"{$validated['status']}\".");
    }

    /** Keep the denormalised counter honest after any admin change. */
    private function syncEnrollmentCount(string $courseId): void
    {
        Course::whereKey($courseId)->update([
            'total_enrollments' => Enrollment::where('course_id', $courseId)
                ->whereIn('status', [Enrollment::STATUS_ACTIVE, Enrollment::STATUS_COMPLETED])
                ->count(),
        ]);
    }
}
