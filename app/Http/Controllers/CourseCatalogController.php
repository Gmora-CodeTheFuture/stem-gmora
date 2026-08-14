<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public course catalog. Everything here is reachable by a visitor, so no
 * response may carry a lesson's `content_ref` — lessons are projected down to
 * a `has_video` flag (Plan §5.1).
 */
class CourseCatalogController extends Controller
{
    public function index(Request $request): Response
    {
        $courses = Course::query()
            ->published()
            ->with('instructor:id,full_name,avatar_url')
            ->when($request->string('search')->toString(), function ($query, string $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereLike('title', "%{$search}%")
                        ->orWhereLike('subtitle', "%{$search}%")
                        ->orWhereLike('description', "%{$search}%");
                });
            })
            ->when($request->string('category')->toString(), fn ($q, $c) => $q->where('category', $c))
            ->when($request->string('difficulty')->toString(), fn ($q, $d) => $q->where('difficulty', $d))
            ->orderByDesc('total_enrollments')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Marketing/Courses', [
            'courses' => $courses,
            'categories' => Course::published()->distinct()->orderBy('category')->pluck('category'),
            'filters' => $request->only('search', 'category', 'difficulty'),
        ]);
    }

    public function show(Request $request, string $slug): Response
    {
        $course = Course::query()
            ->published()
            ->where('slug', $slug)
            ->with([
                'instructor:id,full_name,avatar_url,bio',
                'modules' => fn ($q) => $q->where('is_published', true),
                'modules.lessons' => fn ($q) => $q->where('is_published', true),
                'modules.lessons.liveSession',
            ])
            ->firstOrFail();

        $user = $request->user();

        $enrollment = $user
            ? Enrollment::where('user_id', $user->id)->where('course_id', $course->id)->first()
            : null;

        return Inertia::render('Marketing/CourseDetail', [
            'course' => $this->presentCourse($course),
            'enrollment' => $enrollment,
        ]);
    }

    /**
     * Project the course into a public-safe shape. `content_ref` is already in
     * the Lesson model's $hidden array; this is the defense-in-depth second
     * pass required by Plan §6.1.3.
     */
    private function presentCourse(Course $course): array
    {
        return [
            ...$course->only([
                'id', 'title', 'slug', 'subtitle', 'description', 'category',
                'difficulty', 'language', 'price', 'currency', 'thumbnail_url',
                'preview_video_url', 'duration_minutes', 'total_lessons',
                'total_enrollments', 'average_rating',
            ]),
            'instructor' => $course->instructor?->only(['id', 'full_name', 'avatar_url', 'bio']),
            'modules' => $course->modules->map(fn ($module) => [
                ...$module->only(['id', 'title', 'description', 'order_index']),
                'lessons' => $module->lessons->map(fn ($lesson) => [
                    ...$lesson->only(['id', 'title', 'type', 'order_index', 'duration_seconds', 'is_free_preview']),
                    'has_video' => $lesson->isVideo() && $lesson->content_ref !== null,
                    'live_session' => $lesson->liveSession?->only(['id', 'scheduled_start', 'duration_minutes']),
                ]),
            ]),
        ];
    }
}
