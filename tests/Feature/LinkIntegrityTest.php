<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * The public site's main navigation shipped three links to routes that were
 * never built — /programs, /mentorship and /community all 404'd from the header
 * of every marketing page. Nothing caught it because no test reads the layouts.
 *
 * This walks the hrefs out of the layout files and asserts each one resolves.
 */
class LinkIntegrityTest extends TestCase
{
    use RefreshDatabase;

    /** Layout files whose links are visible to everyone. */
    private const LAYOUTS = [
        'resources/js/Layouts/MarketingLayout.tsx',
        'resources/js/Layouts/DashboardLayout.tsx',
    ];

    /**
     * @return array<int, string>
     */
    private function internalLinks(string $file): array
    {
        $source = file_get_contents(base_path($file));

        preg_match_all('/href[=:]\s*[\'"](\/[^\'"{}]*)[\'"]/', $source, $matches);

        return array_values(array_unique($matches[1]));
    }

    public function test_every_link_in_the_layouts_points_at_a_real_route(): void
    {
        $routes = collect(Route::getRoutes()->getRoutes())
            ->flatMap(fn ($route) => array_map(
                fn ($method) => $method.' /'.ltrim($route->uri(), '/'),
                $route->methods(),
            ))
            ->all();

        $broken = [];

        foreach (self::LAYOUTS as $layout) {
            foreach ($this->internalLinks($layout) as $href) {
                $path = '/'.ltrim(parse_url($href, PHP_URL_PATH) ?: '/', '/');

                // A link matches either a literal route or one with parameters
                // in the same position — /blog/{slug} covers /blog/anything.
                $matched = collect($routes)
                    ->filter(fn ($signature) => str_starts_with($signature, 'GET '))
                    ->contains(function ($signature) use ($path) {
                        $uri = substr($signature, 4);
                        $pattern = '#^'.preg_replace('/\{[^}]+\}/', '[^/]+', preg_quote($uri, '#')).'$#';
                        $pattern = str_replace(['\{', '\}'], ['{', '}'], $pattern);

                        return (bool) preg_match($pattern, $path);
                    });

                if (! $matched) {
                    $broken[] = "{$layout} → {$href}";
                }
            }
        }

        $this->assertSame([], $broken, "These links do not resolve:\n".implode("\n", $broken));
    }

    public function test_the_public_pages_the_navigation_offers_all_load(): void
    {
        foreach (['/', '/courses', '/blog'] as $path) {
            $this->get($path)->assertOk();
        }
    }

    public function test_no_layout_ships_a_placeholder_link(): void
    {
        // `href="#"` renders as a link, reads as a link, and does nothing.
        foreach (self::LAYOUTS as $layout) {
            $source = file_get_contents(base_path($layout));

            $this->assertStringNotContainsString(
                'href="#"',
                $source,
                "{$layout} still has a placeholder link.",
            );
        }
    }
}
