<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorTest extends TestCase
{
    use RefreshDatabase;

    private function codeFor(string $secret): string
    {
        return app(Google2FA::class)->getCurrentOtp($secret);
    }

    public function test_a_user_can_enrol_in_two_factor(): void
    {
        $user = User::factory()->create();

        $secret = $this->actingAs($user)
            ->get(route('two-factor.setup'))
            ->assertOk()
            ->viewData('page')['props']['secret'];

        $this->actingAs($user)
            ->post(route('two-factor.enable'), ['code' => $this->codeFor($secret)])
            ->assertSessionHasNoErrors();

        $user->refresh();

        $this->assertTrue($user->two_factor_enabled);
        $this->assertSame($secret, $user->two_factor_secret);
        $this->assertCount(TwoFactorService::RECOVERY_CODE_COUNT, $user->two_factor_recovery_codes);
    }

    public function test_a_wrong_code_does_not_enable_two_factor(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('two-factor.setup'));

        $this->actingAs($user)
            ->post(route('two-factor.enable'), ['code' => '000000'])
            ->assertSessionHasErrors('code');

        $this->assertFalse($user->refresh()->two_factor_enabled);
    }

    public function test_the_secret_is_encrypted_at_rest_and_never_serialised(): void
    {
        $user = User::factory()->create();
        $secret = app(TwoFactorService::class)->generateSecret();
        app(TwoFactorService::class)->enable($user, $secret);

        $raw = \DB::table('users')->where('id', $user->id)->value('two_factor_secret');

        $this->assertNotSame($secret, $raw, 'The TOTP secret must not be stored in plain text.');
        $this->assertArrayNotHasKey('two_factor_secret', $user->fresh()->toArray());
        $this->assertArrayNotHasKey('two_factor_recovery_codes', $user->fresh()->toArray());
    }

    public function test_login_stops_at_the_challenge_when_two_factor_is_on(): void
    {
        $user = User::factory()->create();
        $secret = app(TwoFactorService::class)->generateSecret();
        app(TwoFactorService::class)->enable($user, $secret);

        $this->post(route('login'), ['email' => $user->email, 'password' => 'password'])
            ->assertRedirect(route('two-factor.challenge'));

        // The password alone must not sign anyone in.
        $this->assertGuest();

        $this->post(route('two-factor.verify'), ['code' => $this->codeFor($secret)])
            ->assertRedirect(route('dashboard'));

        $this->assertAuthenticatedAs($user);
    }

    public function test_a_recovery_code_works_once(): void
    {
        $user = User::factory()->create();
        $secret = app(TwoFactorService::class)->generateSecret();
        $codes = app(TwoFactorService::class)->enable($user, $secret);

        $this->post(route('login'), ['email' => $user->email, 'password' => 'password']);
        $this->post(route('two-factor.verify'), ['recovery_code' => $codes[0]])
            ->assertRedirect(route('dashboard'));

        $this->assertAuthenticatedAs($user);
        $this->assertCount(TwoFactorService::RECOVERY_CODE_COUNT - 1, $user->fresh()->two_factor_recovery_codes);

        // The spent code is dead.
        $this->post(route('logout'));
        $this->post(route('login'), ['email' => $user->email, 'password' => 'password']);
        $this->post(route('two-factor.verify'), ['recovery_code' => $codes[0]])
            ->assertSessionHasErrors('code');

        $this->assertGuest();
    }

    public function test_the_challenge_is_rate_limited(): void
    {
        $user = User::factory()->create();
        app(TwoFactorService::class)->enable($user, app(TwoFactorService::class)->generateSecret());

        $this->post(route('login'), ['email' => $user->email, 'password' => 'password']);

        foreach (range(1, 5) as $attempt) {
            $this->post(route('two-factor.verify'), ['code' => '000000'])->assertSessionHasErrors('code');
        }

        $this->post(route('two-factor.verify'), ['code' => '000000'])
            ->assertSessionHasErrorsIn('default', ['code']);

        $this->assertGuest();
    }

    public function test_staff_are_pushed_to_set_up_two_factor(): void
    {
        $instructor = User::factory()->instructor()->withoutTwoFactor()->create();

        $this->actingAs($instructor)
            ->get(route('tutor.dashboard'))
            ->assertRedirect(route('two-factor.setup'));

        // They can still reach the setup screen and their own settings.
        $this->actingAs($instructor)->get(route('two-factor.setup'))->assertOk();
        $this->actingAs($instructor)->get(route('profile.security'))->assertOk();
    }

    public function test_students_are_not_forced_into_two_factor(): void
    {
        $this->actingAs(User::factory()->create())->get(route('dashboard'))->assertOk();
    }

    public function test_staff_cannot_disable_required_two_factor(): void
    {
        $instructor = User::factory()->instructor()->create();

        $this->actingAs($instructor)
            ->delete(route('two-factor.disable'), ['password' => 'password'])
            ->assertSessionHas('error');

        $this->assertTrue($instructor->refresh()->two_factor_enabled);
    }

    public function test_a_student_can_disable_two_factor_with_their_password(): void
    {
        $user = User::factory()->create();
        app(TwoFactorService::class)->enable($user, app(TwoFactorService::class)->generateSecret());

        $this->actingAs($user)
            ->delete(route('two-factor.disable'), ['password' => 'password'])
            ->assertSessionHasNoErrors();

        $this->assertFalse($user->refresh()->two_factor_enabled);
    }
}
