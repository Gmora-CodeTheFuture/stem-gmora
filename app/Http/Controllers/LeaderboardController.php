<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Progress;
use App\Models\UserStat;
use App\Services\ContentVersion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Leaderboards built from real activity (Plan §4.12) — XP earned, current
 * streak, and per-course progress.
 *
 * Privacy comes first: a meaningful share of the audience is under 18
 * (Plan §1.4), so only learners who have made their profile public are named.
 * Everyone else still occupies their rank, shown as "Private learner", which
 * keeps the standings honest without exposing anyone.
 */
class LeaderboardController extends Controller
{
    private const SIZE = 25;

    public function index(Request $request): Response
    {
        $user = $request->user();
        $board = $request->string('board')->toString() ?: 'xp';
        $board = in_array($board, ['xp', 'streak', 'course'], true) ? $board : 'xp';
        $courseId = $request->string('course')->toString();

        // The learner's course list is stable between content changes.
        $courses = collect(Cache::remember(
            "leaderboard:courses:{$user->id}:".ContentVersion::current(),
            now()->addMinutes(10),
            fn () => Enrollment::where('user_id', $user->id)
                ->whereIn('status', [Enrollment::STATUS_ACTIVE, Enrollment::STATUS_COMPLETED])
                ->with('course:id,title,slug')
                ->get()
                ->map(fn (Enrollment $e) => $e->course?->only(['id', 'title', 'slug']))
                ->filter()
                ->values()
                ->all(),
        ));

        if ($board === 'course' && $courseId === '') {
            $courseId = (string) ($courses->first()['id'] ?? '');
        }

        $key = "leaderboard:{$board}:{$courseId}:".ContentVersion::current();

        $rows = Cache::remember($key, now()->addMinutes(10), fn () => match ($board) {
            'streak' => $this->byStreak(),
            'course' => $courseId ? $this->byCourse($courseId) : [],
            default => $this->byExperience(),
        });

        return Inertia::render('Dashboard/Leaderboard', [
            'board' => $board,
            'rows' => $this->present($rows, $user->id),
            'you' => $this->standing($rows, $user->id),
            'courses' => $courses->all(),
            'selectedCourse' => $courseId,
        ]);
    }

    /**
     * Total XP earned. One query joining stats to users.
     *
     * @return array<int, array<string, mixed>>
     */
    private function byExperience(): array
    {
        return UserStat::query()
            ->join('users', 'users.id', '=', 'user_stats.user_id')
            ->whereNull('users.deleted_at')
            ->where('user_stats.xp', '>', 0)
            ->orderByDesc('user_stats.xp')
            ->limit(self::SIZE)
            ->get([
                'users.id as user_id',
                'users.full_name',
                'users.is_public',
                'user_stats.xp as score',
                'user_stats.level',
            ])
            ->map(fn ($row) => [
                'user_id' => $row->user_id,
                'full_name' => $row->full_name,
                'is_public' => (bool) $row->is_public,
                'score' => (int) $row->score,
                'caption' => 'Level '.$row->level,
            ])
            ->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function byStreak(): array
    {
        return UserStat::query()
            ->join('users', 'users.id', '=', 'user_stats.user_id')
            ->whereNull('users.deleted_at')
            ->where('user_stats.current_streak', '>', 0)
            ->orderByDesc('user_stats.current_streak')
            ->orderByDesc('user_stats.longest_streak')
            ->limit(self::SIZE)
            ->get([
                'users.id as user_id',
                'users.full_name',
                'users.is_public',
                'user_stats.current_streak as score',
                'user_stats.longest_streak',
            ])
            ->map(fn ($row) => [
                'user_id' => $row->user_id,
                'full_name' => $row->full_name,
                'is_public' => (bool) $row->is_public,
                'score' => (int) $row->score,
                'caption' => 'Longest '.$row->longest_streak,
            ])
            ->all();
    }

    /**
     * Lessons completed within one course.
     *
     * @return array<int, array<string, mixed>>
     */
    private function byCourse(string $courseId): array
    {
        $total = Course::whereKey($courseId)->value('total_lessons') ?: 0;

        return Enrollment::query()
            ->join('users', 'users.id', '=', 'enrollments.user_id')
            ->leftJoin('progress', function ($join) {
                $join->on('progress.enrollment_id', '=', 'enrollments.id')
                    ->where('progress.status', '=', Progress::STATUS_COMPLETED);
            })
            ->where('enrollments.course_id', $courseId)
            ->whereNull('enrollments.deleted_at')
            ->whereNull('users.deleted_at')
            ->groupBy('users.id', 'users.full_name', 'users.is_public')
            ->orderByDesc(DB::raw('count(progress.id)'))
            ->limit(self::SIZE)
            ->get([
                'users.id as user_id',
                'users.full_name',
                'users.is_public',
                DB::raw('count(progress.id) as score'),
            ])
            ->map(fn ($row) => [
                'user_id' => $row->user_id,
                'full_name' => $row->full_name,
                'is_public' => (bool) $row->is_public,
                'score' => (int) $row->score,
                'caption' => $total > 0 ? "of {$total} lessons" : 'lessons',
            ])
            ->all();
    }

    /**
     * Names are only revealed for public profiles; everyone else keeps their
     * rank without their identity.
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     */
    private function present(array $rows, string $currentUserId): array
    {
        return collect($rows)->values()->map(function (array $row, int $index) use ($currentUserId) {
            $isSelf = $row['user_id'] === $currentUserId;
            $visible = $row['is_public'] || $isSelf;

            return [
                'rank' => $index + 1,
                'user_id' => $visible ? $row['user_id'] : null,
                'name' => $visible ? $row['full_name'] : 'Private learner',
                'score' => $row['score'],
                'caption' => $row['caption'],
                'is_you' => $isSelf,
            ];
        })->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<string, mixed>|null
     */
    private function standing(array $rows, string $currentUserId): ?array
    {
        foreach (array_values($rows) as $index => $row) {
            if ($row['user_id'] === $currentUserId) {
                return ['rank' => $index + 1, 'score' => $row['score']];
            }
        }

        return null;
    }
}
