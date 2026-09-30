<?php

$s3 = fn (?string $root = null, string $visibility = 'private') => [
    'driver' => 's3',
    'key' => env('AWS_ACCESS_KEY_ID'),
    'secret' => env('AWS_SECRET_ACCESS_KEY'),
    'region' => env('AWS_DEFAULT_REGION'),
    'bucket' => env('AWS_BUCKET'),
    'url' => env('AWS_URL'),
    'endpoint' => env('AWS_ENDPOINT'),
    'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
    'throw' => false,
    'report' => false,
    'visibility' => $visibility,
    'root' => $root,
];

$useS3 = env('FILESYSTEM_CLOUD', 'local') === 's3';

return [

    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [

        // Presentations, certificates, submissions — shared across replicas when FILESYSTEM_CLOUD=s3
        'local' => $useS3
            ? $s3('app/private', 'private')
            : [
                'driver' => 'local',
                'root' => storage_path('app/private'),
                'serve' => true,
                'throw' => false,
                'report' => false,
            ],

        // Lesson PDFs and other enrollment-gated files.
        'private' => $useS3
            ? $s3('app/private', 'private')
            : [
                'driver' => 'local',
                'root' => storage_path('app/private'),
                'visibility' => 'private',
                'serve' => false,
                'throw' => false,
                'report' => false,
            ],

        'public' => $useS3
            ? array_merge($s3('app/public', 'public'), [
                'url' => env('AWS_URL', env('APP_URL').'/storage'),
            ])
            : [
                'driver' => 'local',
                'root' => storage_path('app/public'),
                'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
                'visibility' => 'public',
                'throw' => false,
                'report' => false,
            ],

        's3' => $s3(null, 'private'),

    ],

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
