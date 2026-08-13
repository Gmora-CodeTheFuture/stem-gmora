<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class QuizAttempt extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id', 'quiz_id', 'answers', 'score',
        'points_earned', 'points_possible', 'status',
        'started_at', 'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'answers' => 'array',
            'score' => 'decimal:2',
            'started_at' => 'datetime',
            'submitted_at' => 'datetime',
        ];
    }

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_GRADED = 'graded';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    public function isInProgress(): bool
    {
        return $this->status === self::STATUS_IN_PROGRESS;
    }

    /**
     * A timed quiz's deadline, or null when the quiz is untimed.
     */
    public function deadline(): ?Carbon
    {
        $limit = $this->quiz->time_limit_seconds;

        return $limit ? $this->started_at->copy()->addSeconds($limit) : null;
    }

    public function hasExpired(): bool
    {
        return $this->deadline()?->isPast() ?? false;
    }
}
