<?php

namespace Database\Factories;

use App\Models\Lesson;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Lesson>
 */
class LessonFactory extends Factory
{
    public function definition(): array
    {
        return [
            'module_id' => Module::factory(),
            'title' => fake()->sentence(4),
            'description' => fake()->sentence(),
            'type' => Lesson::TYPE_YOUTUBE,
            'order_index' => 0,
            'content_ref' => Str::random(11),
            'duration_seconds' => 600,
            'is_free_preview' => false,
            'is_published' => true,
        ];
    }

    public function freePreview(): static
    {
        return $this->state(fn () => ['is_free_preview' => true]);
    }

    public function live(): static
    {
        return $this->state(fn () => [
            'type' => Lesson::TYPE_LIVE,
            'content_ref' => null,
        ]);
    }
}
