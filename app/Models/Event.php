<?php

namespace App\Models;

use App\Models\Concerns\BumpsContentVersion;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Event extends Model
{
    use BumpsContentVersion, HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'course_id', 'created_by', 'title', 'description', 'type',
        'starts_at', 'ends_at', 'location', 'join_url', 'is_published',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_published' => 'boolean',
        ];
    }

    public const TYPE_CLASS = 'class';

    public const TYPE_WORKSHOP = 'workshop';

    public const TYPE_DEADLINE = 'deadline';

    public const TYPE_ANNOUNCEMENT = 'announcement';

    public const TYPES = [self::TYPE_CLASS, self::TYPE_WORKSHOP, self::TYPE_DEADLINE, self::TYPE_ANNOUNCEMENT];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Events a given student may see: platform-wide ones, plus those attached
     * to a course they are actively enrolled in.
     *
     * @param  array<int, string>  $courseIds
     */
    public function scopeVisibleTo(Builder $query, array $courseIds): Builder
    {
        return $query->where('is_published', true)
            ->where(fn ($q) => $q->whereNull('course_id')->orWhereIn('course_id', $courseIds));
    }

    public function scopeBetween(Builder $query, $from, $to): Builder
    {
        return $query->whereBetween('starts_at', [$from, $to]);
    }
}
