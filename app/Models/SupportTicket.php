<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SupportTicket extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'reference', 'user_id', 'assigned_to', 'course_id', 'subject',
        'category', 'priority', 'status', 'last_reply_at', 'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'last_reply_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public const STATUS_OPEN = 'open';

    public const STATUS_PENDING = 'pending';   // waiting on the student

    public const STATUS_RESOLVED = 'resolved';

    public const STATUS_CLOSED = 'closed';

    public const STATUSES = [self::STATUS_OPEN, self::STATUS_PENDING, self::STATUS_RESOLVED, self::STATUS_CLOSED];

    public const CATEGORIES = ['general', 'billing', 'technical', 'content'];

    public const PRIORITIES = ['low', 'normal', 'high'];

    protected static function booted(): void
    {
        static::creating(function (self $ticket) {
            $ticket->reference ??= 'GS-'.Str::upper(Str::random(5));
            $ticket->last_reply_at ??= now();
        });
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportTicketMessage::class, 'ticket_id');
    }

    public function isClosed(): bool
    {
        return in_array($this->status, [self::STATUS_RESOLVED, self::STATUS_CLOSED], true);
    }
}
