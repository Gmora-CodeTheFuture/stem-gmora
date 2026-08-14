<?php

namespace App\Models;

use App\Models\Concerns\BumpsContentVersion;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Progress extends Model
{
    use BumpsContentVersion, HasFactory, HasUuids;

    protected $table = 'progress';

    protected $fillable = [
        'enrollment_id', 'lesson_id', 'status', 'watch_percentage', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'watch_percentage' => 'decimal:2',
            'completed_at' => 'datetime',
        ];
    }

    public const STATUS_NOT_STARTED = 'not_started';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_COMPLETED = 'completed';

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }
}
