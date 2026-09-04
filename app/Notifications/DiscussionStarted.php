<?php

namespace App\Notifications;

use App\Models\Discussion;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/** Tells course staff a new discussion thread was opened. */
class DiscussionStarted extends Notification
{
    use Queueable;

    public function __construct(private readonly Discussion $discussion) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        $author = $this->discussion->author?->full_name ?? 'A student';

        return [
            'title' => 'New discussion',
            'body' => "{$author} started \"{$this->discussion->title}\"",
            'url' => route('discussions.show', $this->discussion->id),
            'icon' => 'message-square',
        ];
    }
}
