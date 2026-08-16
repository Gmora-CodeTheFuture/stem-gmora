<?php

/**
 * Vercel serverless entrypoint.
 *
 * Every request to the app is routed here by vercel.json. Vercel's filesystem
 * is read-only apart from `/tmp`, which is per-invocation scratch space, so
 * Laravel's writable paths are pointed there before the framework boots.
 *
 * `/tmp` does not survive between invocations. Anything that must outlive a
 * request — sessions, cache, uploads — has to live in Postgres or object
 * storage instead. See docs/DEPLOY-VERCEL.md.
 */
$storage = '/tmp/storage';

$directories = [
    $storage.'/app/public',
    $storage.'/framework/cache/data',
    $storage.'/framework/sessions',
    $storage.'/framework/testing',
    $storage.'/framework/views',
    $storage.'/logs',
    '/tmp/bootstrap/cache',
];

foreach ($directories as $directory) {
    if (! is_dir($directory)) {
        mkdir($directory, 0755, true);
    }
}

// Laravel reads these when locating its caches; setting them here keeps the
// framework from trying to write inside the read-only deployment.
putenv('LARAVEL_STORAGE_PATH='.$storage);
putenv('VIEW_COMPILED_PATH='.$storage.'/framework/views');
putenv('APP_CONFIG_CACHE=/tmp/bootstrap/cache/config.php');
putenv('APP_EVENTS_CACHE=/tmp/bootstrap/cache/events.php');
putenv('APP_PACKAGES_CACHE=/tmp/bootstrap/cache/packages.php');
putenv('APP_ROUTES_CACHE=/tmp/bootstrap/cache/routes-v7.php');
putenv('APP_SERVICES_CACHE=/tmp/bootstrap/cache/services.php');

$_ENV['LARAVEL_STORAGE_PATH'] = $storage;
$_SERVER['LARAVEL_STORAGE_PATH'] = $storage;

require __DIR__.'/../public/index.php';
