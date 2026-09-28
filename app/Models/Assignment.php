<?php

namespace App\Models;

use App\Models\Concerns\BumpsContentVersion;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Assignment extends Model
{
    use BumpsContentVersion, HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'course_id', 'lesson_id', 'module_id', 'order_index', 'title', 'description',
        'deadline_at', 'rubric', 'max_marks', 'is_published', 'is_required',
    ];

    protected function casts(): array
    {
        return [
            'deadline_at' => 'datetime',
            'rubric' => 'array',
            'is_published' => 'boolean',
            'is_required' => 'boolean',
            'order_index' => 'integer',
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

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(AssignmentQuestion::class)->orderBy('order_index');
    }

    /** True when this assignment sits in a module's curriculum sequence. */
    public function isInCurriculum(): bool
    {
        return $this->module_id !== null;
    }
}
