<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Every bug that reached a user on this project had the same shape: a working
 * endpoint with nothing in the interface to reach it. Modules and lessons could
 * be published but had no toggle. Lessons accepted a duration with no field to
 * type one into. Reorder endpoints existed while the drag handles did nothing.
 * Events could be updated, but only by hand with curl.
 *
 * Feature tests never catch this, because they call the endpoint directly —
 * the one path a user cannot take. This asserts the opposite: that a named
 * route is referenced somewhere in the frontend, by name or by path.
 */
class RouteReachabilityTest extends TestCase
{
    /**
     * Routes with no frontend caller by design.
     *
     * Keep this list short and justified. Anything added here is a promise that
     * the route is reached some other way — by the framework, by a redirect, or
     * by a link in an email.
     */
    private const UNREACHED_BY_DESIGN = [
        // Framework and infrastructure.
        'sanctum.csrf-cookie',
        'storage.local',
        'storage.local.upload',
        'up',

        // Auth flows Laravel drives itself, or that arrive by emailed link.
        'password.confirm', 'password.store', 'password.update', 'password.email',
        'verification.verify', 'verification.send', 'verification.notice',
        'logout', 'login.store', 'register.store',
        'two-factor.challenge', 'two-factor.verify', 'two-factor.recovery-codes',
        'two-factor.disable', 'two-factor.confirm',

        // Reached by redirect after another action.
        'learn.lesson',

        // Served as a raw asset by the presentation viewer's own markup.
        'presentation.asset',
    ];

    /** @return array<int, string> */
    private function frontendSource(): array
    {
        $files = [];

        foreach (['resources/js'] as $directory) {
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator(base_path($directory))
            );

            foreach ($iterator as $file) {
                if ($file->isFile() && in_array($file->getExtension(), ['tsx', 'ts'], true)) {
                    $files[] = file_get_contents($file->getPathname());
                }
            }
        }

        return $files;
    }

    public function test_every_named_route_is_reachable_from_the_interface(): void
    {
        $source = implode("\n", $this->frontendSource());

        $unreachable = [];

        foreach (Route::getRoutes()->getRoutes() as $route) {
            $name = $route->getName();

            if (! $name || in_array($name, self::UNREACHED_BY_DESIGN, true)) {
                continue;
            }

            // Referenced by name — route('foo.bar') — or by the literal path up
            // to its first parameter, which is how the older pages link.
            $literal = '/'.Str::before(ltrim($route->uri(), '/'), '{');
            $literal = rtrim($literal, '/');

            $byName = str_contains($source, "'{$name}'") || str_contains($source, "\"{$name}\"");
            $byPath = strlen($literal) > 3 && str_contains($source, $literal);

            if (! $byName && ! $byPath) {
                $unreachable[] = sprintf('%-38s %s', $name, $route->uri());
            }
        }

        $this->assertSame([], $unreachable, implode("\n", [
            'These routes have no caller in resources/js — either the control is',
            'missing from the interface, or the route is dead code:',
            '',
            ...$unreachable,
        ]));
    }
}
