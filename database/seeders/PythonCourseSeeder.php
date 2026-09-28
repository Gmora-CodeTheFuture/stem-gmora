<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Role;
use App\Models\User;
use App\Services\CourseContentService;
use App\Services\PresentationService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Seeds the Python Programming course from resources/course-content/python.
 *
 * Each lesson HTML is staged with the shared assets/ bundle (deck.css/js, fonts,
 * images), then copied into private presentation storage.
 */
class PythonCourseSeeder extends Seeder
{
    private const LESSON_DURATION_SECONDS = 900;

    public function run(): void
    {
        $sourceRoot = resource_path('course-content/python');
        $manifestPath = $sourceRoot.'/manifest.json';

        if (! is_file($manifestPath)) {
            $this->command?->error("Manifest missing: {$manifestPath}");

            return;
        }

        $manifest = json_decode(file_get_contents($manifestPath), true, 512, JSON_THROW_ON_ERROR);

        $instructor = User::whereHas('role', fn ($q) => $q->where('name', Role::ADMIN))->first();

        if (! $instructor) {
            $this->command?->warn('No admin found — run DatabaseSeeder first.');

            return;
        }

        $course = Course::updateOrCreate(
            ['slug' => $manifest['slug'] ?? 'python-programming'],
            [
                'instructor_id' => $instructor->id,
                'title' => $manifest['title'] ?? 'Python Programming',
                'subtitle' => 'Learn Python from first principles — syntax, data structures, OOP, and real-world tools.',
                'description' => "A hands-on beginner course for secondary and early-university students.\n\nWork through interactive HTML lessons covering core Python, collections, control flow, functions, object-oriented programming, files, and more. Many lessons include in-browser code you can run as you learn.",
                'category' => 'Programming',
                'color' => '#b9790a',
                'difficulty' => 'beginner',
                'language' => 'en',
                'price' => 0,
                'currency' => 'USD',
                'status' => Course::STATUS_PUBLISHED,
                'thumbnail_url' => '/images/python-course.webp',
            ]
        );

        $content = app(CourseContentService::class);
        $presentations = app(PresentationService::class);

        $course->modules()->each(fn ($module) => $content->deleteModule($module));

        $totalLessons = 0;

        foreach ($manifest['modules'] as $moduleIndex => $moduleData) {
            $module = $course->modules()->create([
                'title' => $moduleData['title'],
                'description' => $moduleData['description'] ?? '',
                'order_index' => $moduleIndex,
                'is_published' => true,
            ]);

            foreach ($moduleData['lessons'] as $lessonIndex => $lessonData) {
                $sourceFile = $sourceRoot.'/lessons/'.$lessonData['file'];

                if (! is_file($sourceFile)) {
                    $this->command?->warn("Skipping missing lesson file: {$lessonData['file']}");

                    continue;
                }

                $lesson = $module->lessons()->create([
                    'title' => $lessonData['title'],
                    'type' => Lesson::TYPE_HTML,
                    'order_index' => $lessonIndex,
                    'content_ref' => $lessonData['id'] ?? pathinfo($lessonData['file'], PATHINFO_FILENAME),
                    'duration_seconds' => self::LESSON_DURATION_SECONDS,
                    'is_free_preview' => $moduleIndex === 0 && $lessonIndex === 0,
                    'is_published' => true,
                ]);

                $staging = $this->stageLessonBundle($sourceRoot, $sourceFile);

                try {
                    $presentations->storeFromDirectory(
                        $lesson,
                        $staging,
                        'index.html',
                        $lessonData['file'],
                    );
                } finally {
                    $this->deleteDirectory($staging);
                }

                $totalLessons++;
            }
        }

        $content->syncCounters($course->refresh());

        $this->command?->info("Seeded course: {$course->title} ({$totalLessons} HTML lessons).");
    }

    /** Stage index.html + shared assets flattened at the bundle root. */
    private function stageLessonBundle(string $sourceRoot, string $lessonFile): string
    {
        $staging = storage_path('app/tmp_python_seed_'.Str::random(12));
        mkdir($staging, 0755, true);

        copy($lessonFile, $staging.DIRECTORY_SEPARATOR.'index.html');

        // Flatten assets/ into the presentation root so /presentations/{id}/assets/{path}
        // maps to storage_path/{path} (deck.css, fonts/..., images/...).
        $assetsSrc = $sourceRoot.DIRECTORY_SEPARATOR.'assets';
        if (is_dir($assetsSrc)) {
            $this->copyDirectory($assetsSrc, $staging);
        }

        return $staging;
    }

    private function copyDirectory(string $from, string $to): void
    {
        if (! is_dir($to)) {
            mkdir($to, 0755, true);
        }

        $items = scandir($from);
        foreach ($items as $item) {
            if ($item === '.' || $item === '..' || $item === '.DS_Store') {
                continue;
            }

            $src = $from.DIRECTORY_SEPARATOR.$item;
            $dest = $to.DIRECTORY_SEPARATOR.$item;

            if (is_dir($src)) {
                $this->copyDirectory($src, $dest);
            } else {
                copy($src, $dest);
            }
        }
    }

    private function deleteDirectory(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }

        $items = scandir($dir);
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir.DIRECTORY_SEPARATOR.$item;
            is_dir($path) ? $this->deleteDirectory($path) : unlink($path);
        }
        rmdir($dir);
    }
}
