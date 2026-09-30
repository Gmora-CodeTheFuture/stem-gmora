<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LessonMaterial extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'lesson_id',
        'type',
        'title',
        'order_index',
        'content_ref',
        'original_filename',
        'entry_file',
        'storage_path',
        'file_size',
        'scheduled_start',
        'duration_minutes',
        'zoom_join_url',
        'zoom_meeting_id',
        'zoom_passcode',
        'recording_url',
    ];

    /**
     * Never expose YouTube IDs or private PDF paths to clients.
     */
    protected $hidden = [
        'content_ref',
        'storage_path',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_start' => 'datetime',
            'order_index' => 'integer',
            'duration_minutes' => 'integer',
            'file_size' => 'integer',
        ];
    }

    public const TYPE_YOUTUBE = 'youtube';

    public const TYPE_PDF = 'pdf';

    public const TYPE_HTML = 'html';

    public const TYPE_LIVE = 'live';

    public const TYPES = [
        self::TYPE_YOUTUBE,
        self::TYPE_PDF,
        self::TYPE_HTML,
        self::TYPE_LIVE,
    ];

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function isReady(): bool
    {
        return match ($this->type) {
            self::TYPE_YOUTUBE => filled($this->rawContentRef()),
            self::TYPE_PDF => filled($this->rawContentRef()),
            self::TYPE_HTML => filled($this->storage_path) && filled($this->entry_file),
            self::TYPE_LIVE => filled($this->zoom_join_url) || filled($this->scheduled_start),
            default => false,
        };
    }

    /** YouTube id or private PDF path — works for persisted and synthesized rows. */
    public function rawContentRef(): ?string
    {
        return $this->attributes['content_ref']
            ?? $this->getRawOriginal('content_ref')
            ?? null;
    }

    public function defaultTitle(): string
    {
        return match ($this->type) {
            self::TYPE_YOUTUBE => 'Video',
            self::TYPE_PDF => 'Document',
            self::TYPE_HTML => 'Presentation',
            self::TYPE_LIVE => 'Live class',
            default => 'Material',
        };
    }

    /** Safe fields for student Inertia payloads. */
    public function toStudentArray(): array
    {
        $title = $this->title ?: $this->defaultTitle();

        $base = [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $title,
            'order_index' => $this->order_index,
            'legacy' => str_starts_with((string) $this->id, 'legacy-'),
        ];

        return match ($this->type) {
            self::TYPE_YOUTUBE => [
                ...$base,
                'has_video' => filled($this->rawContentRef()),
            ],
            self::TYPE_PDF => [
                ...$base,
                'has_pdf' => filled($this->rawContentRef()),
            ],
            self::TYPE_HTML => [
                ...$base,
                'has_presentation' => filled($this->storage_path) && filled($this->entry_file),
            ],
            self::TYPE_LIVE => [
                ...$base,
                'scheduled_start' => $this->scheduled_start?->toIso8601String(),
                'duration_minutes' => $this->duration_minutes,
                'zoom_join_url' => $this->zoom_join_url,
                'zoom_meeting_id' => $this->zoom_meeting_id,
                'zoom_passcode' => $this->zoom_passcode,
                'recording_url' => $this->recording_url,
            ],
            default => $base,
        };
    }

    /** Safe + editable fields for the tutor builder. */
    public function toTutorArray(): array
    {
        $data = $this->toStudentArray();
        $data['content_ref'] = $this->rawContentRef();
        $data['original_filename'] = $this->original_filename;
        $data['entry_file'] = $this->entry_file;
        $data['file_size'] = $this->file_size;
        $data['is_ready'] = $this->isReady();

        return $data;
    }
}
