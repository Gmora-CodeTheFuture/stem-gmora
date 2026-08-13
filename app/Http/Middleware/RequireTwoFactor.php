<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Privileged roles must hold 2FA before they can use their privileges
 * (Plan §7.1). Staff without it are funnelled to the setup screen rather than
 * being locked out — they can still reach security settings and sign out.
 */
class RequireTwoFactor
{
    /** Routes a staff member may still reach while enrolling. */
    private const ALLOWED = [
        'two-factor.setup',
        'two-factor.enable',
        'two-factor.challenge',
        'two-factor.verify',
        'profile.security',
        'profile.edit',
        'logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->requiresTwoFactor() || $user->two_factor_enabled) {
            return $next($request);
        }

        if (in_array($request->route()?->getName(), self::ALLOWED, true)) {
            return $next($request);
        }

        return redirect()->route('two-factor.setup')
            ->with('warning', 'Two-factor authentication is required for your role. Set it up to continue.');
    }
}
