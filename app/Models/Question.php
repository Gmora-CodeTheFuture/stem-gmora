<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Question extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'quiz_id', 'type', 'body', 'options', 'correct_answer',
        'points', 'order_index', 'explanation',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'correct_answer' => 'array',
        ];
    }

    public const TYPE_MCQ = 'mcq';

    public const TYPE_TRUE_FALSE = 'true_false';

    public const TYPE_FILL_BLANK = 'fill_blank';

    public const TYPE_CODE = 'code';

    public const TYPE_MATCHING = 'matching';

    public const TYPE_ORDERING = 'ordering';

    public const TYPE_ESSAY = 'essay';

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }
}
