<?php

namespace App\Notifications;

use App\Models\SupportTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SupportTicketReplied extends Notification
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
            'title' => "Support replied to {$this->ticket->reference}",
            'body' => $this->ticket->subject,
            'url' => route('support.show', $this->ticket->id),
            'icon' => 'message-square',
        ];
    }
}
