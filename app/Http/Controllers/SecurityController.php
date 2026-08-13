<?php

namespace App\Http\Controllers;

use App\Models\LoginSession;
use App\Services\LoginSessionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The account security screen: two-factor status and the list of devices the
 * account is signed in on, each revocable (Plan §4.16).
 */
class SecurityController extends Controller
{
    public function __construct(private readonly LoginSessionService $sessions) {}

    public function show(Request $request): Response
    {
        $user = $request->user();
        $currentSessionId = $request->session()->getId();

        $sessions = LoginSession::where('user_id', $user->id)
            ->whereNull('revoked_at')
            ->orderByDesc('last_seen_at')
            ->get()
            ->map(fn (LoginSession $session) => [
                'id' => $session->id,
                'device_label' => $session->device_label,
                'ip_address' => $session->ip_address,
                'location' => $session->location,
                'last_seen_at' => $session->last_seen_at?->toIso8601String(),
                'created_at' => $session->created_at->toIso8601String(),
                'is_current' => $session->session_id === $currentSessionId,
            ]);

        return Inertia::render('Profile/Security', [
            'sessions' => $sessions,
            'twoFactor' => [
                'enabled' => (bool) $user->two_factor_enabled,
                'required' => $user->requiresTwoFactor(),
                'recovery_codes_remaining' => count($user->two_factor_recovery_codes ?? []),
            ],
        ]);
    }

    public function destroySession(Request $request, LoginSession $session): RedirectResponse
    {
        $this->sessions->revoke($request->user(), $session);

        return back()->with('success', 'That device has been signed out.');
    }

    public function destroyOtherSessions(Request $request): RedirectResponse
    {
        $request->validate(['password' => ['required', 'current_password']]);

        $count = $this->sessions->revokeOthers($request, $request->user());

        return back()->with('success', $count === 0
            ? 'No other devices were signed in.'
            : "Signed out of {$count} other device".($count === 1 ? '.' : 's.'));
    }
}
