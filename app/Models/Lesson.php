<?php

namespace App\Models;

use App\Models\Concerns\BumpsContentVersion;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Lesson extends Model
{
    use BumpsContentVersion, HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'module_id', 'title', 'description', 'type', 'order_index',
        'content_ref', 'duration_seconds', 'is_free_preview', 'is_published',
    ];

    /**
     * CRITICAL: content_ref (YouTube video ID) is NEVER exposed to clients.
     * It is resolved server-side when issuing a video access token.
     */
    protected $hidden = [
        'content_ref',
    ];

    protected function casts(): array
    {
        return [
            'is_free_preview' => 'boolean',
            'is_published' => 'boolean',
        ];
    }

    // Lesson type constants
    public const TYPE_YOUTUBE = 'youtube';

    public const TYPE_LIVE = 'live';

    public const TYPE_PDF = 'pdf';

    public const TYPE_QUIZ = 'quiz';

    // ─── Relationships ──────────────────────────────────────────────

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    public function liveSession(): HasOne
    {
        return $this->hasOne(LiveSession::class);
    }

    public function quiz(): HasOne
    {
        return $this->hasOne(Quiz::class);
    }

    // ─── Helpers ────────────────────────────────────────────────────

    public function isVideo(): bool
    {
        return $this->type === self::TYPE_YOUTUBE;
    }

    public function isLive(): bool
    {
        return $this->type === self::TYPE_LIVE;
    }

    /**
     * Get the course this lesson belongs to (through module).
     */
    public function getCourseAttribute(): ?Course
    {
        return $this->module?->course;
    }
}
