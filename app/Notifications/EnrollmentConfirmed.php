<?php

namespace App\Notifications;

use App\Models\Course;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/** Confirms a free enrollment to the student. */
class EnrollmentConfirmed extends Notification
{
    use Queueable;

    public function __construct(private readonly Course $course) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => "You're enrolled",
            'body' => "Welcome to \"{$this->course->title}\". Open the course to start learning.",
            'url' => route('learn.show', $this->course->slug),
            'icon' => 'book-open',
        ];
    }
}
