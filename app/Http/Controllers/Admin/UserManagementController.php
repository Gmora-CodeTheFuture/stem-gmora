<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($role = $request->input('role')) {
            $query->whereHas('role', fn ($q) => $q->where('name', $role));
        }

        $users = $query->latest()->paginate(20)->withQueryString();
        $roles = Role::all(['id', 'name', 'display_name']);

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'roles' => $roles,
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

    public function edit(User $user): Response
    {
        $user->load('role');
        $roles = Role::all(['id', 'name', 'display_name']);

        return Inertia::render('Admin/Users/Edit', [
            'targetUser' => $user,
            'roles' => $roles,
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'role_id' => ['required', 'exists:roles,id'],
            'bio' => ['nullable', 'string', 'max:1000'],
            'headline' => ['nullable', 'string', 'max:255'],
        ]);

        $user->update($validated);

        return Redirect::route('admin.users.index')
            ->with('success', "User \"{$user->full_name}\" updated successfully.");
    }

    public function destroy(User $user): RedirectResponse
    {
        $name = $user->full_name;
        $user->delete();

        return Redirect::route('admin.users.index')
            ->with('success', "User \"{$name}\" has been deleted.");
    }

    public function resetPassword(User $user): RedirectResponse
    {
        Password::sendResetLink(['email' => $user->email]);

        return Redirect::back()
            ->with('success', "Password reset link sent to {$user->email}.");
    }
}
