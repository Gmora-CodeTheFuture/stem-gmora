<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Question extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'quiz_id', 'type', 'body', 'options', 'correct_answer',
        'points', 'order_index', 'explanation',
    ];

    /**
     * The answer key never leaves the server while an attempt is live.
     * `options` still carries `is_correct` flags for MCQ, so questions are
     * additionally projected through Question::forStudent() before they are
     * sent to a client.
     */
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

    public const TYPE_MCQ = 'mcq';

    public const TYPE_TRUE_FALSE = 'true_false';

    public const TYPE_FILL_BLANK = 'fill_blank';

    public const TYPE_CODE = 'code';

    public const TYPE_MATCHING = 'matching';

    public const TYPE_ORDERING = 'ordering';

    public const TYPE_ESSAY = 'essay';

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    /** Auto-gradable types; the rest go to an instructor. */
    public function isAutoGradable(): bool
    {
        return ! in_array($this->type, [self::TYPE_ESSAY, self::TYPE_CODE], true);
    }

    /**
     * Public-safe projection. Strips the answer key and the `is_correct`
     * flags baked into MCQ options; the explanation is only attached once
     * the attempt has been graded.
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
            $payload['explanation'] = $this->explanation;
        }

        return $payload;
    }
}
