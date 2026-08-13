<?php

namespace App\Providers;

use App\Models\Lesson;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        $this->configureRateLimiting();
    }

    /**
     * [v2] Tight, dedicated limits on the video endpoints so a scripted client
     * cannot enumerate lessons by hammering token issuance (Plan §7.4).
     */
    private function configureRateLimiting(): void
    {
        // ~1 issuance per lesson per 30s per user, with an hourly ceiling.
        // Throttle runs before route-model binding, so the lesson parameter is
        // still the raw route value here.
        RateLimiter::for('video-token', function (Request $request) {
            $userKey = $request->user()?->id ?: $request->ip();
            $lesson = $request->route('lesson');
            $lessonKey = $lesson instanceof Lesson ? $lesson->id : (string) $lesson;

            return [
                Limit::perMinute(2)->by($userKey.'|'.$lessonKey),
                Limit::perHour(60)->by($userKey),
            ];
        });

        // The player beats every ~60s; allow headroom for tab-focus churn.
        RateLimiter::for('video-heartbeat', fn (Request $request) => Limit::perMinute(10)
            ->by($request->user()?->id ?: $request->ip()));
    }
}
