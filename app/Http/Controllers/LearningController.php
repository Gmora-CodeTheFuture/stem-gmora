<?php

namespace App\Http\Controllers;

use App\Events\ExperienceEarned;
use App\Jobs\GenerateCertificate;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Progress;
use App\Services\DashboardCache;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The authenticated learning experience. Every response here is built from
 * public-safe lesson fields only — the player fetches its video ID over XHR
 * after mount (Plan §6.2.2), so no `content_ref` ever reaches page source.
 */
class LearningController extends Controller
{
    /** Course player, optionally deep-linked to a lesson. */
    public function show(Request $request, Course $course, ?Lesson $lesson = null): Response
    {
        /** @var Enrollment $enrollment set by EnsureEnrolled */
        $enrollment = $request->attributes->get('enrollment');

        $course->load([
            'instructor:id,full_name,avatar_url',
            'modules' => fn ($q) => $q->where('is_published', true),
            'modules.lessons' => fn ($q) => $q->where('is_published', true),
            'modules.lessons.liveSession',
            'modules.lessons.quiz:id,lesson_id,title,is_published',
            'modules.lessons.presentation:id,lesson_id,original_filename',
        ]);

        $progress = $enrollment->progress()->get()->keyBy('lesson_id');

        $modules = $course->modules->map(fn ($module) => [
            ...$module->only(['id', 'title', 'description', 'order_index']),
            'lessons' => $module->lessons->map(fn ($l) => [
                ...$l->only(['id', 'title', 'description', 'type', 'order_index', 'duration_seconds']),
                'has_video' => $l->isVideo() && $l->content_ref !== null,
                'has_presentation' => $l->type === Lesson::TYPE_HTML && $l->presentation !== null,
                'live_session' => $l->liveSession?->only([
                    'id', 'title', 'scheduled_start', 'duration_minutes', 'zoom_join_url',
                ]),
                'progress' => $progress->get($l->id)?->only(['status', 'watch_percentage']),
            ]),
        ]);

        $allLessons = $course->modules->flatMap->lessons;
        $current = $lesson?->is_published ? $lesson : null;

        if (! $current) {
            $incomplete = $allLessons->first(function ($l) use ($progress) {
                return $progress->get($l->id)?->status !== 'completed';
            });
            $current = $incomplete ?? $allLessons->last();
        }

        // An enrolled student is entitled to an explanation, not a 404: the
        // instructor may still be drafting, or may have pulled a module back.
        if ($current === null) {
            return Inertia::render('Learn/Empty', [
                'course' => $course->only(['id', 'title', 'slug']),
                'instructor' => $course->instructor?->full_name,
            ]);
        }

        abort_unless($allLessons->contains('id', $current->id), 404);

        return Inertia::render('Learn/Show', [
            'course' => $course->only(['id', 'title', 'slug', 'category', 'total_lessons']),
            'modules' => $modules,
            'currentLesson' => [
                ...$current->only(['id', 'title', 'description', 'type', 'duration_seconds']),
                'has_video' => $current->isVideo() && $current->content_ref !== null,
                'has_presentation' => $current->type === Lesson::TYPE_HTML && $current->presentation !== null,
                'live_session' => $current->liveSession?->only([
                    'id', 'title', 'scheduled_start', 'duration_minutes', 'zoom_join_url',
                ]),
                'quiz' => $current->quiz?->is_published ? $current->quiz->only(['id', 'title']) : null,
                'progress' => $progress->get($current->id)?->only(['status', 'watch_percentage']),
            ],
            'completionPercentage' => $this->completionPercentage($enrollment, $allLessons->count()),
        ]);
    }

    /**
     * Record watch progress. Auto-completes at 90% watched (Plan §8.3).
     */
    public function updateProgress(Request $request, Lesson $lesson): RedirectResponse
    {
        $validated = $request->validate([
            'watch_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'completed' => ['sometimes', 'boolean'],
        ]);

        /** @var Enrollment $enrollment set by EnsureEnrolled */
        $enrollment = $request->attributes->get('enrollment');

        $progress = Progress::firstOrNew([
            'enrollment_id' => $enrollment->id,
            'lesson_id' => $lesson->id,
        ]);

        $watched = max((float) $validated['watch_percentage'], (float) ($progress->watch_percentage ?? 0));
        $isComplete = ($validated['completed'] ?? false) || $watched >= 90;

        $wasComplete = $progress->exists && $progress->status === Progress::STATUS_COMPLETED;

        $progress->fill([
            'watch_percentage' => $watched,
            'status' => $isComplete ? Progress::STATUS_COMPLETED : Progress::STATUS_IN_PROGRESS,
            'completed_at' => $isComplete ? ($progress->completed_at ?? now()) : null,
        ])->save();

        // XP is granted once per lesson, on the transition to complete.
        if ($isComplete && ! $wasComplete) {
            ExperienceEarned::dispatch(
                $request->user(),
                (int) config('gamification.xp.lesson_completed'),
                'lesson_completed',
            );
        }

        $this->rollUpCourseCompletion($enrollment);

        DashboardCache::forget($request->user()->id);

        return back();
    }

    /**
     * Course-level roll-up: 100% completion flips the enrollment and queues
     * the certificate job (Plan §8.8).
     */
    private function rollUpCourseCompletion(Enrollment $enrollment): void
    {
        $total = $this->publishedLessonCount($enrollment->course_id);

        if ($total === 0) {
            return;
        }

        $completed = $enrollment->progress()->where('status', Progress::STATUS_COMPLETED)->count();

        if ($completed < $total || $enrollment->status === Enrollment::STATUS_COMPLETED) {
            return;
        }

        $enrollment->update([
            'status' => Enrollment::STATUS_COMPLETED,
            'completed_at' => now(),
        ]);

        GenerateCertificate::dispatch($enrollment->id);

        if ($enrollment->user) {
            ExperienceEarned::dispatch(
                $enrollment->user,
                (int) config('gamification.xp.course_completed'),
                'course_completed',
            );
        }
    }

    private function completionPercentage(Enrollment $enrollment, int $totalLessons): float
    {
        if ($totalLessons === 0) {
            return 0.0;
        }

        $completed = $enrollment->progress()->where('status', Progress::STATUS_COMPLETED)->count();

        return round($completed / $totalLessons * 100, 1);
    }

    private function publishedLessonCount(string $courseId): int
    {
        return Lesson::where('is_published', true)
            ->whereHas('module', fn ($q) => $q->where('course_id', $courseId)->where('is_published', true))
            ->count();
    }
}
