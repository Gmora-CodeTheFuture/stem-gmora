<?php

namespace App\Http\Middleware;

use App\Models\LoginSession;
use App\Services\LoginSessionService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

        $revoked = LoginSession::where('session_id', $sessionId)
            ->whereNotNull('revoked_at')
            ->exists();

        if ($revoked) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')
                ->with('warning', 'This device was signed out from your account settings.');
        }

        // Rows are created at sign-in; here we only keep them fresh. Sessions
        // that predate tracking simply gain a row at their next sign-in.
        $this->sessions->touch($request);

        return $next($request);
    }
}
