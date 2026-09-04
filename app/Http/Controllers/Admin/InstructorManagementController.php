<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin console for creating instructors and reviewing who they mentor.
 */
class InstructorManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $instructors = User::query()
            ->whereHas('role', fn ($q) => $q->where('name', Role::INSTRUCTOR))
            ->withCount(['courses', 'assignedStudents'])
            ->when($request->input('search'), function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->whereLike('full_name', "%{$search}%")
                        ->orWhereLike('email', "%{$search}%");
                });
            })
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Admin/Instructors/Index', [
            'instructors' => $instructors,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'full_name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
            'headline' => ['nullable', 'string', 'max:255'],
        ]);

        $role = Role::where('name', Role::INSTRUCTOR)->firstOrFail();

        $user = User::create([
            'email' => $validated['email'],
            'full_name' => $validated['full_name'],
            'password' => $validated['password'],
            'headline' => $validated['headline'] ?? null,
            'role_id' => $role->id,
        ]);

        $user->forceFill(['email_verified_at' => now()])->save();

        AuditLog::record('instructor.created', 'user', $user->id, [
            'email' => $user->email,
        ], $request->user()->id);

        return Redirect::back()
            ->with('success', "Instructor \"{$user->full_name}\" created.");
    }

    /**
     * Assign or clear the mentor for a student.
     */
    public function assignStudent(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->isStudent(), 422, 'Only students can be assigned to an instructor.');

        $request->merge([
            'assigned_instructor_id' => $request->input('assigned_instructor_id') ?: null,
        ]);

        $validated = $request->validate([
            'assigned_instructor_id' => [
                'nullable',
                'uuid',
                Rule::exists('users', 'id')->where(function ($query) {
                    $query->whereExists(function ($inner) {
                        $inner->selectRaw('1')
                            ->from('roles')
                            ->whereColumn('roles.id', 'users.role_id')
                            ->where('roles.name', Role::INSTRUCTOR);
                    });
                }),
            ],
        ]);

        $previous = $user->assigned_instructor_id;
        $user->update([
            'assigned_instructor_id' => $validated['assigned_instructor_id'] ?? null,
        ]);

        AuditLog::record('student.instructor_assigned', 'user', $user->id, [
            'from' => $previous,
            'to' => $user->assigned_instructor_id,
        ], $request->user()->id);

        return Redirect::back()->with('success', 'Instructor assignment updated.');
    }
}
