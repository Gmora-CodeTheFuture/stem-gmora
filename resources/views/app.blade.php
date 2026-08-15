<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="color-scheme" content="light dark">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>
        {{-- One SVG for both themes: it carries its own prefers-color-scheme
             rule, which is the only theme signal a favicon ever sees. The PNGs
             stay as a fallback for browsers that do not take SVG icons. --}}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg">
        <link rel="alternate icon" type="image/png" href="/favicon.png" media="(prefers-color-scheme: light)">
        <link rel="alternate icon" type="image/png" href="/favicon-dark.png" media="(prefers-color-scheme: dark)">

        {{-- Resolve the theme before first paint so dark mode never flashes white. --}}
        <script>
            (function () {
                var saved = localStorage.getItem('theme');
                var dark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
                document.documentElement.classList.toggle('dark', dark);
            })();
        </script>

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
