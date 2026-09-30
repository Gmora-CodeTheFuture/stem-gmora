<?php

namespace App\Models;

use App\Models\Concerns\BumpsContentVersion;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;

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

    public const TYPE_HTML = 'html';

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

    public function presentation(): HasOne
    {
        return $this->hasOne(Presentation::class);
    }

    public function materials(): HasMany
    {
        return $this->hasMany(LessonMaterial::class)->orderBy('order_index');
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
     * Materials for display/editing. If the lesson has no material rows yet,
     * synthesize one from the legacy single-type payload so old courses work.
     *
     * @return Collection<int, LessonMaterial>
     */
    public function resolvedMaterials(): Collection
    {
        $this->loadMissing(['materials', 'presentation', 'liveSession']);

        if ($this->materials->isNotEmpty()) {
            return $this->materials->values();
        }

        return $this->synthesizeLegacyMaterials();
    }

    /**
     * @return Collection<int, LessonMaterial>
     */
    public function synthesizeLegacyMaterials(): Collection
    {
        if ($this->type === self::TYPE_QUIZ) {
            return collect();
        }

        $material = new LessonMaterial([
            'lesson_id' => $this->id,
            'type' => $this->type,
            'title' => null,
            'order_index' => 0,
            'content_ref' => $this->getRawOriginal('content_ref'),
        ]);
        $material->id = 'legacy-'.$this->id;
        $material->exists = false;

        if ($this->type === self::TYPE_HTML && $this->presentation) {
            $material->forceFill([
                'original_filename' => $this->presentation->original_filename,
                'entry_file' => $this->presentation->entry_file,
                'storage_path' => $this->presentation->storage_path,
                'file_size' => $this->presentation->file_size,
            ]);
        }

        if ($this->type === self::TYPE_LIVE && $this->liveSession) {
            $material->forceFill([
                'title' => $this->liveSession->title,
                'scheduled_start' => $this->liveSession->scheduled_start,
                'duration_minutes' => $this->liveSession->duration_minutes,
                'zoom_join_url' => $this->liveSession->zoom_join_url,
                'zoom_meeting_id' => $this->liveSession->zoom_meeting_id,
                'zoom_passcode' => $this->liveSession->zoom_passcode,
                'recording_url' => $this->liveSession->recording_url,
            ]);
        }

        return collect([$material]);
    }

    /**
     * Persist the synthesized legacy material as a real row so adding more
     * materials appends instead of replacing the single-type payload.
     *
     * Returns the created row, or null when nothing worth keeping exists.
     */
    public function promoteLegacyMaterial(): ?LessonMaterial
    {
        if ($this->type === self::TYPE_QUIZ || $this->materials()->exists()) {
            return null;
        }

        $synthetic = $this->synthesizeLegacyMaterials()->first();
        if (! $synthetic) {
            return null;
        }

        $hasPayload = $synthetic->isReady()
            || filled($synthetic->rawContentRef())
            || filled($synthetic->storage_path)
            || filled($synthetic->zoom_join_url)
            || filled($synthetic->scheduled_start);

        if (! $hasPayload) {
            return null;
        }

        $created = $this->materials()->create([
            'type' => $synthetic->type,
            'title' => $synthetic->title ?: $synthetic->defaultTitle(),
            'order_index' => 0,
            'content_ref' => $synthetic->rawContentRef(),
            'original_filename' => $synthetic->original_filename,
            'entry_file' => $synthetic->entry_file,
            'storage_path' => $synthetic->storage_path,
            'file_size' => $synthetic->file_size,
            'scheduled_start' => $synthetic->scheduled_start,
            'duration_minutes' => $synthetic->duration_minutes,
            'zoom_join_url' => $synthetic->zoom_join_url,
            'zoom_meeting_id' => $synthetic->zoom_meeting_id,
            'zoom_passcode' => $synthetic->zoom_passcode,
            'recording_url' => $synthetic->recording_url,
        ]);

        $this->unsetRelation('materials');

        return $created;
    }

    /** Keep lesson.type aligned with the first material for icons/filters. */
    public function syncPrimaryTypeFromMaterials(): void
    {
        $first = $this->materials()->orderBy('order_index')->first();
        if (! $first) {
            return;
        }

        if ($this->type !== $first->type && $this->type !== self::TYPE_QUIZ) {
            $this->forceFill(['type' => $first->type])->saveQuietly();
        }
    }

    /**
     * Get the course this lesson belongs to (through module).
     */
    public function getCourseAttribute(): ?Course
    {
        return $this->module?->course;
    }
}
