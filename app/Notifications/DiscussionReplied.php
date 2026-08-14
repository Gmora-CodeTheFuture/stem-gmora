<?php

namespace App\Notifications;

use App\Models\Discussion;
use App\Models\DiscussionReply;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/**
 * Tells a thread author that someone answered them (Plan §9.2).
 */
class DiscussionReplied extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Discussion $discussion,
        private readonly DiscussionReply $reply,
    ) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        $author = $this->reply->author?->full_name ?? 'Someone';

        return [
            'title' => $this->reply->is_instructor_answer
                ? "Your instructor replied to \"{$this->discussion->title}\""
                : "{$author} replied to \"{$this->discussion->title}\"",
            'body' => Str::limit(strip_tags($this->reply->body), 120),
            'url' => route('discussions.show', $this->discussion->id),
            'icon' => 'message-square',
        ];
    }
}
