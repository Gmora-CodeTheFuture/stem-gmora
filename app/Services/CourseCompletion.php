<?php

namespace App\Services;

use App\Events\ExperienceEarned;
use App\Jobs\GenerateCertificate;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Progress;
use App\Models\QuizAttempt;

/**
 * Shared course-completion roll-up. Video progress, quiz passes, and admin
 * status changes all land here so certificates and XP stay consistent.
 */
class CourseCompletion
{
    public function __construct(private readonly GradingService $grading) {}

    /**
     * Mark a quiz lesson complete when the attempt has passed, then roll up.
     * Returns true when lesson progress was newly written or updated.
     */
    public function syncQuizLesson(QuizAttempt $attempt, bool $awardLessonXp = true): bool
    {
        $attempt->loadMissing(['quiz', 'user']);

        $lessonId = $attempt->quiz->lesson_id;

        if (! $lessonId || ! $this->grading->hasPassed($attempt->quiz, $attempt)) {
            return false;
        }

        $enrollment = Enrollment::where('user_id', $attempt->user_id)
            ->where('course_id', $attempt->quiz->course_id)
            ->whereIn('status', [Enrollment::STATUS_ACTIVE, Enrollment::STATUS_COMPLETED])
            ->first();

        if (! $enrollment) {
            return false;
        }

        $progress = Progress::firstOrNew([
            'enrollment_id' => $enrollment->id,
            'lesson_id' => $lessonId,
        ]);

        $wasComplete = $progress->exists && $progress->status === Progress::STATUS_COMPLETED;

        $progress->fill([
            'status' => Progress::STATUS_COMPLETED,
            'watch_percentage' => 100,
            'completed_at' => $progress->completed_at ?? now(),
        ])->save();

        if ($awardLessonXp && ! $wasComplete && $attempt->user) {
            ExperienceEarned::dispatch(
                $attempt->user,
                (int) config('gamification.xp.lesson_completed'),
                'lesson_completed',
            );
        }

        $this->rollUp($enrollment);

        return true;
    }

    /**
     * When every published lesson is done, flip the enrollment and queue a
     * certificate. Safe to call repeatedly — no-ops if already completed.
     */
    public function rollUp(Enrollment $enrollment): void
    {
        $enrollment->loadMissing('user');

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

    /**
     * Admin-forced completion: mark the enrollment done and issue a certificate
     * even if lesson progress is incomplete.
     */
    public function markCompleted(Enrollment $enrollment): void
    {
        $enrollment->loadMissing('user');

        if ($enrollment->status === Enrollment::STATUS_COMPLETED && $enrollment->completed_at) {
            GenerateCertificate::dispatch($enrollment->id);

            return;
        }

        $enrollment->update([
            'status' => Enrollment::STATUS_COMPLETED,
            'completed_at' => $enrollment->completed_at ?? now(),
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

    public function publishedLessonCount(string $courseId): int
    {
        return Lesson::where('is_published', true)
            ->whereHas('module', fn ($q) => $q->where('course_id', $courseId)->where('is_published', true))
            ->count();
    }
}
