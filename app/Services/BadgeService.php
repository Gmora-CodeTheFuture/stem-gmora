<?php

namespace App\Services;

use App\Models\Badge;
use App\Models\Certificate;
use App\Models\Enrollment;
use App\Models\Progress;
use App\Models\User;
use App\Notifications\BadgeEarned;
use Illuminate\Support\Str;

/**
 * Evaluates badge criteria against a user's real record and awards anything
 * newly qualified for. Called after every XP event, so a badge is granted the
 * moment the work that earns it is done.
 *
 * Criteria are stored as JSON on the badge, e.g.
 *   {"metric": "level", "threshold": 5}
 *   {"metric": "streak", "threshold": 7}
 *   {"metric": "courses_completed", "threshold": 1}
 *   {"metric": "lessons_completed", "threshold": 50}
 *   {"metric": "certificates", "threshold": 3}
 */
class BadgeService
{
    public const METRICS = ['level', 'streak', 'courses_completed', 'lessons_completed', 'certificates'];

    /**
     * @return array<int, Badge> newly awarded badges
     */
    public function evaluate(User $user): array
    {
        $badges = Badge::whereNotNull('criteria')->get();

        if ($badges->isEmpty()) {
            return [];
        }

        $held = $user->badges()->pluck('badges.id')->all();
        $measurements = $this->measure($user);
        $awarded = [];

        foreach ($badges as $badge) {
            if (in_array($badge->id, $held, true)) {
                continue;
            }

            $metric = $badge->criteria['metric'] ?? null;
            $threshold = (int) ($badge->criteria['threshold'] ?? 0);

            if (! $metric || ! array_key_exists($metric, $measurements)) {
                continue;
            }

            if ($measurements[$metric] >= $threshold) {
                $user->badges()->attach($badge->id, ['earned_at' => now(), 'id' => (string) Str::uuid()]);
                $user->notify(new BadgeEarned($badge));

                $awarded[] = $badge;
            }
        }

        return $awarded;
    }

    /**
     * Everything a badge can be measured against, read from the user's rows.
     *
     * @return array<string, int>
     */
    private function measure(User $user): array
    {
        $stat = $user->stat;

        $enrollmentIds = Enrollment::where('user_id', $user->id)->pluck('id');

        return [
            'level' => (int) ($stat?->level ?? 1),
            'streak' => (int) ($stat?->current_streak ?? 0),
            'courses_completed' => Enrollment::where('user_id', $user->id)
                ->where('status', Enrollment::STATUS_COMPLETED)
                ->count(),
            'lessons_completed' => Progress::whereIn('enrollment_id', $enrollmentIds)
                ->where('status', Progress::STATUS_COMPLETED)
                ->count(),
            'certificates' => Certificate::where('user_id', $user->id)->count(),
        ];
    }
}
