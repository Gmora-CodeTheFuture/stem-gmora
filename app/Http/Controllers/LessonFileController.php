<?php

namespace App\Http\Controllers;

use App\Models\Lesson;
use App\Models\LessonMaterial;
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
        // Prefer a PDF material when present; fall back to legacy lesson content_ref.
        $material = $lesson->materials()
            ->where('type', LessonMaterial::TYPE_PDF)
            ->orderBy('order_index')
            ->first();

        if ($material) {
            return $this->pdfMaterial($request, $material);
        }

        abort_unless($lesson->type === Lesson::TYPE_PDF, 404);

        $path = $lesson->getRawOriginal('content_ref');

        abort_unless($path && Storage::disk('private')->exists($path), 404, 'This lesson has no document yet.');

        return Storage::disk('private')->response($path, $lesson->title.'.pdf', [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.addslashes($lesson->title).'.pdf"',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    public function pdfMaterial(Request $request, LessonMaterial $material): StreamedResponse
    {
        abort_unless($material->type === LessonMaterial::TYPE_PDF, 404);

        $path = $material->getRawOriginal('content_ref');

        abort_unless($path && Storage::disk('private')->exists($path), 404, 'This material has no document yet.');

        $title = $material->title ?: $material->lesson?->title ?: 'document';

        return Storage::disk('private')->response($path, $title.'.pdf', [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.addslashes($title).'.pdf"',
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
