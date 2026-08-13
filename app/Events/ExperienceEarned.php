<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Raised whenever a student does something worth experience points. The
 * listener applies the XP, updates the streak, and re-evaluates badges.
 */
class ExperienceEarned
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public User $user,
        public int $xpAmount,
        public string $source,
    ) {}
}
