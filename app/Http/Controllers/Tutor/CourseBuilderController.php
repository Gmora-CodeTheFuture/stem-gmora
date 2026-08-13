<?php

namespace App\Http\Controllers\Tutor;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Course;
use App\Services\CourseContentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class CourseBuilderController extends Controller
{
    public function __construct(private readonly CourseContentService $content) {}

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
        $validated['slug'] = $this->content->uniqueSlug($validated['title']);
        $validated['status'] = Course::STATUS_DRAFT;

        $course = Course::create($validated);

        return Redirect::route('tutor.courses.edit', $course)
            ->with('success', "Course \"{$course->title}\" created. Now add modules and lessons.");
    }

    public function edit(Request $request, Course $course): Response
    {
        $this->authorizeTutor($request, $course);

        $course->load([
            'modules' => fn ($q) => $q->orderBy('order_index'),
            'modules.lessons' => fn ($q) => $q->orderBy('order_index'),
            'modules.lessons.liveSession',
            'modules.lessons.quiz:id,lesson_id,title,is_published',
        ]);

        // `content_ref` is hidden from every student-facing response; the tutor
        // who owns the course is the one audience that must see it to edit it.
        $course->modules->each(
            fn ($module) => $module->lessons->each->makeVisible('content_ref')
        );

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
        $this->content->deleteCourse($course);

        AuditLog::record('course.deleted', 'course', $course->id, ['title' => $title], $request->user()->id);

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
        if ($validated['status'] === 'published' && ! $request->user()->isAdmin()) {
            $validated['status'] = 'pending_review';
        }

        $previous = $course->status;
        $course->update($validated);
        $this->content->syncCounters($course);

        AuditLog::record('course.status_changed', 'course', $course->id, [
            'from' => $previous,
            'to' => $validated['status'],
        ], $request->user()->id);

        return Redirect::back()
            ->with('success', "Course status changed to \"{$validated['status']}\".");
    }

    /**
     * Ensure the tutor owns this course (admins bypass).
     */
    private function authorizeTutor(Request $request, Course $course): void
    {
        $user = $request->user();
        if (! $user->isAdmin() && $course->instructor_id !== $user->id) {
            abort(403, 'You can only manage your own courses.');
        }
    }
}
