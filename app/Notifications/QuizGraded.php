<?php

namespace App\Notifications;

use App\Models\QuizAttempt;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent when an instructor finalises a quiz attempt that needed manual marks.
 */
class QuizGraded extends Notification
{
    use Queueable;

    public function __construct(private readonly QuizAttempt $attempt) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        $quiz = $this->attempt->quiz;
        $score = number_format((float) $this->attempt->score, 1);

        return [
            'title' => 'Quiz graded',
            'body' => "Your attempt on \"{$quiz->title}\" scored {$score}%.",
            'url' => route('quiz.result', $this->attempt->id),
            'icon' => 'clipboard-check',
        ];
    }
}
