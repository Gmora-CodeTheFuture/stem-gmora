<?php

namespace App\Http\Middleware;

use App\Models\LoginSession;
use App\Services\LoginSessionService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Keeps the active-sessions panel honest: refreshes `last_seen_at`, and signs
 * out any request whose session row has been revoked from another device.
 */
class TrackLoginSession
{
    public function __construct(private readonly LoginSessionService $sessions) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $request->hasSession()) {
            return $next($request);
        }

        $sessionId = $request->session()->getId();

        // Cached so a normal request costs no round trip; LoginSessionService
        // drops the key the moment a device is revoked, so sign-out is still
        // immediate rather than eventually-consistent.
        $session = Cache::remember(
            LoginSessionService::cacheKey($sessionId),
            now()->addMinutes(10),
            function () use ($sessionId) {
                $row = LoginSession::where('session_id', $sessionId)->first();

                return $row ? [
                    'id' => $row->id,
                    'revoked' => $row->revoked_at !== null,
                    'last_seen_at' => $row->last_seen_at?->toIso8601String(),
                ] : null;
            },
        );

        if ($session && $session['revoked']) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')
                ->with('warning', 'This device was signed out from your account settings.');
        }

        // Rows are created at sign-in; here we only keep them fresh, and only
        // when the timestamp has actually aged.
        $lastSeen = $session['last_seen_at'] ?? null;

        if ($session && (! $lastSeen || Carbon::parse($lastSeen)->lt(now()->subMinutes(5)))) {
            LoginSession::whereKey($session['id'])->update(['last_seen_at' => now()]);
            Cache::forget(LoginSessionService::cacheKey($sessionId));
        }

        return $next($request);
    }
}
