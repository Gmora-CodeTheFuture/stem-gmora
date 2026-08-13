<?php

namespace App\Jobs;

use App\Models\VideoAccessToken;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Hourly cleanup of the durable token trail (Plan §5.4). Redis entries expire
 * on their own TTL; rows are kept for a retention window so an incident
 * investigation still has history, then deleted.
 */
class PurgeExpiredVideoTokens implements ShouldQueue
{
    use Queueable;

    /** How long expired token rows are retained for incident response. */
    public const RETENTION_DAYS = 30;

    public function handle(): void
    {
        VideoAccessToken::where('expires_at', '<', now()->subDays(self::RETENTION_DAYS))->delete();
    }
}
