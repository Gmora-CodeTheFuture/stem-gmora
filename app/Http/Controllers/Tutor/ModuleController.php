<?php

namespace App\Http\Controllers\Tutor;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Module;
use App\Services\CourseContentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

class ModuleController extends Controller
{
    public function __construct(private readonly CourseContentService $content) {}

    public function store(Request $request, Course $course): RedirectResponse
    {
        $this->authorizeTutor($request, $course);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $maxOrder = $course->modules()->max('order_index') ?? 0;

        $course->modules()->create([
            ...$validated,
            'order_index' => $maxOrder + 1,
            'is_published' => false,
        ]);

        return Redirect::back()->with('success', "Module \"{$validated['title']}\" added.");
    }

    public function update(Request $request, Module $module): RedirectResponse
    {
        $this->authorizeTutor($request, $module->course);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_published' => ['boolean'],
        ]);

        $module->update($validated);

        $this->content->syncCounters($module->course);

        return Redirect::back()->with('success', 'Module updated.');
    }

    public function destroy(Request $request, Module $module): RedirectResponse
    {
        $this->authorizeTutor($request, $module->course);

        $title = $module->title;
        $this->content->deleteModule($module);

        return Redirect::back()->with('success', "Module \"{$title}\" deleted.");
    }

    public function reorder(Request $request, Course $course): RedirectResponse
    {
        $this->authorizeTutor($request, $course);

        $validated = $request->validate([
            'order' => ['required', 'array'],
            'order.*' => ['required', 'exists:modules,id'],
        ]);

        foreach ($validated['order'] as $index => $moduleId) {
            Module::where('id', $moduleId)
                ->where('course_id', $course->id)
                ->update(['order_index' => $index]);
        }

        return Redirect::back()->with('success', 'Modules reordered.');
    }

    private function authorizeTutor(Request $request, Course $course): void
    {
        $user = $request->user();
        if (! $user->isAdmin() && $course->instructor_id !== $user->id) {
            abort(403, 'You can only manage your own courses.');
        }
    }
}
