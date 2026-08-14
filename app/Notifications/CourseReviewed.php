<?php

namespace App\Notifications;

use App\Models\Course;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/**
 * Tells an instructor the outcome of a course review (Plan §8.9).
 */
class CourseReviewed extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Course $course,
        private readonly bool $approved,
    ) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->approved
                ? "\"{$this->course->title}\" is published"
                : "Changes requested on \"{$this->course->title}\"",
            'body' => $this->approved
                ? 'Your course is live in the catalog.'
                : Str::limit($this->course->review_notes ?? 'See the review notes on your course.', 140),
            'url' => route('tutor.courses.edit', $this->course->id),
            'icon' => $this->approved ? 'award' : 'clipboard-check',
        ];
    }
}
