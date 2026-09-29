<?php

namespace App\Services;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Progress;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Shared Inertia props for the immersive course shell (curriculum rail + tabs).
 */
class CourseShellBuilder
{
    public function __construct(
        private readonly CurriculumGate $curriculum,
    ) {}

    /**
     * @return array{
     *     course: array<string, mixed>,
     *     modules: Collection,
     *     curriculum: array<int, array<string, mixed>>,
     *     completionPercentage: float
     * }
     */
    public function build(User $user, Course $course, ?Enrollment $enrollment = null): array
    {
        $enrollment ??= Enrollment::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->whereIn('status', [Enrollment::STATUS_ACTIVE, Enrollment::STATUS_COMPLETED])
            ->first();

        $course->load([
            'instructor:id,full_name,avatar_url',
            'modules' => fn ($q) => $q->where('is_published', true)->orderBy('order_index'),
            'modules.lessons' => fn ($q) => $q->where('is_published', true)->orderBy('order_index'),
            'modules.lessons.liveSession',
            'modules.lessons.quiz:id,lesson_id,title,is_published',
            'modules.lessons.presentation:id,lesson_id,original_filename',
            'modules.assignments' => fn ($q) => $q->where('is_published', true)->orderBy('order_index'),
        ]);

        $progress = $enrollment
            ? $enrollment->progress()->get()->keyBy('lesson_id')
            : collect();

        $assignmentIds = $course->modules->flatMap->assignments->pluck('id');
        $submissions = Submission::where('user_id', $user->id)
            ->whereIn('assignment_id', $assignmentIds)
            ->get()
            ->keyBy('assignment_id');

        $items = $this->curriculum->buildItems($course->modules, $submissions);

        $modules = $course->modules->map(fn ($module) => [
            ...$module->only(['id', 'title', 'description', 'order_index']),
            'lessons' => $module->lessons->map(fn ($l) => [
                ...$l->only(['id', 'title', 'description', 'type', 'order_index', 'duration_seconds']),
                'has_video' => $l->isVideo() && $l->content_ref !== null,
                'has_presentation' => $l->type === Lesson::TYPE_HTML && $l->presentation !== null,
                'live_session' => $l->liveSession?->only([
                    'id', 'title', 'scheduled_start', 'duration_minutes', 'zoom_join_url',
                ]),
                'quiz' => $l->quiz?->is_published ? $l->quiz->only(['id', 'title']) : null,
                'progress' => $progress->get($l->id)?->only(['status', 'watch_percentage']),
            ]),
            'assignments' => $module->assignments->map(fn (Assignment $a) => [
                ...$a->only(['id', 'title', 'description', 'order_index', 'is_required', 'max_marks']),
                'submitted' => $submissions->has($a->id),
            ]),
        ]);

        $curriculum = $items->map(function (array $item) use ($progress) {
            if ($item['kind'] === 'lesson') {
                /** @var Lesson $lesson */
                $lesson = $item['lesson'];

                return [
                    'kind' => 'lesson',
                    'id' => $lesson->id,
                    'module_id' => $item['module_id'],
                    'title' => $lesson->title,
                    'type' => $lesson->type,
                    'order_index' => $item['order_index'],
                    'completed' => $progress->get($lesson->id)?->status === Progress::STATUS_COMPLETED,
                    'submitted' => false,
                    'is_required' => false,
                ];
            }

            /** @var Assignment $assignment */
            $assignment = $item['assignment'];

            return [
                'kind' => 'assignment',
                'id' => $assignment->id,
                'module_id' => $item['module_id'],
                'title' => $assignment->title,
                'type' => 'assignment',
                'order_index' => $item['order_index'],
                'completed' => (bool) ($item['submitted'] ?? false),
                'submitted' => (bool) ($item['submitted'] ?? false),
                'is_required' => (bool) $assignment->is_required,
            ];
        })->values()->all();

        $lessonIds = $course->modules->flatMap->lessons->pluck('id');

        return [
            'course' => $course->only(['id', 'title', 'slug', 'category', 'total_lessons']),
            'modules' => $modules,
            'curriculum' => $curriculum,
            'completionPercentage' => $enrollment
                ? $this->completionPercentage($enrollment, $lessonIds)
                : 0.0,
        ];
    }

    /**
     * @param  Collection<int, string>  $lessonIds
     */
    private function completionPercentage(Enrollment $enrollment, Collection $lessonIds): float
    {
        $totalLessons = $lessonIds->count();

        if ($totalLessons === 0) {
            return 0.0;
        }

        $completed = $enrollment->progress()
            ->where('status', Progress::STATUS_COMPLETED)
            ->whereIn('lesson_id', $lessonIds)
            ->count();

        return round($completed / $totalLessons * 100, 1);
    }
}
