<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Course>
 */
class CourseFactory extends Factory
{
    public function definition(): array
    {
        $title = fake()->unique()->sentence(3);

        return [
            'instructor_id' => User::factory()->instructor(),
            'title' => $title,
            'slug' => Str::slug($title).'-'.Str::lower(Str::random(5)),
            'subtitle' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'category' => fake()->randomElement(['Artificial Intelligence', 'Robotics', 'Programming']),
            'difficulty' => 'beginner',
            'language' => 'en',
            'price' => 0,
            'currency' => 'USD',
            'status' => Course::STATUS_PUBLISHED,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn () => ['status' => Course::STATUS_DRAFT]);
    }

    public function paid(float $price = 49.00): static
    {
        return $this->state(fn () => ['price' => $price]);
    }
}
