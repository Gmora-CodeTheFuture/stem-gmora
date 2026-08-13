<?php

namespace App\Http\Controllers\Tutor;

use App\Http\Controllers\Controller;
use App\Models\Course;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CourseBuilderController extends Controller
{
    /**
     * Only show courses owned by the authenticated tutor.
     */
    public function index(Request $request): Response
    {
        $courses = $request->user()
            ->courses()
            ->withCount('enrollments')
            ->latest()
            ->paginate(15);

        return Inertia::render('Tutor/Courses/Index', [
            'courses' => $courses,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Tutor/Courses/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'category' => ['required', 'string', 'max:100'],
            'difficulty' => ['required', 'in:beginner,intermediate,advanced'],
            'language' => ['required', 'string', 'max:10'],
            'price' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'max:3'],
            'thumbnail_url' => ['nullable', 'string'],
        ]);

        $validated['instructor_id'] = $request->user()->id;
        $validated['slug'] = Str::slug($validated['title']);
        $validated['status'] = Course::STATUS_DRAFT;

        $course = Course::create($validated);

        return Redirect::route('tutor.courses.edit', $course)
            ->with('success', "Course \"{$course->title}\" created. Now add modules and lessons.");
    }

    public function edit(Request $request, Course $course): Response
    {
        $this->authorizeTutor($request, $course);

        $course->load([
            'modules.lessons' => fn ($q) => $q->withoutGlobalScopes(),
            'modules' => fn ($q) => $q->orderBy('order_index'),
        ]);

        return Inertia::render('Tutor/Courses/Edit', [
            'course' => $course,
        ]);
    }

    public function update(Request $request, Course $course): RedirectResponse
    {
        $this->authorizeTutor($request, $course);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'category' => ['required', 'string', 'max:100'],
            'difficulty' => ['required', 'in:beginner,intermediate,advanced'],
            'language' => ['required', 'string', 'max:10'],
            'price' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'max:3'],
            'thumbnail_url' => ['nullable', 'string'],
        ]);

        $course->update($validated);

        return Redirect::back()->with('success', 'Course updated.');
    }

    public function destroy(Request $request, Course $course): RedirectResponse
    {
        $this->authorizeTutor($request, $course);

        $title = $course->title;
        $course->delete();

        return Redirect::route('tutor.courses.index')
            ->with('success', "Course \"{$title}\" deleted.");
    }

    public function updateStatus(Request $request, Course $course): RedirectResponse
    {
        $this->authorizeTutor($request, $course);

        $validated = $request->validate([
            'status' => ['required', 'in:draft,pending_review,published,archived'],
        ]);

        // Tutors can only submit for review or unpublish — only admins can directly publish
        if ($validated['status'] === 'published' && !$request->user()->isAdmin()) {
            $validated['status'] = 'pending_review';
        }

        $course->update($validated);

        return Redirect::back()
            ->with('success', "Course status changed to \"{$validated['status']}\".");
    }

    /**
     * Ensure the tutor owns this course (admins bypass).
     */
    private function authorizeTutor(Request $request, Course $course): void
    {
        $user = $request->user();
        if (!$user->isAdmin() && $course->instructor_id !== $user->id) {
            abort(403, 'You can only manage your own courses.');
        }
    }
}
