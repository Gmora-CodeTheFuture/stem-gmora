<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $query = User::with('role')->withCount('enrollments');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->whereLike('full_name', "%{$search}%")
                    ->orWhereLike('email', "%{$search}%");
            });
        }

        if ($role = $request->input('role')) {
            $query->whereHas('role', fn ($q) => $q->where('name', $role));
        }

        $users = $query->latest()->paginate(20)->withQueryString();

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'roles' => Role::all(['id', 'name', 'display_name']),
            'filters' => $request->only(['search', 'role']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'full_name' => ['required', 'string', 'max:255'],
            'role_id' => ['required', 'exists:roles,id'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $role = Role::findOrFail($validated['role_id']);

        $user = User::create([
            'email' => $validated['email'],
            'full_name' => $validated['full_name'],
            'role_id' => $role->id,
            'password' => $validated['password'],
        ]);

        // Admin-created accounts skip the verification email — the invite
        // itself is the proof of delivery.
        $user->forceFill(['email_verified_at' => now()])->save();

        AuditLog::record('user.created', 'user', $user->id, [
            'email' => $user->email,
            'role' => $role->name,
        ], $request->user()->id);

        return Redirect::back()
            ->with('success', "User \"{$user->full_name}\" created.");
    }

    public function show(User $user): Response
    {
        $user->load([
            'role',
            'stat',
            'badges',
            'enrollments.course:id,title,slug',
            'certificates.course:id,title',
            'assignedInstructor:id,full_name,email',
            'assignedStudents:id,full_name,email',
            'courses:id,title,slug,status',
        ]);

        return Inertia::render('Admin/Users/Show', [
            'targetUser' => $user,
            'instructors' => $this->instructors(),
        ]);
    }

    public function edit(Request $request, User $user): Response
    {
        $user->load(['role', 'assignedInstructor:id,full_name']);

        return Inertia::render('Admin/Users/Edit', [
            'targetUser' => $user,
            'roles' => $this->assignableRoles($request),
            'instructors' => $this->instructors(),
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $this->assertMayManage($request, $user);

        $request->merge([
            'assigned_instructor_id' => $request->input('assigned_instructor_id') ?: null,
        ]);

        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'role_id' => ['required', 'exists:roles,id'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'headline' => ['nullable', 'string', 'max:255'],
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

        $previousRole = $user->role;
        $newRole = Role::find($validated['role_id']);
        $roleChanged = $previousRole?->id !== $newRole?->id;

        if ($roleChanged) {
            $this->assertMayAssignRole($request, $newRole, $user);
        }

        // Only students keep a mentor assignment.
        if ($newRole?->name !== Role::STUDENT) {
            $validated['assigned_instructor_id'] = null;
        }

        $previousInstructor = $user->assigned_instructor_id;
        $user->update($validated);

        if ($roleChanged) {
            AuditLog::record('user.role_changed', 'user', $user->id, [
                'from' => $previousRole?->name,
                'to' => $newRole?->name,
            ], $request->user()->id);
        }

        if (($validated['assigned_instructor_id'] ?? null) !== $previousInstructor) {
            AuditLog::record('student.instructor_assigned', 'user', $user->id, [
                'from' => $previousInstructor,
                'to' => $user->assigned_instructor_id,
            ], $request->user()->id);
        }

        return Redirect::route('admin.users.index')
            ->with('success', "User \"{$user->full_name}\" updated successfully.");
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $this->assertMayManage($request, $user);

        if ($user->id === $request->user()->id) {
            return Redirect::back()->with('error', 'You cannot delete your own account from here.');
        }

        // Losing the last admin locks everyone out of the platform.
        if ($user->isAdmin() && $this->adminCount() <= 1) {
            return Redirect::back()->with('error', 'You cannot delete the only remaining admin.');
        }

        $name = $user->full_name;
        $user->delete();

        AuditLog::record('user.deleted', 'user', $user->id, ['full_name' => $name], $request->user()->id);

        return Redirect::route('admin.users.index')
            ->with('success', "User \"{$name}\" has been deleted.");
    }

    public function resetPassword(Request $request, User $user): RedirectResponse
    {
        $this->assertMayManage($request, $user);

        Password::sendResetLink(['email' => $user->email]);

        AuditLog::record('user.password_reset_sent', 'user', $user->id, null, $request->user()->id);

        return Redirect::back()
            ->with('success', "Password reset link sent to {$user->email}.");
    }

    /**
     * With a single admin tier every admin is a peer, so there is no longer a
     * rank to defend — only the platform's ability to still have an admin.
     */
    private function assertMayManage(Request $request, User $target): void
    {
        // Kept as the single place to add per-target rules again if needed.
    }

    /** Nobody may change their own role, or remove the last admin. */
    private function assertMayAssignRole(Request $request, ?Role $role, User $target): void
    {
        if ($target->id === $request->user()->id) {
            abort(403, 'You cannot change your own role.');
        }

        if ($target->isAdmin() && $role?->name !== Role::ADMIN && $this->adminCount() <= 1) {
            abort(403, 'You cannot demote the only remaining admin.');
        }
    }

    /** @return Collection<int, Role> */
    private function assignableRoles(Request $request)
    {
        return Role::query()->get(['id', 'name', 'display_name']);
    }

    private function adminCount(): int
    {
        return User::whereHas('role', fn ($q) => $q->where('name', Role::ADMIN))->count();
    }

    /** @return Collection<int, User> */
    private function instructors()
    {
        return User::query()
            ->whereHas('role', fn ($q) => $q->where('name', Role::INSTRUCTOR))
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'email']);
    }
}
