<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Progress;
use App\Services\ContentVersion;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The student course browser: enrolled courses and the full catalog in one
 * place, filterable and searchable.
 */
class MyCoursesController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $filters = $request->only('search', 'filter', 'category');

        // Keyed by content version, so publishing or enrolling retires it.
        $key = 'courses:'.$user->id.':'.ContentVersion::current().':'.md5(serialize($filters));

        return Inertia::render('Dashboard/Courses', Cache::remember(
            $key,
            now()->addMinutes(10),
            fn () => $this->payload($request),
        ));
    }

    /** @return array<string, mixed> */
    private function payload(Request $request): array
    {
        $user = $request->user();
        $search = trim($request->string('search')->toString());
        $filter = $request->string('filter')->toString() ?: 'enrolled';
        $filter = in_array($filter, ['enrolled', 'all'], true) ? $filter : 'enrolled';
        $categories = $this->selectedCategories($request);

        $enrollments = Enrollment::where('user_id', $user->id)
            ->whereIn('status', [Enrollment::STATUS_ACTIVE, Enrollment::STATUS_COMPLETED])
            ->with('course.instructor:id,full_name')
            ->withCount([
                'progress as completed_lessons_count' => fn ($q) => $q
                    ->where('status', Progress::STATUS_COMPLETED)
                    ->whereHas('lesson', fn ($lesson) => $lesson->where('is_published', true)),
            ])
            ->get();

        $enrolledIds = $enrollments->pluck('course_id')->all();
        $nextLessons = $this->nextLessonsByEnrollment($enrollments);

        $enrolled = $enrollments
            ->filter(fn (Enrollment $enrollment) => $this->matches($enrollment->course, $search, $categories))
            ->map(fn (Enrollment $enrollment) => [
                'enrollment_id' => $enrollment->id,
                'status' => $enrollment->status,
                'completed_lessons_count' => $enrollment->completed_lessons_count,
                'percentage' => $this->percentage($enrollment),
                'next_lesson' => $nextLessons->get($enrollment->id),
                ...$this->presentCourse($enrollment->course, true),
            ])
            ->sortByDesc('percentage')
            ->values();

        // One read of the published catalog, then filter and count in memory.
        // Each round trip to the database costs a second or more from here, and
        // this page used to make three separate published() queries — enough to
        // exceed PHP's execution limit whenever the database was cold.
        $published = Course::published()
            ->with('instructor:id,full_name')
            ->orderByDesc('total_enrollments')
            ->get();

        $catalog = $published
            ->filter(fn (Course $course) => $this->matches($course, $search, $categories))
            ->map(fn (Course $course) => $this->presentCourse($course, in_array($course->id, $enrolledIds, true)))
            ->values();

        return [
            'enrolled' => $enrolled->toArray(),
            'catalog' => $catalog->toArray(),
            'categories' => $published->pluck('category')->unique()->sort()->values()->all(),
            'filters' => [
                'search' => $search,
                'filter' => $filter,
                'category' => $categories,
            ],
            'counts' => [
                'enrolled' => count($enrolledIds),
                'all' => $published->count(),
            ],
        ];
    }

    /**
     * First incomplete published lesson per enrollment (module then lesson order).
     *
     * @param  Collection<int, Enrollment>  $enrollments
     * @return Collection<string, array{id: string, title: string, duration_seconds: int}|null>
     */
    private function nextLessonsByEnrollment(Collection $enrollments): Collection
    {
        if ($enrollments->isEmpty()) {
            return collect();
        }

        $courseIds = $enrollments->pluck('course_id')->unique()->values();
        $enrollmentIds = $enrollments->pluck('id');

        $completedByEnrollment = Progress::query()
            ->whereIn('enrollment_id', $enrollmentIds)
            ->where('status', Progress::STATUS_COMPLETED)
            ->get(['enrollment_id', 'lesson_id'])
            ->groupBy('enrollment_id')
            ->map(fn (Collection $rows) => $rows->pluck('lesson_id')->all());

        $lessonsByCourse = Lesson::query()
            ->where('is_published', true)
            ->whereHas('module', fn ($q) => $q
                ->whereIn('course_id', $courseIds)
                ->where('is_published', true))
            ->with('module:id,course_id,order_index')
            ->orderBy('order_index')
            ->get(['id', 'module_id', 'title', 'duration_seconds', 'order_index'])
            ->groupBy(fn (Lesson $lesson) => $lesson->module?->course_id)
            ->map(fn (Collection $lessons) => $lessons
                ->sortBy([
                    fn (Lesson $l) => (int) ($l->module?->order_index ?? 0),
                    fn (Lesson $l) => (int) $l->order_index,
                ])
                ->values());

        return $enrollments->mapWithKeys(function (Enrollment $enrollment) use ($completedByEnrollment, $lessonsByCourse) {
            $completed = $completedByEnrollment->get($enrollment->id, []);
            $lessons = $lessonsByCourse->get($enrollment->course_id, collect());

            /** @var Lesson|null $next */
            $next = $lessons->first(fn (Lesson $lesson) => ! in_array($lesson->id, $completed, true));

            return [
                $enrollment->id => $next ? [
                    'id' => $next->id,
                    'title' => $next->title,
                    'duration_seconds' => (int) $next->duration_seconds,
                ] : null,
            ];
        });
    }

    /** @return array<string, mixed> */
    private function presentCourse(?Course $course, bool $isEnrolled): array
    {
        if (! $course) {
            return [];
        }

        return [
            'id' => $course->id,
            'title' => $course->title,
            'slug' => $course->slug,
            'subtitle' => $course->subtitle,
            'category' => $course->category,
            'difficulty' => $course->difficulty,
            'price' => $course->price,
            'currency' => $course->currency,
            'thumbnail_url' => $course->thumbnail_url,
            'total_lessons' => $course->total_lessons,
            'duration_minutes' => $course->duration_minutes,
            'total_enrollments' => $course->total_enrollments,
            'instructor_name' => $course->instructor?->full_name,
            'is_enrolled' => $isEnrolled,
        ];
    }

    /**
     * @param  list<string>  $categories
     */
    private function matches(?Course $course, string $search, array $categories): bool
    {
        if (! $course) {
            return false;
        }

        if ($categories !== [] && ! in_array($course->category, $categories, true)) {
            return false;
        }

        if ($search === '') {
            return true;
        }

        $haystack = mb_strtolower($course->title.' '.$course->subtitle.' '.$course->category);

        return str_contains($haystack, mb_strtolower($search));
    }

    /** @return list<string> */
    private function selectedCategories(Request $request): array
    {
        $raw = $request->input('category', []);

        if (is_string($raw)) {
            $raw = $raw === '' ? [] : [$raw];
        }

        if (! is_array($raw)) {
            return [];
        }

        return array_values(array_unique(array_filter(
            array_map(static fn ($value) => is_string($value) ? trim($value) : '', $raw),
            static fn (string $value) => $value !== '',
        )));
    }

    private function percentage(Enrollment $enrollment): int
    {
        $total = $enrollment->course?->total_lessons ?? 0;

        return $total > 0 ? (int) round($enrollment->completed_lessons_count / $total * 100) : 0;
    }
}
