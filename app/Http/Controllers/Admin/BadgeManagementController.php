<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Badge;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class BadgeManagementController extends Controller
{
    public function index(): Response
    {
        $badges = Badge::withCount('users')->latest()->get();

        return Inertia::render('Admin/Badges/Index', [
            'badges' => $badges,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:500'],
            'type' => ['required', 'string', 'max:100'],
            'icon_url' => ['nullable', 'string'],
            'criteria' => ['nullable', 'array'],
        ]);

        Badge::create($validated);

        return Redirect::back()->with('success', "Badge \"{$validated['name']}\" created.");
    }

    public function update(Request $request, Badge $badge): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:500'],
            'type' => ['required', 'string', 'max:100'],
            'icon_url' => ['nullable', 'string'],
            'criteria' => ['nullable', 'array'],
        ]);

        $badge->update($validated);

        return Redirect::back()->with('success', "Badge \"{$badge->name}\" updated.");
    }

    public function destroy(Badge $badge): RedirectResponse
    {
        $name = $badge->name;
        $badge->delete();

        return Redirect::back()->with('success', "Badge \"{$name}\" deleted.");
    }
}
