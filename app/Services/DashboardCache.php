<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

/**
 * The dashboard aggregates a dozen queries. Against a remote database that is
 * expensive, so the built payload is cached per user and dropped the moment
 * anything it reports on changes — progress, XP, enrollments, certificates.
 *
 * Cache lives on the local filesystem, so a hit costs microseconds.
 */
class DashboardCache
{
    public const TTL_SECONDS = 900;

    public static function key(string $userId): string
    {
        return "dashboard:{$userId}";
    }

    /** @template T */
    public static function remember(string $userId, callable $build): mixed
    {
        return Cache::remember(self::key($userId), self::TTL_SECONDS, $build);
    }

    public static function forget(?string $userId): void
    {
        if ($userId) {
            Cache::forget(self::key($userId));
        }
    }
}
