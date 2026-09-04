<?php

namespace App\Notifications;

use App\Models\SupportTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/** Alerts staff when a learner opens a support ticket. */
class SupportTicketCreated extends Notification
{
    use Queueable;

    public function __construct(private readonly SupportTicket $ticket) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'New support ticket',
            'body' => Str::limit($this->ticket->subject, 120),
            'url' => route('support.show', $this->ticket->id),
            'icon' => 'life-buoy',
        ];
    }
}
