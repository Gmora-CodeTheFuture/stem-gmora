<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ContentBlock extends Model
{
    use HasUuids;

    protected $fillable = [
        'page', 'section_key', 'content', 'is_published', 'order_index',
    ];

    protected function casts(): array
    {
        return [
            'content' => 'array',
            'is_published' => 'boolean',
        ];
    }

    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }

    public function scopeForPage($query, string $page)
    {
        return $query->where('page', $page)->orderBy('order_index');
    }
}
