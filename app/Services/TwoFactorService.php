<?php

namespace App\Services;

use App\Models\User;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

/**
 * TOTP two-factor authentication (Plan §7.1).
 *
 * The shared secret and the recovery codes are encrypted at rest through the
 * model's casts, and both are in the User model's `$hidden` array so they can
 * never be serialised into a page prop.
 */
class TwoFactorService
{
    public const RECOVERY_CODE_COUNT = 8;

    public function __construct(private readonly Google2FA $google2fa) {}

    /** A fresh base32 secret, not yet committed to the account. */
    public function generateSecret(): string
    {
        return $this->google2fa->generateSecretKey();
    }

    /** The otpauth:// URI an authenticator app scans. */
    public function provisioningUri(User $user, string $secret): string
    {
        return $this->google2fa->getQRCodeUrl(
            config('app.name', 'Gmora STEM'),
            $user->email,
            $secret,
        );
    }

    /**
     * Inline SVG QR code as a data URI, so the setup screen needs no external
     * image service and nothing leaves the server.
     */
    public function qrCodeDataUri(User $user, string $secret): string
    {
        $writer = new Writer(new ImageRenderer(new RendererStyle(220, 0), new SvgImageBackEnd));
        $svg = $writer->writeString($this->provisioningUri($user, $secret));

        return 'data:image/svg+xml;base64,'.base64_encode($svg);
    }

    public function verify(string $secret, string $code): bool
    {
        // One window of tolerance covers clock drift between phone and server.
        return (bool) $this->google2fa->verifyKey($secret, preg_replace('/\D/', '', $code) ?? '', 1);
    }

    /** @return array<int, string> */
    public function generateRecoveryCodes(): array
    {
        return collect(range(1, self::RECOVERY_CODE_COUNT))
            ->map(fn () => Str::upper(Str::random(5).'-'.Str::random(5)))
            ->all();
    }

    /**
     * Spend a recovery code. Each one works exactly once.
     */
    public function consumeRecoveryCode(User $user, string $code): bool
    {
        $codes = $user->two_factor_recovery_codes ?? [];
        $needle = Str::upper(trim($code));

        $index = array_search($needle, array_map('strtoupper', $codes), true);

        if ($index === false) {
            return false;
        }

        unset($codes[$index]);
        $user->forceFill(['two_factor_recovery_codes' => array_values($codes)])->save();

        return true;
    }

    /** Turn 2FA on once the user has proved they can generate a code. */
    public function enable(User $user, string $secret): array
    {
        $recoveryCodes = $this->generateRecoveryCodes();

        $user->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_recovery_codes' => $recoveryCodes,
            'two_factor_enabled' => true,
        ])->save();

        return $recoveryCodes;
    }

    public function disable(User $user): void
    {
        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_enabled' => false,
        ])->save();
    }
}
