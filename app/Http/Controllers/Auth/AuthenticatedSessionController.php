<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\LoginSessionService;
use App\Services\VideoAccessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request, LoginSessionService $sessions): RedirectResponse
    {
        $request->authenticate();

        $user = $request->user();

        // Accounts holding 2FA are not signed in yet: the password step only
        // earns them the challenge (Plan §7.1).
        if ($user->two_factor_enabled) {
            Auth::guard('web')->logout();

            $request->session()->put(TwoFactorChallengeController::SESSION_USER, $user->id);
            $request->session()->put(TwoFactorChallengeController::SESSION_REMEMBER, $request->boolean('remember'));

            return redirect()->route('two-factor.challenge');
        }

        $request->session()->regenerate();

        $sessions->record($request, $user);

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(
        Request $request,
        VideoAccessService $videoAccess,
        LoginSessionService $sessions,
    ): RedirectResponse {
        // [v2] Logging out kills any live video tickets, so a shared or stolen
        // session cannot keep streaming after sign-out (Plan §8.4).
        if ($user = $request->user()) {
            $videoAccess->revokeAllForUser($user->id);
            $sessions->revokeCurrent($request);
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
