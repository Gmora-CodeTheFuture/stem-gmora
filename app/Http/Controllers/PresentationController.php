<?php

namespace App\Http\Controllers;

use App\Models\Lesson;
use App\Models\Presentation;
use App\Services\PresentationService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

/**
 * Serves HTML presentations to students in a sandboxed, non-downloadable way.
 *
 * The entry HTML and all supporting assets (images, CSS, JS) are served through
 * this controller with a strict Content-Security-Policy: sandbox header that
 * isolates them from the main application (no cookie access, no parent window
 * access). Right-click-save is not prevented at the HTTP level (browsers don't
 * support that), but Content-Disposition: inline ensures the browser renders
 * rather than downloads.
 */
class PresentationController extends Controller
{
    /**
     * Tutor uploads a .zip presentation for a lesson.
     */
    public function upload(Request $request, Lesson $lesson, PresentationService $service)
    {
        // Authorize: only the owning instructor or an admin can upload.
        $course = $lesson->module->course;
        $user = $request->user();
        if (! $user->isAdmin() && $course->instructor_id !== $user->id) {
            abort(403, 'You can only manage your own courses.');
        }

        $request->validate([
            'presentation_file' => ['required', 'file', 'mimes:zip', 'max:51200'], // 50 MB
        ]);

        $service->store($lesson, $request->file('presentation_file'));

        return redirect()->back()->with('success', 'Presentation uploaded successfully.');
    }

    /**
     * Serve the entry HTML file (index.html) for the student to view.
     * Opens in a new tab with sandboxed CSP headers.
     */
    public function show(Request $request, Lesson $lesson): Response
    {
        $presentation = $lesson->presentation;

        if (! $presentation) {
            abort(404, 'No presentation uploaded for this lesson.');
        }

        return $this->serveFile(
            $presentation,
            $presentation->entry_file,
            'text/html',
        );
    }

    /**
     * Serve a supporting asset (image, CSS, JS) from within the presentation bundle.
     */
    public function asset(Request $request, Lesson $lesson, string $path): Response
    {
        $presentation = $lesson->presentation;

        if (! $presentation) {
            abort(404);
        }

        // Security: reject path traversal.
        if (str_contains($path, '..')) {
            abort(403);
        }

        $fullPath = "{$presentation->storage_path}/{$path}";
        $disk = Storage::disk(PresentationService::DISK);

        if (! $disk->exists($fullPath)) {
            abort(404);
        }

        $mime = $this->guessMimeType($path);
        $content = $disk->get($fullPath);

        return response($content, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'public, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Serve a file from the presentation storage with security headers.
     */
    private function serveFile(Presentation $presentation, string $relativePath, string $mime): Response
    {
        $fullPath = "{$presentation->storage_path}/{$relativePath}";
        $disk = Storage::disk(PresentationService::DISK);

        if (! $disk->exists($fullPath)) {
            abort(404, 'Presentation file not found.');
        }

        $content = $disk->get($fullPath);

        // If this is the HTML entry file, rewrite relative asset paths so they
        // route through our asset controller instead of hitting 404s.
        if ($mime === 'text/html') {
            $content = $this->rewriteAssetPaths($content, $presentation->lesson_id);
        }

        return response($content, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline',
            // Sandbox: allows scripts inside the HTML but isolates it from
            // the main app origin — no cookie/localStorage/parent access.
            'Content-Security-Policy' => "sandbox allow-scripts allow-same-origin; default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; img-src * data: blob:; font-src * data:; style-src * 'unsafe-inline'; script-src * 'unsafe-inline' 'unsafe-eval'",
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'no-store',
        ]);
    }

    /**
     * Rewrite relative src/href paths in the HTML so they point to the asset route.
     * This allows images, CSS, and JS bundled in the .zip to load correctly.
     */
    private function rewriteAssetPaths(string $html, string $lessonId): string
    {
        $baseUrl = route('presentation.asset', ['lesson' => $lessonId, 'path' => '']);

        // Inject a <base> tag so all relative URLs resolve through our controller.
        // We insert it right after <head> if present.
        if (stripos($html, '<head>') !== false) {
            $html = preg_replace(
                '/<head>/i',
                '<head><base href="'.htmlspecialchars($baseUrl, ENT_QUOTES).'">',
                $html,
                1,
            );
        } elseif (stripos($html, '<html>') !== false) {
            $html = preg_replace(
                '/<html>/i',
                '<html><head><base href="'.htmlspecialchars($baseUrl, ENT_QUOTES).'"></head>',
                $html,
                1,
            );
        }

        return $html;
    }

    /**
     * Guess the MIME type from the file extension.
     */
    private function guessMimeType(string $path): string
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return match ($extension) {
            'html', 'htm' => 'text/html',
            'css' => 'text/css',
            'js', 'mjs' => 'application/javascript',
            'json' => 'application/json',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'webp' => 'image/webp',
            'ico' => 'image/x-icon',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'otf' => 'font/otf',
            'eot' => 'application/vnd.ms-fontobject',
            'mp4' => 'video/mp4',
            'webm' => 'video/webm',
            'mp3' => 'audio/mpeg',
            'ogg' => 'audio/ogg',
            'pdf' => 'application/pdf',
            default => 'application/octet-stream',
        };
    }
}
