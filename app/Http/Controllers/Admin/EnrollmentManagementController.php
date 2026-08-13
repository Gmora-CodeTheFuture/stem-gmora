<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class EnrollmentManagementController extends Controller
{
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

        $existing = Enrollment::where('user_id', $validated['user_id'])
            ->where('course_id', $validated['course_id'])
            ->first();

        if ($existing) {
            return Redirect::back()->with('error', 'User is already enrolled in this course.');
        }

        Enrollment::create([
            ...$validated,
            'status' => 'active',
            'enrolled_at' => now(),
        ]);

        return Redirect::back()->with('success', 'User enrolled successfully.');
    }

    public function update(Request $request, Enrollment $enrollment): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,completed,refunded,suspended'],
        ]);

        $enrollment->update($validated);

        return Redirect::back()
            ->with('success', "Enrollment status changed to \"{$validated['status']}\".");
    }
}
