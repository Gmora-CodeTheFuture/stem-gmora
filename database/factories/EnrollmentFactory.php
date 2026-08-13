<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Enrollment>
 */
class EnrollmentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'course_id' => Course::factory(),
            'status' => Enrollment::STATUS_ACTIVE,
            'enrolled_at' => now(),
        ];
    }

    public function refunded(): static
    {
        return $this->state(fn () => ['status' => Enrollment::STATUS_REFUNDED]);
    }
}
