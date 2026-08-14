<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Lesson;

/**
 * The publish checklist a reviewer works through (Plan §8.9).
 *
 * Each check is something this application can actually verify. The one item
 * the plan calls for that cannot be automated yet — confirming every video
 * reads back as `unlisted` through the YouTube Data API — is surfaced as a
 * manual step rather than quietly reported as passing.
 */
class CourseReadiness
{
    /**
     * @return array{checks: array<int, array{label: string, passed: bool, detail: string, manual?: bool}>, blocking: int}
     */
    public function for(Course $course): array
    {
        $course->loadMissing(['modules.lessons']);

        $publishedModules = $course->modules->where('is_published', true);
        $publishedLessons = $publishedModules->flatMap->lessons->where('is_published', true);

        $videoLessons = $publishedLessons->where('type', Lesson::TYPE_YOUTUBE);
        $missingVideo = $videoLessons->filter(fn (Lesson $lesson) => blank($lesson->content_ref));

        $checks = [
            [
                'label' => 'Has published lessons',
                'passed' => $publishedLessons->isNotEmpty(),
                'detail' => $publishedLessons->count().' published across '.$publishedModules->count().' module(s)',
            ],
            [
                'label' => 'Every video lesson has a video',
                'passed' => $missingVideo->isEmpty(),
                'detail' => $missingVideo->isEmpty()
                    ? $videoLessons->count().' video lesson(s) ready'
                    : $missingVideo->count().' missing a video id: '.$missingVideo->pluck('title')->take(3)->implode(', '),
            ],
            [
                'label' => 'Description written',
                'passed' => filled($course->description) && mb_strlen($course->description) >= 80,
                'detail' => filled($course->description)
                    ? mb_strlen($course->description).' characters'
                    : 'No description',
            ],
            [
                'label' => 'Category and difficulty set',
                'passed' => filled($course->category) && filled($course->difficulty),
                'detail' => trim(($course->category ?? '—').' · '.($course->difficulty ?? '—')),
            ],
            [
                'label' => 'Pricing decided',
                'passed' => $course->price !== null && filled($course->currency),
                'detail' => $course->isFree() ? 'Free' : "{$course->currency} {$course->price}",
            ],
            [
                'label' => 'Lesson duration recorded',
                'passed' => $publishedLessons->every(fn (Lesson $lesson) => $lesson->duration_seconds > 0
                    || in_array($lesson->type, [Lesson::TYPE_QUIZ, Lesson::TYPE_PDF], true)),
                'detail' => round($course->duration_minutes / 60, 1).' hours total',
            ],
            [
                // Requires the YouTube Data API, which is not connected yet.
                'label' => 'Videos confirmed unlisted',
                'passed' => false,
                'manual' => true,
                'detail' => 'Check each video by hand until the YouTube Data API is connected',
            ],
        ];

        return [
            'checks' => $checks,
            'blocking' => collect($checks)->where('manual', '!=', true)->where('passed', false)->count(),
        ];
    }
}
