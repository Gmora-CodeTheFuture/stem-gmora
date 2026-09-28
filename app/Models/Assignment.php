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
        'deadline_at', 'rubric', 'max_marks', 'is_published', 'publish_at', 'is_required',
    ];

    protected function casts(): array
    {
        return [
            'deadline_at' => 'datetime',
            'publish_at' => 'datetime',
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

    /**
     * Ready to publish or schedule: title, marks, and at least one complete question.
     */
    public function isReadyToPublish(): bool
    {
        if (! filled($this->title) || (int) $this->max_marks < 1) {
            return false;
        }

        $this->loadMissing('questions');

        if ($this->questions->isEmpty()) {
            return false;
        }

        return $this->questions->every(fn (AssignmentQuestion $q) => $q->isComplete());
    }

    public function readinessErrors(): array
    {
        $errors = [];

        if (! filled($this->title)) {
            $errors[] = 'Title is required.';
        }

        if ((int) $this->max_marks < 1) {
            $errors[] = 'Max marks must be at least 1.';
        }

        $this->loadMissing('questions');

        if ($this->questions->isEmpty()) {
            $errors[] = 'Add at least one question before publishing.';
        } else {
            foreach ($this->questions as $index => $question) {
                if (! $question->isComplete()) {
                    $errors[] = 'Question '.($index + 1).' is incomplete.';
                }
            }
        }

        return $errors;
    }
}
