<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\Certificate;
use App\Models\Enrollment;
use App\Models\Event;
use App\Models\LiveSession;
use App\Models\Progress;
use App\Models\Submission;
use App\Services\LevelingService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The student home: a real summary of their own work — no placeholder figures.
 * Every number below is derived from the student's own rows.
 */
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

        $enrollmentIds = $enrollments->pluck('id');
        $courseIds = $enrollments->pluck('course_id');

        $totalLessons = $enrollments->sum(fn ($e) => $e->course?->total_lessons ?? 0);
        $completedLessons = $enrollments->sum('completed_lessons_count');

        $userStat = $user->stat()->first();
        $leveling = app(LevelingService::class);

        return Inertia::render('Dashboard', [
            'stats' => [
                'courses' => $enrollments->count(),
                'lessons_completed' => $completedLessons,
                'certificates' => Certificate::where('user_id', $user->id)->count(),
                'submissions' => Submission::where('user_id', $user->id)->count(),
                'hours_learned' => round($enrollments->sum(
                    fn ($e) => ($e->course?->duration_minutes ?? 0) * $this->ratio($e)
                ) / 60, 1),
                'progress_percentage' => $totalLessons > 0
                    ? (int) round($completedLessons / $totalLessons * 100)
                    : 0,
                'level' => (int) ($userStat?->level ?? 1),
                'xp' => (int) ($userStat?->xp ?? 0),
                'xp_to_next_level' => $leveling->xpToNextLevel((int) ($userStat?->xp ?? 0)),
            ],
            'streak' => [
                'current' => (int) ($userStat?->current_streak ?? 0),
                'longest' => (int) ($userStat?->longest_streak ?? 0),
            ],
            'badges' => $user->badges()->orderByPivot('earned_at', 'desc')->get()
                ->map(fn ($badge) => [
                    'id' => $badge->id,
                    'name' => $badge->name,
                    'description' => $badge->description,
                    'earned_at' => $badge->pivot->earned_at,
                ])->values(),
            'activity' => $this->activity($enrollmentIds),
            'enrollments' => $enrollments->map(fn ($e) => [
                'id' => $e->id,
                'course' => $e->course,
                'status' => $e->status,
                'completed_lessons_count' => $e->completed_lessons_count,
                'percentage' => (int) round($this->ratio($e) * 100),
            ])->sortByDesc('percentage')->values(),
            'resume' => $this->resume($enrollmentIds),
            'upcoming' => $this->upcoming($courseIds->all()),
            'dueSoon' => $this->dueSoon($courseIds, $user->id),
            'certificates' => Certificate::where('user_id', $user->id)
                ->with('course:id,title,slug')
                ->latest('issued_at')
                ->take(3)
                ->get(),
        ]);
    }

    /**
     * Lessons completed per day over the last 28 days, for the activity grid.
     *
     * @return array<int, array{date: string, count: int}>
     */
    private function activity(Collection $enrollmentIds): array
    {
        $counts = Progress::whereIn('enrollment_id', $enrollmentIds)
            ->where('status', Progress::STATUS_COMPLETED)
            ->where('completed_at', '>=', now()->subDays(27)->startOfDay())
            ->pluck('completed_at')
            ->groupBy(fn ($date) => Carbon::parse($date)->toDateString())
            ->map->count();

        return collect(range(27, 0))
            ->map(function (int $daysAgo) use ($counts) {
                $date = now()->subDays($daysAgo)->toDateString();

                return ['date' => $date, 'count' => $counts->get($date, 0)];
            })
            ->all();
    }

    /** @return array<string, mixed>|null */
    private function resume(Collection $enrollmentIds): ?array
    {
        $progress = Progress::whereIn('enrollment_id', $enrollmentIds)
            ->where('status', '!=', Progress::STATUS_COMPLETED)
            ->with(['lesson:id,module_id,title,type', 'enrollment.course:id,title,slug,thumbnail_url'])
            ->latest('updated_at')
            ->first();

        if (! $progress) {
            return null;
        }

        return [
            'lesson_id' => $progress->lesson_id,
            'lesson_title' => $progress->lesson?->title,
            'course_title' => $progress->enrollment?->course?->title,
            'course_slug' => $progress->enrollment?->course?->slug,
            'thumbnail_url' => $progress->enrollment?->course?->thumbnail_url,
            'watch_percentage' => (float) $progress->watch_percentage,
            'updated_at' => $progress->updated_at->toIso8601String(),
        ];
    }

    /**
     * The next few calendar items — staff events and scheduled live classes.
     *
     * @return array<int, array<string, mixed>>
     */
    private function upcoming(array $courseIds): array
    {
        $events = Event::visibleTo($courseIds)
            ->where('starts_at', '>=', now())
            ->with('course:id,title')
            ->orderBy('starts_at')
            ->take(4)
            ->get()
            ->map(fn (Event $event) => [
                'id' => $event->id,
                'title' => $event->title,
                'type' => $event->type,
                'starts_at' => $event->starts_at->toIso8601String(),
                'course_title' => $event->course?->title,
            ]);

        $sessions = $courseIds === [] ? collect() : LiveSession::where('scheduled_start', '>=', now())
            ->whereHas('lesson.module', fn ($q) => $q->whereIn('course_id', $courseIds))
            ->with('lesson.module.course:id,title')
            ->orderBy('scheduled_start')
            ->take(4)
            ->get()
            ->map(fn (LiveSession $session) => [
                'id' => $session->id,
                'title' => $session->title,
                'type' => Event::TYPE_CLASS,
                'starts_at' => $session->scheduled_start->toIso8601String(),
                'course_title' => $session->lesson?->module?->course?->title,
            ]);

        return $events->concat($sessions)->sortBy('starts_at')->take(4)->values()->all();
    }

    /**
     * Published assignments still open, that this student has not submitted.
     *
     * @return array<int, array<string, mixed>>
     */
    private function dueSoon(Collection $courseIds, string $userId): array
    {
        return Assignment::whereIn('course_id', $courseIds)
            ->where('is_published', true)
            ->whereNotNull('deadline_at')
            ->where('deadline_at', '>=', now())
            ->whereDoesntHave('submissions', fn ($q) => $q->where('user_id', $userId))
            ->with('course:id,title')
            ->orderBy('deadline_at')
            ->take(3)
            ->get()
            ->map(fn (Assignment $assignment) => [
                'id' => $assignment->id,
                'title' => $assignment->title,
                'deadline_at' => $assignment->deadline_at->toIso8601String(),
                'course_title' => $assignment->course?->title,
            ])
            ->all();
    }

    private function ratio(Enrollment $enrollment): float
    {
        $total = $enrollment->course?->total_lessons ?? 0;

        return $total > 0 ? min($enrollment->completed_lessons_count / $total, 1) : 0;
    }
}
