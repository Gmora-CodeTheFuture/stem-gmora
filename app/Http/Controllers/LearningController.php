<?php

namespace App\Http\Controllers;

use App\Events\ExperienceEarned;
use App\Models\Assignment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Progress;
use App\Models\Submission;
use App\Services\CourseCompletion;
use App\Services\CurriculumGate;
use App\Services\DashboardCache;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The authenticated learning experience. Curriculum items are published lessons
 * interleaved with published in-module assignments. Required assignments block
 * later items until the student has submitted.
 */
class LearningController extends Controller
{
    public function __construct(
        private readonly CourseCompletion $completion,
        private readonly CurriculumGate $curriculum,
    ) {}

    /** Course player, optionally deep-linked to a lesson. */
    public function show(Request $request, Course $course, ?Lesson $lesson = null): Response|RedirectResponse
    {
        $context = $this->loadContext($request, $course);
        $items = $context['items'];

        if ($items->isEmpty()) {
            return Inertia::render('Learn/Empty', [
                'course' => $course->only(['id', 'title', 'slug']),
                'instructor' => $course->instructor?->full_name,
            ]);
        }

        $currentLesson = $lesson?->is_published ? $lesson : null;

        if (! $currentLesson) {
            $currentLesson = $this->defaultLesson($items, $context['progress']);
        }

        if ($currentLesson === null) {
            // Resume on first incomplete assignment or first item.
            $firstAssignment = $items->firstWhere('kind', 'assignment');
            if ($firstAssignment) {
                return redirect()->route('learn.assignment', [
                    $course->slug,
                    $firstAssignment['id'],
                ]);
            }

            return Inertia::render('Learn/Empty', [
                'course' => $course->only(['id', 'title', 'slug']),
                'instructor' => $course->instructor?->full_name,
            ]);
        }

        $itemIndex = $items->search(
            fn ($item) => ($item['kind'] ?? null) === 'lesson' && $item['id'] === $currentLesson->id
        );

        abort_if($itemIndex === false, 404);

        if ($context['enrollment'] && ($blocker = $this->curriculum->blockingRequiredBefore($items, (int) $itemIndex))) {
            return redirect()->route('learn.assignment', [$course->slug, $blocker->id])
                ->with('error', 'Complete the required assignment before continuing.');
        }

        return $this->renderLearn($course, $context, [
            'currentLesson' => $this->lessonPayload($currentLesson, $context['progress']),
            'currentAssignment' => null,
        ]);
    }

    /** In-path assignment attempt inside the Learn shell. */
    public function showAssignment(Request $request, Course $course, Assignment $assignment): Response|RedirectResponse
    {
        abort_unless($assignment->course_id === $course->id, 404);
        abort_unless($assignment->is_published && $assignment->module_id, 404);

        $context = $this->loadContext($request, $course);
        $items = $context['items'];

        $itemIndex = $items->search(
            fn ($item) => ($item['kind'] ?? null) === 'assignment' && $item['id'] === $assignment->id
        );

        abort_if($itemIndex === false, 404);

        if ($context['enrollment'] && ($blocker = $this->curriculum->blockingRequiredBefore($items, (int) $itemIndex))) {
            return redirect()->route('learn.assignment', [$course->slug, $blocker->id])
                ->with('error', 'Complete the required assignment before continuing.');
        }

        $assignment->load(['questions' => fn ($q) => $q->orderBy('order_index')]);
        $submission = $context['submissions']->get($assignment->id);
        $reveal = $submission && in_array($submission->status, ['graded', 'returned'], true);

        return $this->renderLearn($course, $context, [
            'currentLesson' => null,
            'currentAssignment' => [
                ...$assignment->only([
                    'id', 'title', 'description', 'deadline_at', 'max_marks', 'is_required', 'module_id', 'order_index',
                ]),
                'questions' => $assignment->questions->map(
                    fn ($q) => $q->forStudent($reveal)
                )->values(),
                'submission' => $submission?->only([
                    'id', 'type', 'answers', 'notes', 'status', 'marks_awarded', 'feedback', 'graded_at', 'created_at',
                    'file_url', 'repo_url', 'link_url',
                ]),
                'is_overdue' => $assignment->deadline_at?->isPast() ?? false,
            ],
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

        /** @var Enrollment|null $enrollment */
        $enrollment = $request->attributes->get('enrollment');

        if (! $enrollment) {
            return back();
        }

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

        if ($isComplete && ! $wasComplete) {
            ExperienceEarned::dispatch(
                $request->user(),
                (int) config('gamification.xp.lesson_completed'),
                'lesson_completed',
            );
        }

        $this->completion->rollUp($enrollment);

        DashboardCache::forget($request->user()->id);

        return back();
    }

    /**
     * @return array{
     *     course: Course,
     *     modules: Collection,
     *     items: Collection,
     *     progress: Collection,
     *     submissions: Collection<string, Submission>,
     *     enrollment: ?Enrollment,
     *     curriculum: array<int, array<string, mixed>>,
     *     lessonIds: Collection
     * }
     */
    private function loadContext(Request $request, Course $course): array
    {
        /** @var Enrollment|null $enrollment */
        $enrollment = $request->attributes->get('enrollment');

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
        $submissions = $request->user()
            ? Submission::where('user_id', $request->user()->id)
                ->whereIn('assignment_id', $assignmentIds)
                ->get()
                ->keyBy('assignment_id')
            : collect();

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

        return [
            'course' => $course,
            'modules' => $modules,
            'items' => $items,
            'progress' => $progress,
            'submissions' => $submissions,
            'enrollment' => $enrollment,
            'curriculum' => $curriculum,
            'lessonIds' => $course->modules->flatMap->lessons->pluck('id'),
        ];
    }

    /**
     * @param  array<string, mixed>  $context
     * @param  array{currentLesson: ?array, currentAssignment: ?array}  $current
     */
    private function renderLearn(Course $course, array $context, array $current): Response
    {
        $enrollment = $context['enrollment'];

        return Inertia::render('Learn/Show', [
            'course' => $course->only(['id', 'title', 'slug', 'category', 'total_lessons']),
            'modules' => $context['modules'],
            'curriculum' => $context['curriculum'],
            'currentLesson' => $current['currentLesson'],
            'currentAssignment' => $current['currentAssignment'],
            'completionPercentage' => $enrollment
                ? $this->completionPercentage($enrollment, $context['lessonIds'])
                : 0.0,
        ]);
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $items
     * @param  Collection<string, Progress>  $progress
     */
    private function defaultLesson(Collection $items, Collection $progress): ?Lesson
    {
        foreach ($items as $item) {
            if (($item['kind'] ?? null) !== 'lesson') {
                continue;
            }
            /** @var Lesson $lesson */
            $lesson = $item['lesson'];
            if ($progress->get($lesson->id)?->status !== Progress::STATUS_COMPLETED) {
                return $lesson;
            }
        }

        $lastLesson = $items->reverse()->firstWhere('kind', 'lesson');

        return $lastLesson['lesson'] ?? null;
    }

    /**
     * @param  Collection<string, Progress>  $progress
     * @return array<string, mixed>
     */
    private function lessonPayload(Lesson $lesson, Collection $progress): array
    {
        $lesson->loadMissing(['liveSession', 'quiz', 'presentation']);

        return [
            ...$lesson->only(['id', 'title', 'description', 'type', 'duration_seconds']),
            'has_video' => $lesson->isVideo() && $lesson->content_ref !== null,
            'has_presentation' => $lesson->type === Lesson::TYPE_HTML && $lesson->presentation !== null,
            'has_pdf' => $lesson->type === Lesson::TYPE_PDF && filled($lesson->getRawOriginal('content_ref')),
            'live_session' => $lesson->liveSession?->only([
                'id', 'title', 'scheduled_start', 'duration_minutes', 'zoom_join_url',
            ]),
            'quiz' => $lesson->quiz?->is_published ? $lesson->quiz->only(['id', 'title']) : null,
            'progress' => $progress->get($lesson->id)?->only(['status', 'watch_percentage']),
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, string>  $lessonIds
     */
    private function completionPercentage(Enrollment $enrollment, $lessonIds): float
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
