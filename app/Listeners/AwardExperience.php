<?php

namespace App\Listeners;

use App\Events\ExperienceEarned;
use App\Services\LevelingService;

class AwardExperience
{
    protected $levelingService;

    /**
     * Create the event listener.
     */
    public function __construct(LevelingService $levelingService)
    {
        $this->levelingService = $levelingService;
    }

    /**
     * Handle the event.
     */
    public function handle(ExperienceEarned $event): void
    {
        $this->levelingService->addExperience($event->user, $event->xpAmount, $event->source);
    }
}
