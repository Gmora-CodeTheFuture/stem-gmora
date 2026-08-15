<?php

namespace App\Http\Controllers\Tutor;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Services\CourseContentService;
use App\Services\YouTubeVideoId;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;

class LessonController extends Controller
{
    public function __construct(private readonly CourseContentService $content) {}

    public function store(Request $request, Module $module): RedirectResponse
    {
        $course = $module->course;
        $this->authorizeTutor($request, $course);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['required', 'in:youtube,live,pdf,quiz,html'],
            'content_ref' => ['nullable', 'string', 'max:500'],
            'duration_seconds' => ['nullable', 'integer', 'min:0'],
            'is_free_preview' => ['boolean'],
        ]);

        if ($error = $this->normaliseVideo($validated)) {
            return Redirect::back()->withErrors(['content_ref' => $error]);
        }

        $maxOrder = $module->lessons()->max('order_index') ?? 0;

        $module->lessons()->create([
            ...$validated,
            'content_ref' => $validated['content_ref'] ?: null,
            'order_index' => $maxOrder + 1,
            'is_published' => false,
        ]);

        $this->content->syncCounters($course);

        return Redirect::back()->with('success', "Lesson \"{$validated['title']}\" added.");
    }

    public function update(Request $request, Lesson $lesson): RedirectResponse
    {
        $course = $lesson->module->course;
        $this->authorizeTutor($request, $course);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['required', 'in:youtube,live,pdf,quiz,html'],
            'content_ref' => ['nullable', 'string', 'max:500'],
            'duration_seconds' => ['nullable', 'integer', 'min:0'],
            'is_free_preview' => ['boolean'],
            'is_published' => ['boolean'],
        ]);

        if ($error = $this->normaliseVideo($validated)) {
            return Redirect::back()->withErrors(['content_ref' => $error]);
        }

        // An empty `content_ref` means "unchanged", never "erase it". The edit
        // form submits an empty string whenever the field was not touched, and
        // clearing it would silently break playback for enrolled students.
        if (($validated['content_ref'] ?? '') === '') {
            unset($validated['content_ref']);
        }

        $lesson->fill($validated);

        if ($lesson->is_published && ($blocker = $this->content->publishBlocker($lesson))) {
            return Redirect::back()->with('error', $blocker);
        }

        $lesson->save();

        $this->content->syncCounters($course);

        return Redirect::back()->with('success', 'Lesson updated.');
    }

    public function destroy(Request $request, Lesson $lesson): RedirectResponse
    {
        $course = $lesson->module->course;
        $this->authorizeTutor($request, $course);

        $title = $lesson->title;
        $lesson->delete();

        $this->content->syncCounters($course);

        return Redirect::back()->with('success', "Lesson \"{$title}\" deleted.");
    }

    public function reorder(Request $request, Module $module): RedirectResponse
    {
        $course = $module->course;
        $this->authorizeTutor($request, $course);

        $validated = $request->validate([
            'order' => ['required', 'array'],
            'order.*' => ['required', 'exists:lessons,id'],
        ]);

        foreach ($validated['order'] as $index => $lessonId) {
            Lesson::where('id', $lessonId)
                ->where('module_id', $module->id)
                ->update(['order_index' => $index]);
        }

        return Redirect::back()->with('success', 'Lessons reordered.');
    }

    /**
     * Authors paste the YouTube share link, so accept one and keep the id.
     *
     * @param  array<string, mixed>  $validated
     * @return string|null A validation message when the input is unusable.
     */
    private function normaliseVideo(array &$validated): ?string
    {
        if (($validated['type'] ?? null) !== Lesson::TYPE_YOUTUBE) {
            return null;
        }

        $given = trim((string) ($validated['content_ref'] ?? ''));

        if ($given === '') {
            return null;
        }

        $id = YouTubeVideoId::fromInput($given);

        if ($id === null) {
            return 'That does not look like a YouTube video. Paste the share link or the 11-character video id.';
        }

        $validated['content_ref'] = $id;

        return null;
    }

    /**
     * Attach a PDF to a PDF lesson.
     *
     * Stored on the private disk and served back through an enrollment-gated
     * route, so the document is no more reachable than the course itself.
     */
    public function uploadPdf(Request $request, Lesson $lesson): RedirectResponse
    {
        $course = $lesson->module->course;
        $this->authorizeTutor($request, $course);

        $request->validate([
            'pdf_file' => ['required', 'file', 'mimes:pdf', 'max:51200'], // 50 MB
        ]);

        $previous = $lesson->getRawOriginal('content_ref');

        $path = $request->file('pdf_file')->store("lesson-pdfs/{$lesson->id}", 'private');

        $lesson->forceFill([
            'type' => Lesson::TYPE_PDF,
            'content_ref' => $path,
        ])->save();

        // Replacing a document should not leave the old one on disk.
        if ($previous && $previous !== $path && Storage::disk('private')->exists($previous)) {
            Storage::disk('private')->delete($previous);
        }

        return Redirect::back()->with('success', 'Document uploaded.');
    }

    private function authorizeTutor(Request $request, Course $course): void
    {
        $user = $request->user();
        if (! $user->isAdmin() && $course->instructor_id !== $user->id) {
            abort(403, 'You can only manage your own courses.');
        }
    }
}
