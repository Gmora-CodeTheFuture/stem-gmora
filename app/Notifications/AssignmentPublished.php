<?php

namespace App\Notifications;

use App\Models\Assignment;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/** Lets enrolled students know a new course assignment is available. */
class AssignmentPublished extends Notification
{
    use Queueable;

    public function __construct(private readonly Assignment $assignment) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        $this->assignment->loadMissing('course:id,title,slug');

        $course = $this->assignment->course;
        $courseTitle = $course?->title ?? 'your course';
        $deadline = $this->assignment->deadline_at
            ? ' Due '.$this->assignment->deadline_at->timezone(config('app.timezone'))->format('M j, Y g:ia').'.'
            : '';

        $url = ($course?->slug && $this->assignment->module_id)
            ? route('learn.assignment', [$course->slug, $this->assignment->id])
            : route('assignments.show', $this->assignment->id);

        return [
            'title' => 'New assignment',
            'body' => "\"{$this->assignment->title}\" was added to {$courseTitle}.{$deadline}",
            'url' => $url,
            'icon' => 'clipboard-check',
        ];
    }
}
