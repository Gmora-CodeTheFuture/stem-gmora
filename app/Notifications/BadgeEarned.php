<?php

namespace App\Notifications;

use App\Models\Badge;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class BadgeEarned extends Notification
{
    use Queueable;

    public function __construct(private readonly Badge $badge) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => "Badge earned: {$this->badge->name}",
            'body' => $this->badge->description,
            'url' => route('dashboard'),
            'icon' => 'award',
        ];
    }
}
