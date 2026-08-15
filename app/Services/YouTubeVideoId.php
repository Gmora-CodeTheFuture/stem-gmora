<?php

namespace App\Services;

/**
 * Turns whatever a person pasted into the bare YouTube video id we store.
 *
 * Authors paste the share link — `https://youtu.be/ID?si=...` — because that is
 * what the Share button gives them. The player builds an embed URL from
 * `content_ref`, so a full URL stored verbatim produces a video that will not
 * start, with nothing on screen explaining why.
 */
class YouTubeVideoId
{
    /** A YouTube id is 11 characters of base64url. */
    private const ID = '/^[A-Za-z0-9_-]{11}$/';

    /**
     * @return string|null The bare id, or null if nothing usable was found.
     */
    public static function fromInput(?string $input): ?string
    {
        $input = trim((string) $input);

        if ($input === '') {
            return null;
        }

        // Already an id.
        if (preg_match(self::ID, $input)) {
            return $input;
        }

        // Bare "youtu.be/ID" and friends parse as a path, not a URL.
        if (! preg_match('#^https?://#i', $input)) {
            $input = 'https://'.$input;
        }

        $parts = parse_url($input);

        if ($parts === false || ! isset($parts['host'])) {
            return null;
        }

        $host = strtolower($parts['host']);
        $path = trim($parts['path'] ?? '', '/');

        // youtube.com/watch?v=ID
        parse_str($parts['query'] ?? '', $query);

        $candidates = [
            $query['v'] ?? null,
            // youtu.be/ID, /embed/ID, /shorts/ID, /live/ID, /v/ID
            str_contains($host, 'youtu.be') ? $path : null,
            preg_match('#^(?:embed|shorts|live|v)/([^/?]+)#', $path, $m) ? $m[1] : null,
        ];

        foreach ($candidates as $candidate) {
            $candidate = is_string($candidate) ? trim($candidate) : null;

            if ($candidate !== null && preg_match(self::ID, $candidate)) {
                return $candidate;
            }
        }

        return null;
    }
}
