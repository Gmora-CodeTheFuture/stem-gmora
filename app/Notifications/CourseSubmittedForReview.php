<?php

namespace App\Notifications;

use App\Models\Course;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/** Fired when an author submits a course into the review queue. */
class CourseSubmittedForReview extends Notification
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
            'title' => 'Course awaiting review',
            'body' => "\"{$this->course->title}\" was submitted for approval.",
            'url' => route('admin.approvals.index'),
            'icon' => 'clipboard-check',
        ];
    }
}
