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

    public function show(User $user): Response
    {
        $user->load(['role', 'stat', 'badges', 'enrollments.course:id,title,slug', 'certificates.course:id,title']);

        return Inertia::render('Admin/Users/Show', [
            'targetUser' => $user,
        ]);
    }

    public function edit(Request $request, User $user): Response
    {
        $user->load('role');

        return Inertia::render('Admin/Users/Edit', [
            'targetUser' => $user,
            'roles' => $this->assignableRoles($request),
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $this->assertMayManage($request, $user);

        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'role_id' => ['required', 'exists:roles,id'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'headline' => ['nullable', 'string', 'max:255'],
        ]);

        $previousRole = $user->role;
        $newRole = Role::find($validated['role_id']);
        $roleChanged = $previousRole?->id !== $newRole?->id;

        if ($roleChanged) {
            $this->assertMayAssignRole($request, $newRole, $user);
        }

        $user->update($validated);

        // Role changes are the highest-value mutation in the system, and are
        // explicitly required to be auditable (Plan §5.5).
        if ($roleChanged) {
            AuditLog::record('user.role_changed', 'user', $user->id, [
                'from' => $previousRole?->name,
                'to' => $newRole?->name,
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

        // Losing the last super admin locks everyone out of the platform.
        if ($user->hasRole(Role::SUPER_ADMIN) && $this->superAdminCount() <= 1) {
            return Redirect::back()->with('error', 'You cannot delete the only remaining super admin.');
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

    /** A platform admin may not act on a super admin; only a super admin can. */
    private function assertMayManage(Request $request, User $target): void
    {
        if ($target->hasRole(Role::SUPER_ADMIN) && ! $request->user()->isSuperAdmin()) {
            abort(403, 'Only a super admin can manage another super admin.');
        }
    }

    /** Nobody may grant a role above their own, or change their own role. */
    private function assertMayAssignRole(Request $request, ?Role $role, User $target): void
    {
        if ($target->id === $request->user()->id) {
            abort(403, 'You cannot change your own role.');
        }

        if ($role?->name === Role::SUPER_ADMIN && ! $request->user()->isSuperAdmin()) {
            abort(403, 'Only a super admin can grant super admin.');
        }

        if ($target->hasRole(Role::SUPER_ADMIN) && $this->superAdminCount() <= 1) {
            abort(403, 'You cannot demote the only remaining super admin.');
        }
    }

    /** @return Collection<int, Role> */
    private function assignableRoles(Request $request)
    {
        return Role::query()
            ->when(
                ! $request->user()->isSuperAdmin(),
                fn ($q) => $q->where('name', '!=', Role::SUPER_ADMIN),
            )
            ->get(['id', 'name', 'display_name']);
    }

    private function superAdminCount(): int
    {
        return User::whereHas('role', fn ($q) => $q->where('name', Role::SUPER_ADMIN))->count();
    }
}
