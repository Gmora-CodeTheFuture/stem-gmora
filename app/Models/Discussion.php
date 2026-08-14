<?php

namespace App\Models;

use App\Models\Concerns\BumpsContentVersion;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Discussion extends Model
{
    use BumpsContentVersion, HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'course_id', 'lesson_id', 'user_id', 'title', 'body',
        'is_pinned', 'solved_reply_id', 'replies_count', 'last_activity_at',
    ];

    protected function casts(): array
    {
        return [
            'is_pinned' => 'boolean',
            'last_activity_at' => 'datetime',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(DiscussionReply::class);
    }

    public function isSolved(): bool
    {
        return $this->solved_reply_id !== null;
    }

    /** Keep the counter and board ordering in step with reality. */
    public function syncActivity(): void
    {
        $this->forceFill([
            'replies_count' => $this->replies()->count(),
            'last_activity_at' => $this->replies()->max('created_at') ?? $this->created_at,
        ])->save();
    }
}
