<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use Illuminate\Support\Str;

/**
 * Shared course-authoring rules used by both the tutor builder and the admin
 * panel, so the two paths cannot drift apart.
 *
 * The denormalised counters on `courses` are what every progress calculation
 * divides by (dashboard, course list, certificate roll-up), so they must be
 * recomputed on every structural change — a stale count silently makes 100%
 * unreachable and stops certificates from ever being issued.
 */
class CourseContentService
{
    /** Build a slug that will not collide with an existing course. */
    public function uniqueSlug(string $title, ?string $ignoreCourseId = null): string
    {
        $base = Str::slug($title) ?: 'course';
        $slug = $base;
        $suffix = 2;

        while (
            Course::withTrashed()
                ->where('slug', $slug)
                ->when($ignoreCourseId, fn ($q) => $q->whereKeyNot($ignoreCourseId))
                ->exists()
        ) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    /**
     * Recompute the counters students' progress is measured against.
     *
     * Only *published* lessons inside *published* modules count, which is what
     * the player and the certificate roll-up use.
     */
    public function syncCounters(Course $course): void
    {
        $lessons = Lesson::query()
            ->where('is_published', true)
            ->whereHas('module', fn ($q) => $q->where('course_id', $course->id)->where('is_published', true))
            ->get(['duration_seconds']);

        $course->forceFill([
            'total_lessons' => $lessons->count(),
            'duration_minutes' => (int) round($lessons->sum('duration_seconds') / 60),
        ])->save();
    }

    /**
     * Soft-deleting a module does not cascade through the foreign key, so the
     * lessons underneath would stay live and keep counting toward progress.
     */
    public function deleteModule(Module $module): void
    {
        $course = $module->course;

        $module->lessons()->each(fn (Lesson $lesson) => $lesson->delete());
        $module->delete();

        if ($course) {
            $this->syncCounters($course);
        }
    }

    /** Same cascade problem one level up. */
    public function deleteCourse(Course $course): void
    {
        $course->modules()->each(function (Module $module) {
            $module->lessons()->each(fn (Lesson $lesson) => $lesson->delete());
            $module->delete();
        });

        $course->delete();
    }

    /**
     * A lesson may only be published when it actually has something to play.
     * Returns the reason it cannot be published, or null when it is fine.
     */
    public function publishBlocker(Lesson $lesson): ?string
    {
        return match ($lesson->type) {
            Lesson::TYPE_YOUTUBE => $lesson->content_ref
                ? null
                : 'Add the YouTube video ID before publishing this lesson.',
            Lesson::TYPE_PDF => $lesson->content_ref
                ? null
                : 'Attach a file reference before publishing this lesson.',
            Lesson::TYPE_LIVE => $lesson->liveSession()->exists()
                ? null
                : 'Schedule the live session before publishing this lesson.',
            Lesson::TYPE_QUIZ => $lesson->quiz()->where('is_published', true)->exists()
                ? null
                : 'Publish the quiz before publishing this lesson.',
            default => null,
        };
    }
}
