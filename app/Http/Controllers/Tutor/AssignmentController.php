<?php

namespace App\Http\Controllers\Tutor;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Course;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

/**
 * Course-level assignment authoring. Deadlines surface on the student calendar
 * via CalendarController::deadlines — no separate Event row is required.
 */
class AssignmentController extends Controller
{
    public function store(Request $request, Course $course): RedirectResponse
    {
        $this->authorizeTutor($request, $course);

        $validated = $this->validateAssignment($request);
        $course->assignments()->create($validated);

        return Redirect::back()->with('success', "Assignment \"{$validated['title']}\" created.");
    }

    public function update(Request $request, Assignment $assignment): RedirectResponse
    {
        $this->authorizeTutor($request, $assignment->course);

        $validated = $this->validateAssignment($request);
        $assignment->update($validated);

        return Redirect::back()->with('success', 'Assignment updated.');
    }

    public function destroy(Request $request, Assignment $assignment): RedirectResponse
    {
        $this->authorizeTutor($request, $assignment->course);

        $title = $assignment->title;
        $assignment->delete();

        return Redirect::back()->with('success', "Assignment \"{$title}\" deleted.");
    }

    /** @return array<string, mixed> */
    private function validateAssignment(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'deadline_at' => ['nullable', 'date'],
            'max_marks' => ['required', 'integer', 'min:1', 'max:1000'],
            'is_published' => ['sometimes', 'boolean'],
            'lesson_id' => ['nullable', 'uuid', 'exists:lessons,id'],
        ]);
    }

    private function authorizeTutor(Request $request, Course $course): void
    {
        $user = $request->user();
        if (! $user->isAdmin() && $course->instructor_id !== $user->id) {
            abort(403, 'You can only manage your own courses.');
        }
    }
}
