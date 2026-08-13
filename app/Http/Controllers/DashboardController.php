<?php

namespace App\Http\Controllers;

use App\Models\Certificate;
use App\Models\Enrollment;
use App\Models\LiveSession;
use App\Models\Progress;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $enrollments = Enrollment::query()
            ->where('user_id', $user->id)
            ->whereIn('status', [Enrollment::STATUS_ACTIVE, Enrollment::STATUS_COMPLETED])
            ->with('course:id,title,slug,thumbnail_url,category,total_lessons,duration_minutes')
            ->withCount([
                'progress as completed_lessons_count' => fn ($q) => $q->where('status', Progress::STATUS_COMPLETED),
            ])
            ->get();

        $totalLessons = $enrollments->sum(fn ($e) => $e->course?->total_lessons ?? 0);
        $completedLessons = $enrollments->sum('completed_lessons_count');

        // Resume point: the most recently touched in-progress lesson.
        $resume = Progress::query()
            ->whereIn('enrollment_id', $enrollments->pluck('id'))
            ->where('status', '!=', Progress::STATUS_COMPLETED)
            ->with(['lesson:id,module_id,title,type', 'enrollment.course:id,title,slug'])
            ->latest('updated_at')
            ->first();

        $nextLive = LiveSession::query()
            ->where('scheduled_start', '>=', now())
            ->whereHas('lesson.module', fn ($q) => $q->whereIn(
                'course_id', $enrollments->pluck('course_id')
            ))
            ->orderBy('scheduled_start')
            ->first();

        return Inertia::render('Dashboard', [
            'stats' => [
                'enrolled_courses' => $enrollments->count(),
                'hours_learned' => round($enrollments->sum(
                    fn ($e) => ($e->course?->duration_minutes ?? 0) * $this->ratio($e)
                ) / 60, 1),
                'certificates' => Certificate::where('user_id', $user->id)->count(),
                'progress_percentage' => $totalLessons > 0
                    ? round($completedLessons / $totalLessons * 100)
                    : 0,
            ],
            'enrollments' => $enrollments->map(fn ($e) => [
                'id' => $e->id,
                'course' => $e->course,
                'status' => $e->status,
                'completed_lessons_count' => $e->completed_lessons_count,
                'percentage' => round($this->ratio($e) * 100),
            ])->values(),
            'resume' => $resume ? [
                'lesson_id' => $resume->lesson_id,
                'lesson_title' => $resume->lesson?->title,
                'course_title' => $resume->enrollment?->course?->title,
                'course_slug' => $resume->enrollment?->course?->slug,
                'watch_percentage' => (float) $resume->watch_percentage,
            ] : null,
            'nextLive' => $nextLive?->only(['id', 'title', 'scheduled_start', 'duration_minutes']),
            'certificates' => Certificate::where('user_id', $user->id)
                ->with('course:id,title,slug')
                ->latest('issued_at')
                ->take(3)
                ->get(),
        ]);
    }

    private function ratio(Enrollment $enrollment): float
    {
        $total = $enrollment->course?->total_lessons ?? 0;

        return $total > 0 ? min($enrollment->completed_lessons_count / $total, 1) : 0;
    }
}
