<?php

namespace App\Notifications;

use App\Models\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/** Lets enrolled students know a course calendar event was published. */
class CalendarEventPublished extends Notification
{
    use Queueable;

    public function __construct(private readonly Event $event) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'New calendar event',
            'body' => $this->event->title,
            'url' => route('dashboard.calendar'),
            'icon' => 'calendar',
        ];
    }
}
