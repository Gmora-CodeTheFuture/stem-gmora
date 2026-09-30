<?php

namespace Database\Factories;

use App\Models\Lesson;
use App\Models\LessonMaterial;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<LessonMaterial>
 */
class LessonMaterialFactory extends Factory
{
    protected $model = LessonMaterial::class;

    public function definition(): array
    {
        return [
            'lesson_id' => Lesson::factory(),
            'type' => LessonMaterial::TYPE_YOUTUBE,
            'title' => 'Video',
            'order_index' => 0,
            'content_ref' => Str::random(11),
        ];
    }

    public function pdf(): static
    {
        return $this->state(fn () => [
            'type' => LessonMaterial::TYPE_PDF,
            'title' => 'Document',
            'content_ref' => 'lesson-pdfs/demo/notes.pdf',
        ]);
    }

    public function html(): static
    {
        return $this->state(fn () => [
            'type' => LessonMaterial::TYPE_HTML,
            'title' => 'Presentation',
            'content_ref' => null,
            'storage_path' => 'presentations/demo',
            'entry_file' => 'index.html',
            'original_filename' => 'demo.zip',
            'file_size' => 1024,
        ]);
    }

    public function live(): static
    {
        return $this->state(fn () => [
            'type' => LessonMaterial::TYPE_LIVE,
            'title' => 'Live class',
            'content_ref' => null,
            'scheduled_start' => now()->addDay(),
            'duration_minutes' => 60,
            'zoom_join_url' => 'https://zoom.us/j/123',
        ]);
    }
}
