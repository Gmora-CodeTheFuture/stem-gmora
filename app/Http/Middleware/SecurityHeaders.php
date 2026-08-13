<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Security headers and Content-Security-Policy (Plan §7.4).
 *
 * The policy is deliberately explicit about the third parties this application
 * actually talks to: YouTube for the token-gated player and Google Fonts for
 * the typeface. Everything else is denied, which is the point.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $headers = [
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'SAMEORIGIN',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            'Permissions-Policy' => 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
            'Cross-Origin-Opener-Policy' => 'same-origin',
            'X-Permitted-Cross-Domain-Policies' => 'none',
        ];

        // HSTS only means anything over TLS, and would be harmful locally.
        if ($request->secure()) {
            $headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
        }

        $headers['Content-Security-Policy'] = $this->contentSecurityPolicy();

        foreach ($headers as $key => $value) {
            $response->headers->set($key, $value, false);
        }

        return $response;
    }

    private function contentSecurityPolicy(): string
    {
        // Vite injects inline styles and the dev client uses websockets, so the
        // policy is relaxed for local development only.
        $scriptSrc = "'self' https://www.youtube.com https://s.ytimg.com";
        $connectSrc = "'self'";

        if (app()->environment('local')) {
            $scriptSrc .= " 'unsafe-inline' 'unsafe-eval' http://localhost:* http://127.0.0.1:*";
            $connectSrc .= ' ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:*';
        }

        return implode('; ', [
            "default-src 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'self'",
            "object-src 'none'",
            "script-src {$scriptSrc}",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            // The lesson player is a YouTube iframe served from our own page.
            'frame-src https://www.youtube.com https://www.youtube-nocookie.com',
            "media-src 'self' blob:",
            "connect-src {$connectSrc}",
        ]);
    }
}
