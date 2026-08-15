<?php

namespace Database\Factories;

use App\Models\Role;
use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'full_name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'role_id' => fn () => $this->roleId(Role::STUDENT),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * Admins are required to hold 2FA, so factory-made staff satisfy
     * that by default — otherwise every staff test would be bounced to setup.
     * Use withoutTwoFactor() to build staff that still need to enrol.
     */
    public function role(string $roleName): static
    {
        $factory = $this->state(fn () => ['role_id' => $this->roleId($roleName)]);

        return $roleName === Role::ADMIN ? $factory->withTwoFactor() : $factory;
    }

    public function withTwoFactor(): static
    {
        return $this->state(fn () => [
            'two_factor_enabled' => true,
            'two_factor_secret' => app(TwoFactorService::class)->generateSecret(),
            'two_factor_recovery_codes' => app(TwoFactorService::class)->generateRecoveryCodes(),
        ]);
    }

    public function withoutTwoFactor(): static
    {
        return $this->state(fn () => [
            'two_factor_enabled' => false,
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
        ]);
    }

    public function admin(): static
    {
        return $this->role(Role::ADMIN);
    }

    private function roleId(string $roleName): string
    {
        return Role::firstOrCreate(
            ['name' => $roleName],
            ['display_name' => Str::headline($roleName)],
        )->id;
    }
}
