<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\LoginSession;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Device/session tracking behind the "active sessions" panel (Plan §4.16).
 *
 * Every sign-in records a row keyed to the Laravel session id, so a student can
 * see where they are signed in and revoke anything they do not recognise —
 * which also kills that device's video tickets.
 */
class LoginSessionService
{
    public function __construct(private readonly VideoAccessService $videoAccess) {}

    public static function cacheKey(string $sessionId): string
    {
        return "login_session:{$sessionId}";
    }

    /** Record (or refresh) the session the request is running in. */
    public function record(Request $request, User $user): LoginSession
    {
        Cache::forget(self::cacheKey($request->session()->getId()));

        return LoginSession::updateOrCreate(
            ['session_id' => $request->session()->getId()],
            [
                'user_id' => $user->id,
                'device_label' => $this->deviceLabel($request->userAgent()),
                'ip_address' => $request->ip(),
                'last_seen_at' => now(),
                'revoked_at' => null,
            ],
        );
    }

    /** Keep `last_seen_at` fresh without writing on every single request. */
    public function touch(Request $request): void
    {
        $sessionId = $request->session()->getId();

        LoginSession::where('session_id', $sessionId)
            ->whereNull('revoked_at')
            ->where(fn ($q) => $q->whereNull('last_seen_at')->orWhere('last_seen_at', '<', now()->subMinutes(5)))
            ->update(['last_seen_at' => now()]);
    }

    /**
     * Revoke one session: mark it revoked, drop the server-side session row so
     * the device is signed out on its next request, and kill its video tickets.
     */
    public function revoke(User $user, LoginSession $session): void
    {
        abort_unless($session->user_id === $user->id, 403);

        $session->update(['revoked_at' => now()]);

        if ($session->session_id) {
            DB::table('sessions')->where('id', $session->session_id)->delete();
            Cache::forget(self::cacheKey($session->session_id));
        }

        $this->videoAccess->revokeAllForUser($user->id);

        AuditLog::record('session.revoked', 'login_session', $session->id, [
            'device_label' => $session->device_label,
        ], $user->id);
    }

    /** Sign out every device except the one making the request. */
    public function revokeOthers(Request $request, User $user): int
    {
        $current = $request->session()->getId();

        $sessions = LoginSession::where('user_id', $user->id)
            ->whereNull('revoked_at')
            ->where('session_id', '!=', $current)
            ->get();

        foreach ($sessions as $session) {
            $this->revoke($user, $session);
        }

        return $sessions->count();
    }

    public function revokeCurrent(Request $request): void
    {
        $sessionId = $request->session()->getId();

        LoginSession::where('session_id', $sessionId)->update(['revoked_at' => now()]);
        Cache::forget(self::cacheKey($sessionId));
    }

    /** A readable label from the user agent — no third-party parser needed. */
    private function deviceLabel(?string $userAgent): string
    {
        if (! $userAgent) {
            return 'Unknown device';
        }

        $browser = match (true) {
            Str::contains($userAgent, 'Edg/') => 'Edge',
            Str::contains($userAgent, 'OPR/') => 'Opera',
            Str::contains($userAgent, 'Chrome/') && ! Str::contains($userAgent, 'Chromium') => 'Chrome',
            Str::contains($userAgent, 'Firefox/') => 'Firefox',
            Str::contains($userAgent, 'Safari/') => 'Safari',
            default => 'Browser',
        };

        $platform = match (true) {
            Str::contains($userAgent, 'iPhone') => 'iPhone',
            Str::contains($userAgent, 'iPad') => 'iPad',
            Str::contains($userAgent, 'Android') => 'Android',
            Str::contains($userAgent, ['Mac OS X', 'Macintosh']) => 'macOS',
            Str::contains($userAgent, 'Windows') => 'Windows',
            Str::contains($userAgent, 'Linux') => 'Linux',
            default => 'Unknown OS',
        };

        return "{$browser} on {$platform}";
    }
}
