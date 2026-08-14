<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Discussion;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Services\ContentVersion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Global search (Plan §4.13).
 *
 * Backed by the database rather than Meilisearch — the index is small and this
 * keeps the deployment to one moving part. `whereLike` resolves to ILIKE on
 * PostgreSQL, so matching is case-insensitive on every driver.
 *
 * Results are scoped, not just ranked: the catalog is public, but lessons and
 * discussion threads only surface for courses the searcher is enrolled in, and
 * no lesson result ever carries `content_ref`.
 */
class SearchController extends Controller
{
    private const PER_TYPE = 8;

    public function index(Request $request): Response
    {
        $query = trim($request->string('q')->toString());
        $user = $request->user();

        if (mb_strlen($query) < 2) {
            return Inertia::render('Dashboard/Search', [
                'query' => $query,
                'results' => ['courses' => [], 'lessons' => [], 'discussions' => []],
                'total' => 0,
            ]);
        }

        $key = 'search:'.$user->id.':'.ContentVersion::current().':'.md5(mb_strtolower($query));

        $results = Cache::remember($key, now()->addMinutes(5), function () use ($query, $user) {
            $courseIds = Enrollment::where('user_id', $user->id)
                ->whereIn('status', [Enrollment::STATUS_ACTIVE, Enrollment::STATUS_COMPLETED])
                ->pluck('course_id')
                ->all();

            return [
                'courses' => $this->courses($query, $courseIds),
                'lessons' => $this->lessons($query, $courseIds),
                'discussions' => $this->discussions($query, $courseIds),
            ];
        });

        return Inertia::render('Dashboard/Search', [
            'query' => $query,
            'results' => $results,
            'total' => count($results['courses']) + count($results['lessons']) + count($results['discussions']),
        ]);
    }

    /** The published catalog is searchable by everyone. */
    private function courses(string $query, array $enrolledIds): array
    {
        return Course::published()
            ->where(fn ($q) => $q
                ->whereLike('title', "%{$query}%")
                ->orWhereLike('subtitle', "%{$query}%")
                ->orWhereLike('category', "%{$query}%"))
            ->orderByDesc('total_enrollments')
            ->limit(self::PER_TYPE)
            ->get(['id', 'title', 'slug', 'subtitle', 'category', 'total_lessons'])
            ->map(fn (Course $course) => [
                'id' => $course->id,
                'title' => $course->title,
                'subtitle' => $course->subtitle,
                'category' => $course->category,
                'slug' => $course->slug,
                'is_enrolled' => in_array($course->id, $enrolledIds, true),
            ])
            ->all();
    }

    /**
     * Lessons are course content, so they only appear for enrolled learners —
     * and the projection deliberately excludes `content_ref` (Plan §5.1).
     */
    private function lessons(string $query, array $enrolledIds): array
    {
        if ($enrolledIds === []) {
            return [];
        }

        return Lesson::query()
            ->where('is_published', true)
            ->whereHas('module', fn ($q) => $q->whereIn('course_id', $enrolledIds)->where('is_published', true))
            ->where(fn ($q) => $q
                ->whereLike('title', "%{$query}%")
                ->orWhereLike('description', "%{$query}%"))
            ->with('module.course:id,title,slug')
            ->limit(self::PER_TYPE)
            ->get(['id', 'module_id', 'title', 'description', 'type', 'duration_seconds'])
            ->map(fn (Lesson $lesson) => [
                'id' => $lesson->id,
                'title' => $lesson->title,
                'type' => $lesson->type,
                'course_title' => $lesson->module?->course?->title,
                'course_slug' => $lesson->module?->course?->slug,
            ])
            ->all();
    }

    /** Threads from boards the searcher can actually open. */
    private function discussions(string $query, array $enrolledIds): array
    {
        if ($enrolledIds === []) {
            return [];
        }

        return Discussion::whereIn('course_id', $enrolledIds)
            ->where(fn ($q) => $q
                ->whereLike('title', "%{$query}%")
                ->orWhereLike('body', "%{$query}%"))
            ->with(['course:id,title,slug', 'author:id,full_name'])
            ->orderByDesc('last_activity_at')
            ->limit(self::PER_TYPE)
            ->get()
            ->map(fn (Discussion $discussion) => [
                'id' => $discussion->id,
                'title' => $discussion->title,
                'excerpt' => str($discussion->body)->limit(120)->toString(),
                'course_title' => $discussion->course?->title,
                'replies_count' => $discussion->replies_count,
                'is_solved' => $discussion->isSolved(),
                'author' => $discussion->author?->full_name,
            ])
            ->all();
    }
}
