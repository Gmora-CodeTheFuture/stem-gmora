<?php

namespace App\Http\Controllers\Tutor;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\LessonMaterial;
use App\Services\PresentationService;
use App\Services\YouTubeVideoId;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;

class LessonMaterialController extends Controller
{
    public function store(Request $request, Lesson $lesson): RedirectResponse
    {
        $this->authorizeTutor($request, $lesson->module->course);
        abort_if($lesson->type === Lesson::TYPE_QUIZ, 422, 'Quiz lessons do not use materials.');

        $validated = $request->validate([
            'type' => ['required', 'in:youtube,pdf,html,live'],
            'title' => ['nullable', 'string', 'max:255'],
        ]);

        // First real material would otherwise replace the synthetic legacy slot.
        $lesson->promoteLegacyMaterial();

        $maxOrder = $lesson->materials()->max('order_index') ?? -1;

        $material = $lesson->materials()->create([
            'type' => $validated['type'],
            'title' => $validated['title'] ?? null,
            'order_index' => $maxOrder + 1,
            'duration_minutes' => $validated['type'] === LessonMaterial::TYPE_LIVE ? 60 : null,
            'scheduled_start' => $validated['type'] === LessonMaterial::TYPE_LIVE ? now()->addDay() : null,
        ]);

        $lesson->syncPrimaryTypeFromMaterials();

        return Redirect::back()->with('success', 'Material added.')->with('focus_material', $material->id);
    }

    public function update(Request $request, LessonMaterial $material): RedirectResponse
    {
        $lesson = $material->lesson;
        $this->authorizeTutor($request, $lesson->module->course);

        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'content_ref' => ['nullable', 'string', 'max:500'],
            'scheduled_start' => ['nullable', 'date'],
            'duration_minutes' => ['nullable', 'integer', 'min:1', 'max:480'],
            'zoom_join_url' => ['nullable', 'string', 'max:500'],
            'zoom_meeting_id' => ['nullable', 'string', 'max:100'],
            'zoom_passcode' => ['nullable', 'string', 'max:100'],
            'recording_url' => ['nullable', 'string', 'max:500'],
        ]);

        if ($material->type === LessonMaterial::TYPE_YOUTUBE && array_key_exists('content_ref', $validated)) {
            $given = trim((string) ($validated['content_ref'] ?? ''));
            if ($given === '') {
                unset($validated['content_ref']);
            } else {
                $id = YouTubeVideoId::fromInput($given);
                if ($id === null) {
                    return Redirect::back()->withErrors([
                        'content_ref' => 'That does not look like a YouTube video. Paste the share link or the 11-character video id.',
                    ]);
                }
                $validated['content_ref'] = $id;
            }
        }

        $material->fill($validated)->save();
        $lesson->syncPrimaryTypeFromMaterials();

        return Redirect::back()->with('success', 'Material updated.');
    }

    public function destroy(Request $request, LessonMaterial $material): RedirectResponse
    {
        $lesson = $material->lesson;
        $this->authorizeTutor($request, $lesson->module->course);

        if ($material->type === LessonMaterial::TYPE_PDF) {
            $path = $material->getRawOriginal('content_ref');
            if ($path && Storage::disk('private')->exists($path)) {
                Storage::disk('private')->delete($path);
            }
        }

        if ($material->type === LessonMaterial::TYPE_HTML && $material->storage_path) {
            Storage::disk(PresentationService::DISK)->deleteDirectory($material->storage_path);
        }

        $material->delete();
        $lesson->syncPrimaryTypeFromMaterials();

        return Redirect::back()->with('success', 'Material removed.');
    }

    public function reorder(Request $request, Lesson $lesson): RedirectResponse
    {
        $this->authorizeTutor($request, $lesson->module->course);

        $validated = $request->validate([
            'order' => ['required', 'array'],
            'order.*' => ['required', 'exists:lesson_materials,id'],
        ]);

        foreach ($validated['order'] as $index => $materialId) {
            LessonMaterial::where('id', $materialId)
                ->where('lesson_id', $lesson->id)
                ->update(['order_index' => $index]);
        }

        $lesson->syncPrimaryTypeFromMaterials();

        return Redirect::back()->with('success', 'Materials reordered.');
    }

    public function uploadPdf(Request $request, LessonMaterial $material): RedirectResponse
    {
        $lesson = $material->lesson;
        $this->authorizeTutor($request, $lesson->module->course);
        abort_unless($material->type === LessonMaterial::TYPE_PDF, 422);

        $request->validate([
            'pdf_file' => ['required', 'file', 'mimes:pdf', 'max:51200'],
        ]);

        $previous = $material->getRawOriginal('content_ref');
        $path = $request->file('pdf_file')->store("lesson-pdfs/{$lesson->id}/{$material->id}", 'private');

        $material->forceFill(['content_ref' => $path])->save();

        if ($previous && $previous !== $path && Storage::disk('private')->exists($previous)) {
            Storage::disk('private')->delete($previous);
        }

        $lesson->syncPrimaryTypeFromMaterials();

        return Redirect::back()->with('success', 'Document uploaded.');
    }

    public function uploadPresentation(
        Request $request,
        LessonMaterial $material,
        PresentationService $service,
    ): RedirectResponse {
        $lesson = $material->lesson;
        $this->authorizeTutor($request, $lesson->module->course);
        abort_unless($material->type === LessonMaterial::TYPE_HTML, 422);

        $request->validate([
            'presentation_file' => ['required', 'file', 'mimes:zip', 'max:51200'],
        ]);

        $service->storeForMaterial($material, $request->file('presentation_file'));
        $lesson->syncPrimaryTypeFromMaterials();

        return Redirect::back()->with('success', 'Presentation uploaded.');
    }

    private function authorizeTutor(Request $request, Course $course): void
    {
        $user = $request->user();
        if (! $user->isAdmin() && $course->instructor_id !== $user->id) {
            abort(403, 'You can only manage your own courses.');
        }
    }
}
