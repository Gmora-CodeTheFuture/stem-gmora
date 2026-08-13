<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Services\TwoFactorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Enrolling an account in TOTP two-factor authentication.
 *
 * The secret is held in the session while the user scans it, and is only
 * written to the account once they prove they can generate a valid code — so a
 * half-finished setup can never lock anyone out.
 */
class TwoFactorSetupController extends Controller
{
    private const SESSION_SECRET = 'two_factor:pending_secret';

    public function __construct(private readonly TwoFactorService $twoFactor) {}

    /** The setup screen: QR code plus the secret for manual entry. */
    public function show(Request $request): Response
    {
        $user = $request->user();

        if ($user->two_factor_enabled) {
            return Inertia::render('Auth/TwoFactorSetup', [
                'enabled' => true,
                'required' => $user->requiresTwoFactor(),
                'recoveryCodesRemaining' => count($user->two_factor_recovery_codes ?? []),
            ]);
        }

        $secret = $request->session()->get(self::SESSION_SECRET) ?: $this->twoFactor->generateSecret();
        $request->session()->put(self::SESSION_SECRET, $secret);

        return Inertia::render('Auth/TwoFactorSetup', [
            'enabled' => false,
            'required' => $user->requiresTwoFactor(),
            'secret' => $secret,
            'qrCode' => $this->twoFactor->qrCodeDataUri($user, $secret),
        ]);
    }

    /** Confirm the first code and switch 2FA on. */
    public function store(Request $request): RedirectResponse
    {
        $request->validate(['code' => ['required', 'string']]);

        $user = $request->user();
        $secret = $request->session()->get(self::SESSION_SECRET);

        if (! $secret) {
            return back()->with('error', 'Your setup session expired. Scan the code again.');
        }

        if (! $this->twoFactor->verify($secret, $request->string('code')->toString())) {
            throw ValidationException::withMessages([
                'code' => 'That code is not valid. Check your authenticator app and try again.',
            ]);
        }

        $recoveryCodes = $this->twoFactor->enable($user, $secret);
        $request->session()->forget(self::SESSION_SECRET);

        AuditLog::record('user.two_factor_enabled', 'user', $user->id, null, $user->id);

        return back()->with('recoveryCodes', $recoveryCodes)
            ->with('success', 'Two-factor authentication is on. Save your recovery codes.');
    }

    /** Turn 2FA off. Requires the current password. */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate(['password' => ['required', 'current_password']]);

        $user = $request->user();

        if ($user->requiresTwoFactor()) {
            return back()->with('error', 'Two-factor authentication is required for your role.');
        }

        $this->twoFactor->disable($user);

        AuditLog::record('user.two_factor_disabled', 'user', $user->id, null, $user->id);

        return back()->with('success', 'Two-factor authentication is off.');
    }

    /** Issue a fresh set of recovery codes, invalidating the old ones. */
    public function regenerateRecoveryCodes(Request $request): RedirectResponse
    {
        $request->validate(['password' => ['required', 'current_password']]);

        $user = $request->user();
        abort_unless($user->two_factor_enabled, 400);

        $codes = $this->twoFactor->generateRecoveryCodes();
        $user->forceFill(['two_factor_recovery_codes' => $codes])->save();

        AuditLog::record('user.two_factor_recovery_regenerated', 'user', $user->id, null, $user->id);

        return back()->with('recoveryCodes', $codes)
            ->with('success', 'New recovery codes generated. The old ones no longer work.');
    }
}
