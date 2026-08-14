<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Progress;
use App\Services\ContentVersion;
use Illuminate\Http\Request;
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
        $category = $request->string('category')->toString();

        $enrollments = Enrollment::where('user_id', $user->id)
            ->whereIn('status', [Enrollment::STATUS_ACTIVE, Enrollment::STATUS_COMPLETED])
            ->with('course.instructor:id,full_name')
            ->withCount([
                'progress as completed_lessons_count' => fn ($q) => $q->where('status', Progress::STATUS_COMPLETED),
            ])
            ->get();

        $enrolledIds = $enrollments->pluck('course_id')->all();

        $enrolled = $enrollments
            ->filter(fn (Enrollment $enrollment) => $this->matches($enrollment->course, $search, $category))
            ->map(fn (Enrollment $enrollment) => [
                'enrollment_id' => $enrollment->id,
                'status' => $enrollment->status,
                'completed_lessons_count' => $enrollment->completed_lessons_count,
                'percentage' => $this->percentage($enrollment),
                ...$this->presentCourse($enrollment->course, true),
            ])
            ->sortByDesc('percentage')
            ->values();

        $catalog = Course::published()
            ->with('instructor:id,full_name')
            ->when($search !== '', fn ($q) => $q->where(fn ($inner) => $inner
                ->whereLike('title', "%{$search}%")
                ->orWhereLike('subtitle', "%{$search}%")
                ->orWhereLike('category', "%{$search}%")))
            ->when($category !== '', fn ($q) => $q->where('category', $category))
            ->orderByDesc('total_enrollments')
            ->get()
            ->map(fn (Course $course) => $this->presentCourse($course, in_array($course->id, $enrolledIds, true)))
            ->values();

        return [
            'enrolled' => $enrolled->toArray(),
            'catalog' => $catalog->toArray(),
            'categories' => Course::published()->distinct()->orderBy('category')->pluck('category')->all(),
            'filters' => [
                'search' => $search,
                'filter' => $filter,
                'category' => $category,
            ],
            'counts' => [
                'enrolled' => count($enrolledIds),
                'all' => Course::published()->count(),
            ],
        ];
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

    private function matches(?Course $course, string $search, string $category): bool
    {
        if (! $course) {
            return false;
        }

        if ($category !== '' && $course->category !== $category) {
            return false;
        }

        if ($search === '') {
            return true;
        }

        $haystack = mb_strtolower($course->title.' '.$course->subtitle.' '.$course->category);

        return str_contains($haystack, mb_strtolower($search));
    }

    private function percentage(Enrollment $enrollment): int
    {
        $total = $enrollment->course?->total_lessons ?? 0;

        return $total > 0 ? (int) round($enrollment->completed_lessons_count / $total * 100) : 0;
    }
}
