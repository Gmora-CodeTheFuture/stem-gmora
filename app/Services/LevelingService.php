<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserStat;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class LevelingService
{
    /**
     * Add XP to a user and handle leveling up and streaks.
     *
     * @param User $user
     * @param int $xpAmount
     * @param string $source (e.g., 'quiz_completed', 'video_watched')
     * @return array ['xp_added' => int, 'leveled_up' => bool, 'new_level' => int]
     */
    public function addExperience(User $user, int $xpAmount, string $source): array
    {
        $stat = $user->stat()->firstOrCreate([
            'user_id' => $user->id
        ]);

        $leveledUp = false;
        $oldLevel = $stat->level;
        
        $stat->xp += $xpAmount;

        // Calculate new level (simple formula: level = floor(sqrt(xp / 100)) + 1)
        // E.g., 0 XP = Level 1, 100 XP = Level 2, 400 XP = Level 3, 900 XP = Level 4
        $newLevel = (int) floor(sqrt($stat->xp / 100)) + 1;

        if ($newLevel > $oldLevel) {
            $stat->level = $newLevel;
            $leveledUp = true;
            
            // TODO: In the future, we can dispatch a LevelUp event here
            // to trigger badge awarding or notifications.
        }

        // Handle streaks
        $today = Carbon::today();
        
        if (!$stat->last_activity_date) {
            // First time activity
            $stat->current_streak = 1;
            $stat->longest_streak = 1;
        } else {
            $lastActivity = Carbon::parse($stat->last_activity_date)->startOfDay();
            
            if ($lastActivity->diffInDays($today) == 1) {
                // Consecutive day
                $stat->current_streak += 1;
                if ($stat->current_streak > $stat->longest_streak) {
                    $stat->longest_streak = $stat->current_streak;
                }
            } elseif ($lastActivity->diffInDays($today) > 1) {
                // Streak broken
                $stat->current_streak = 1;
            }
            // If diff is 0 (same day), do nothing to the streak
        }
        
        $stat->last_activity_date = $today;
        $stat->save();

        Log::info("User {$user->id} earned {$xpAmount} XP from {$source}. Total XP: {$stat->xp}, Level: {$stat->level}");

        return [
            'xp_added' => $xpAmount,
            'leveled_up' => $leveledUp,
            'new_level' => $stat->level
        ];
    }
}
