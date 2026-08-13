<?php

namespace App\Listeners;

use App\Events\ExperienceEarned;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class AwardExperience
{
    protected $levelingService;

    /**
     * Create the event listener.
     */
    public function __construct(\App\Services\LevelingService $levelingService)
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
