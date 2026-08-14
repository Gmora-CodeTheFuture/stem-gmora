<?php

namespace App\Models;

use App\Models\Concerns\BumpsContentVersion;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Post extends Model
{
    use BumpsContentVersion, HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'author_id', 'title', 'slug', 'excerpt', 'body',
        'cover_image_url', 'category', 'tags', 'status', 'published_at',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'published_at' => 'datetime',
        ];
    }

    public const STATUS_DRAFT = 'draft';

    public const STATUS_PUBLISHED = 'published';

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /** Live posts only: published, and not scheduled for the future. */
    public function scopeLive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PUBLISHED)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    public function isLive(): bool
    {
        return $this->status === self::STATUS_PUBLISHED
            && $this->published_at !== null
            && $this->published_at->isPast();
    }

    /**
     * Markdown rendered to HTML with any raw HTML stripped. Authors are staff,
     * but stripping keeps a compromised account from injecting script.
     */
    public function renderedBody(): string
    {
        return Str::markdown($this->body ?? '', ['html_input' => 'strip', 'allow_unsafe_links' => false]);
    }

    /** Roughly how long the post takes to read, at ~200 words per minute. */
    public function readingMinutes(): int
    {
        return max((int) ceil(str_word_count(strip_tags($this->body ?? '')) / 200), 1);
    }
}
