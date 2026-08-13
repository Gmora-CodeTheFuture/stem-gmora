<?php

namespace App\Services;

use App\Models\Badge;
use App\Models\User;
use App\Models\UserStat;
use Illuminate\Support\Carbon;

/**
 * Applies experience points, maintains the learning streak, and keeps the
 * derived level in sync.
 *
 * This is the single writer of `user_stats`, so the level, XP and streak shown
 * on the dashboard all come from one place.
 */
class LevelingService
{
    public function __construct(private readonly BadgeService $badges) {}

    /**
     * @return array{xp_added: int, leveled_up: bool, new_level: int, badges: array<int, Badge>}
     */
    public function addExperience(User $user, int $xpAmount, string $source): array
    {
        /** @var UserStat $stat */
        $stat = $user->stat()->firstOrCreate(['user_id' => $user->id]);

        $oldLevel = (int) $stat->level;
        $stat->xp = (int) $stat->xp + $xpAmount;
        $stat->level = $this->levelFor($stat->xp);

        $this->touchStreak($stat);

        $stat->save();

        // Badge criteria read level and streak, so evaluate after the save.
        $awarded = $this->badges->evaluate($user->fresh() ?? $user);

        return [
            'xp_added' => $xpAmount,
            'leveled_up' => $stat->level > $oldLevel,
            'new_level' => (int) $stat->level,
            'badges' => $awarded,
        ];
    }

    /** level = floor(sqrt(xp / step)) + 1 */
    public function levelFor(int $xp): int
    {
        $step = max((int) config('gamification.level_step', 100), 1);

        return (int) floor(sqrt(max($xp, 0) / $step)) + 1;
    }

    /** XP still needed to reach the next level. */
    public function xpToNextLevel(int $xp): int
    {
        $step = max((int) config('gamification.level_step', 100), 1);
        $nextLevel = $this->levelFor($xp) + 1;

        return (int) max((($nextLevel - 1) ** 2) * $step - $xp, 0);
    }

    /**
     * Extend the streak when activity lands on the next calendar day, reset it
     * when a day was missed, and leave it alone for same-day activity.
     */
    private function touchStreak(UserStat $stat): void
    {
        $today = Carbon::today();
        $last = $stat->last_activity_date ? Carbon::parse($stat->last_activity_date)->startOfDay() : null;

        if ($last === null) {
            $stat->current_streak = 1;
        } else {
            $gap = (int) $last->diffInDays($today);

            if ($gap === 1) {
                $stat->current_streak = (int) $stat->current_streak + 1;
            } elseif ($gap > 1) {
                $stat->current_streak = 1;
            } elseif ((int) $stat->current_streak === 0) {
                // Same day, but the row had never recorded a streak before.
                $stat->current_streak = 1;
            }
        }

        $stat->longest_streak = max((int) $stat->longest_streak, (int) $stat->current_streak);
        $stat->last_activity_date = $today;
    }
}
