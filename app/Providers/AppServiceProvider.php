<?php

namespace App\Providers;

use App\Auth\CachedUserProvider;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Lesson;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Event;
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

        // `artisan serve` is single-threaded, so one request that outruns PHP's
        // 30 second limit does not just fail — it takes the whole dev server
        // down. The database is remote and occasionally cold, which is enough
        // to trigger it. Local only: in production a request this slow is a
        // fault that should surface, not be waited on.
        if ($this->app->environment('local') && php_sapi_name() === 'cli-server') {
            set_time_limit(0);
        }

        // Serves the signed-in user from cache; see CachedUserProvider.
        Auth::provider('eloquent-cached', fn ($app, array $config) => new CachedUserProvider(
            $app['hash'],
            $config['model'],
        ));

        $this->configureRateLimiting();

        // Keep the unread badge honest whenever anything notifies a user.
        Event::listen(NotificationSent::class, function (NotificationSent $event) {
            if ($event->notifiable instanceof User) {
                HandleInertiaRequests::forgetUnreadCount($event->notifiable->id);
            }
        });
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
