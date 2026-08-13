<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\Enrollment;
use App\Services\VideoAccessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class EnrollmentManagementController extends Controller
{
    public function __construct(private readonly VideoAccessService $videoAccess) {}

    public function index(Request $request): Response
    {
        $query = Enrollment::with([
            'user:id,full_name,email',
            'course:id,title,slug',
        ]);

        if ($search = $request->input('search')) {
            $query->whereHas('user', fn ($q) => $q->where('full_name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%"));
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $enrollments = $query->latest()->paginate(20)->withQueryString();

        return Inertia::render('Admin/Enrollments/Index', [
            'enrollments' => $enrollments,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'course_id' => ['required', 'exists:courses,id'],
        ]);

        $existing = Enrollment::withTrashed()
            ->where('user_id', $validated['user_id'])
            ->where('course_id', $validated['course_id'])
            ->first();

        // A lapsed or refunded enrollment is reactivated rather than blocked —
        // the unique (user, course) index makes a second row impossible anyway.
        if ($existing && $existing->status === Enrollment::STATUS_ACTIVE && ! $existing->trashed()) {
            return Redirect::back()->with('error', 'User is already enrolled in this course.');
        }

        $enrollment = $existing ?? new Enrollment($validated);
        $enrollment->deleted_at = null;
        $enrollment->fill([
            ...$validated,
            'status' => Enrollment::STATUS_ACTIVE,
            'enrolled_at' => now(),
            'completed_at' => null,
        ])->save();

        $this->syncEnrollmentCount($enrollment->course_id);

        AuditLog::record('enrollment.granted', 'enrollment', $enrollment->id, [
            'user_id' => $enrollment->user_id,
            'course_id' => $enrollment->course_id,
        ], $request->user()->id);

        return Redirect::back()->with('success', 'User enrolled successfully.');
    }

    public function update(Request $request, Enrollment $enrollment): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,completed,refunded,suspended'],
        ]);

        $previous = $enrollment->status;
        $enrollment->update($validated);

        // Losing access must also kill any live video ticket, exactly as the
        // student-initiated refund path does (Plan §9.1.3).
        $revoked = 0;
        if (in_array($validated['status'], [Enrollment::STATUS_REFUNDED, Enrollment::STATUS_SUSPENDED], true)) {
            $revoked = $this->videoAccess->revokeAllForEnrollment($enrollment->id);
        }

        $this->syncEnrollmentCount($enrollment->course_id);

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
