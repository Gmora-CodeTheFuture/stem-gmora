<?php

namespace App\Http\Controllers;

use App\Models\Lesson;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Serves a lesson's PDF to students.
 *
 * The file lives on the private disk, so it is never reachable by URL guessing;
 * this route is enrollment-gated by the same middleware as the lesson itself.
 */
class LessonFileController extends Controller
{
    public function pdf(Request $request, Lesson $lesson): StreamedResponse
    {
        abort_unless($lesson->type === Lesson::TYPE_PDF, 404);

        $path = $lesson->getRawOriginal('content_ref');

        abort_unless($path && Storage::disk('private')->exists($path), 404, 'This lesson has no document yet.');

        // Inline, so it opens in the browser's viewer rather than downloading.
        return Storage::disk('private')->response($path, $lesson->title.'.pdf', [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.addslashes($lesson->title).'.pdf"',
            // Students may read it; nobody else may cache it on their behalf.
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
