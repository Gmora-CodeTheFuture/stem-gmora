<?php

namespace App\Models;

use App\Models\Concerns\BumpsContentVersion;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LiveSession extends Model
{
    use BumpsContentVersion, HasFactory, HasUuids;

    protected $fillable = [
        'lesson_id', 'title', 'scheduled_start', 'duration_minutes',
        'zoom_join_url', 'zoom_meeting_id', 'zoom_passcode', 'recording_url',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_start' => 'datetime',
        ];
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }
}
