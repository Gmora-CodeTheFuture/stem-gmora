<?php

namespace Database\Factories;

use App\Models\Role;
use App\Models\User;
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

    public function role(string $roleName): static
    {
        return $this->state(fn () => ['role_id' => $this->roleId($roleName)]);
    }

    public function instructor(): static
    {
        return $this->role(Role::INSTRUCTOR);
    }

    public function admin(): static
    {
        return $this->role(Role::PLATFORM_ADMIN);
    }

    private function roleId(string $roleName): string
    {
        return Role::firstOrCreate(
            ['name' => $roleName],
            ['display_name' => Str::headline($roleName)],
        )->id;
    }
}
