<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

/**
 * A single counter folded into every content-derived cache key.
 *
 * Course, module, lesson, event, assignment and enrollment writes bump it,
 * which retires every cached list at once. That avoids tracking a dependency
 * graph per page while still making stale reads impossible after a change.
 */
class ContentVersion
{
    private const KEY = 'content:version';

    public static function current(): int
    {
        return (int) Cache::rememberForever(self::KEY, fn () => 1);
    }

    public static function bump(): void
    {
        Cache::forever(self::KEY, self::current() + 1);
    }
}
