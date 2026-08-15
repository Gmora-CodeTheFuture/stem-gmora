<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class Role extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'display_name',
        'description',
    ];

    /**
     * Roles change perhaps twice in a platform's life but are read on every
     * request, so they are served from cache rather than the database.
     */
    public static function cached(): Collection
    {
        // Plain arrays only. A serialised Eloquent model comes back as
        // __PHP_Incomplete_Class whenever the cached payload outlives the
        // process that wrote it, which takes down every authenticated page.
        $rows = Cache::remember(
            'roles:all',
            now()->addDay(),
            fn () => static::query()
                ->get(['id', 'name', 'display_name', 'description'])
                ->keyBy('id')
                ->toArray(),
        );

        return collect($rows);
    }

    public static function findCached(?string $id): ?self
    {
        $attributes = $id ? static::cached()->get($id) : null;

        if (! is_array($attributes)) {
            return null;
        }

        // Hydrated without a query, so callers still get a real Role instance.
        return (new static)->setRawAttributes($attributes, true);
    }

    protected static function booted(): void
    {
        $flush = fn () => Cache::forget('roles:all');

        static::saved($flush);
        static::deleted($flush);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Two roles, and that is the whole model. Everyone either learns here or
     * runs the place; courses are authored by admins, so the tiers that used to
     * sit between them (instructor, teaching assistant, course manager) only
     * ever added permission checks nobody exercised.
     */
    public const STUDENT = 'student';

    public const ADMIN = 'admin';
}
