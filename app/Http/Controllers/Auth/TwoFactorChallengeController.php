<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The second step of login for accounts holding 2FA.
 *
 * Between the password check and this challenge the user is *not* authenticated
 * — only their id sits in the session, so a stolen password alone grants
 * nothing.
 */
class TwoFactorChallengeController extends Controller
{
    public const SESSION_USER = 'two_factor:user_id';

    public const SESSION_REMEMBER = 'two_factor:remember';

    public function __construct(private readonly TwoFactorService $twoFactor) {}

    public function create(Request $request): Response|RedirectResponse
    {
        if (! $request->session()->has(self::SESSION_USER)) {
            return redirect()->route('login');
        }

        return Inertia::render('Auth/TwoFactorChallenge');
    }

    public function store(Request $request): RedirectResponse
    {
        $userId = $request->session()->get(self::SESSION_USER);

        if (! $userId) {
            return redirect()->route('login');
        }

        $request->validate([
            'code' => ['nullable', 'string'],
            'recovery_code' => ['nullable', 'string'],
        ]);

        $user = User::findOrFail($userId);
        $throttleKey = 'two-factor:'.$user->id;

        // Brute-forcing a six-digit code is cheap without a limit.
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            throw ValidationException::withMessages([
                'code' => 'Too many attempts. Try again in '.RateLimiter::availableIn($throttleKey).' seconds.',
            ]);
        }

        $code = $request->string('code')->toString();
        $recovery = $request->string('recovery_code')->toString();

        $passed = match (true) {
            filled($recovery) => $this->twoFactor->consumeRecoveryCode($user, $recovery),
            filled($code) => $this->twoFactor->verify($user->two_factor_secret ?? '', $code),
            default => false,
        };

        if (! $passed) {
            RateLimiter::hit($throttleKey, 300);

            AuditLog::record('auth.two_factor_failed', 'user', $user->id, null, $user->id);

            throw ValidationException::withMessages([
                'code' => 'That code is not valid.',
            ]);
        }

        RateLimiter::clear($throttleKey);

        $remember = (bool) $request->session()->pull(self::SESSION_REMEMBER, false);
        $request->session()->forget(self::SESSION_USER);

        Auth::login($user, $remember);
        $request->session()->regenerate();

        AuditLog::record(
            filled($recovery) ? 'auth.two_factor_recovery_used' : 'auth.two_factor_passed',
            'user',
            $user->id,
            null,
            $user->id,
        );

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
