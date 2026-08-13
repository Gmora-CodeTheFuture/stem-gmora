<?php

namespace App\Http\Controllers\Tutor;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

class LessonController extends Controller
{
    public function store(Request $request, Module $module): RedirectResponse
    {
        $course = $module->course;
        $this->authorizeTutor($request, $course);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['required', 'in:youtube,live,pdf,quiz'],
            'content_ref' => ['nullable', 'string', 'max:500'],
            'duration_seconds' => ['nullable', 'integer', 'min:0'],
            'is_free_preview' => ['boolean'],
        ]);

        $maxOrder = $module->lessons()->max('order_index') ?? 0;

        $module->lessons()->create([
            ...$validated,
            'order_index' => $maxOrder + 1,
            'is_published' => false,
        ]);

        // Update the course total lesson count
        $course->update([
            'total_lessons' => $course->modules()->withCount('lessons')->get()->sum('lessons_count'),
        ]);

        return Redirect::back()->with('success', "Lesson \"{$validated['title']}\" added.");
    }

    public function update(Request $request, Lesson $lesson): RedirectResponse
    {
        $course = $lesson->module->course;
        $this->authorizeTutor($request, $course);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['required', 'in:youtube,live,pdf,quiz'],
            'content_ref' => ['nullable', 'string', 'max:500'],
            'duration_seconds' => ['nullable', 'integer', 'min:0'],
            'is_free_preview' => ['boolean'],
            'is_published' => ['boolean'],
        ]);

        $lesson->update($validated);

        return Redirect::back()->with('success', 'Lesson updated.');
    }

    public function destroy(Request $request, Lesson $lesson): RedirectResponse
    {
        $course = $lesson->module->course;
        $this->authorizeTutor($request, $course);

        $title = $lesson->title;
        $lesson->delete();

        // Update total
        $course->update([
            'total_lessons' => $course->modules()->withCount('lessons')->get()->sum('lessons_count'),
        ]);

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

    private function authorizeTutor(Request $request, Course $course): void
    {
        $user = $request->user();
        if (!$user->isAdmin() && $course->instructor_id !== $user->id) {
            abort(403, 'You can only manage your own courses.');
        }
    }
}
