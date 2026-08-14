<?php

namespace App\Models\Concerns;

use App\Services\ContentVersion;

/**
 * Any model whose rows appear in a cached list. Writing one retires the cached
 * pages built from it.
 */
trait BumpsContentVersion
{
    public static function bootBumpsContentVersion(): void
    {
        $bump = fn () => ContentVersion::bump();

        static::saved($bump);
        static::deleted($bump);
    }
}
