<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Readiness probe (Kubernetes)
|--------------------------------------------------------------------------
|
| Liveness uses Laravel's built-in /up. Readiness additionally verifies the
| database (and Redis when CACHE_STORE/SESSION/QUEUE use it) so pods that
| cannot reach dependencies are removed from the Service endpoints.
|
*/
Route::get('/ready', function () {
    DB::connection()->getPdo();

    $usesRedis = collect([
        config('cache.default'),
        config('session.driver'),
        config('queue.default'),
    ])->contains('redis');

    if ($usesRedis) {
        Redis::connection()->ping();
    }

    return response('ready', 200, ['Content-Type' => 'text/plain']);
})->middleware('throttle:60,1');
