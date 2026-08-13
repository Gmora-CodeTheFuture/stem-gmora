<?php

use App\Http\Controllers\Api\VideoAccessController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
| Session-authenticated XHR endpoints for flows that must not travel as
| Inertia page props. [v2] The video-token endpoints are excluded from the
| public API docs (Plan §11.3).
*/

Route::middleware(['web', 'auth'])->prefix('v1/learning')->group(function () {
    Route::post('/lessons/{lesson}/video-token', [VideoAccessController::class, 'issue'])
        ->middleware(['enrolled', 'throttle:video-token'])
        ->name('api.video-token.issue');

    Route::get('/video-token/{ticket}/heartbeat', [VideoAccessController::class, 'heartbeat'])
        ->middleware('throttle:video-heartbeat')
        ->name('api.video-token.heartbeat');
});
