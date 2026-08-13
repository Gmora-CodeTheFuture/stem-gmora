<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Badge extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'description',
        'icon_url',
        'type',
        'criteria',
    ];

    protected $casts = [
        'criteria' => 'array',
    ];

    public function users()
    {
        return $this->belongsToMany(User::class, 'user_badges')->withPivot('earned_at');
    }
}
