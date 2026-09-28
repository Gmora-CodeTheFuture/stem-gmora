<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssignmentQuestion extends Model
{
    use HasFactory, HasUuids;

    public const TYPE_MCQ = 'mcq';

    public const TYPE_SHORT_ANSWER = 'short_answer';

    public const TYPE_NORMAL = 'normal';

    protected $fillable = [
        'assignment_id', 'type', 'body', 'options', 'correct_answer',
        'points', 'order_index',
    ];

    protected $hidden = [
        'correct_answer',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'correct_answer' => 'array',
        ];
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(Assignment::class);
    }

    public function isAutoGradable(): bool
    {
        return in_array($this->type, [self::TYPE_MCQ, self::TYPE_SHORT_ANSWER], true);
    }

    /**
     * Public-safe projection. Strips the answer key and MCQ is_correct flags.
     *
     * @return array<string, mixed>
     */
    public function forStudent(bool $revealAnswers = false): array
    {
        $payload = [
            'id' => $this->id,
            'type' => $this->type,
            'body' => $this->body,
            'points' => $this->points,
            'order_index' => $this->order_index,
            'options' => collect($this->options ?? [])
                ->map(fn ($option, $index) => [
                    'index' => $index,
                    'text' => is_array($option) ? ($option['text'] ?? '') : (string) $option,
                ])
                ->values()
                ->all(),
        ];

        if ($revealAnswers) {
            $payload['correct_answer'] = $this->correct_answer;
        }

        return $payload;
    }
}
