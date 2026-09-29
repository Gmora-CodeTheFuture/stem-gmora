<?php

namespace App\Notifications;

use App\Models\Submission;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent when an instructor records a grade (Plan §9.2). Database channel only
 * for now; the mail channel arrives with the notifications milestone.
 */
class SubmissionGraded extends Notification
{
    use Queueable;

    public function __construct(private readonly Submission $submission) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        $assignment = $this->submission->assignment;
        $assignment?->loadMissing('course:id,title,slug');
        $course = $assignment?->course;

        $url = ($course?->slug && $assignment?->module_id)
            ? route('learn.assignment', [$course->slug, $assignment->id])
            : route('assignments.show', $assignment->id);

        return [
            'title' => $this->submission->status === 'returned'
                ? 'Assignment returned for changes'
                : 'Assignment graded',
            'body' => $this->submission->status === 'returned'
                ? "Your instructor asked for changes on \"{$assignment->title}\"."
                : "You scored {$this->submission->marks_awarded}/{$assignment->max_marks} on \"{$assignment->title}\".",
            'url' => $url,
            'icon' => 'clipboard-check',
        ];
    }
}
