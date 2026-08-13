<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\User;
use App\Services\CourseContentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class CourseManagementController extends Controller
{
    public function __construct(private readonly CourseContentService $content) {}

    public function index(Request $request): Response
    {
        $query = Course::with('instructor:id,full_name')
            ->withCount('enrollments');

        if ($search = $request->input('search')) {
            $query->where('title', 'like', "%{$search}%");
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        if ($instructorId = $request->input('instructor')) {
            $query->where('instructor_id', $instructorId);
        }

        $courses = $query->latest()->paginate(20)->withQueryString();

        $categories = Course::select('category')->distinct()->pluck('category');
        $instructors = User::whereHas('role', fn ($q) => $q->where('name', 'instructor'))
            ->get(['id', 'full_name']);

        return Inertia::render('Admin/Courses/Index', [
            'courses' => $courses,
            'categories' => $categories,
            'instructors' => $instructors,
            'filters' => $request->only(['search', 'status', 'category', 'instructor']),
        ]);
    }

    public function create(): Response
    {
        $instructors = User::whereHas('role', fn ($q) => $q->whereIn('name', ['instructor', 'course_manager']))
            ->get(['id', 'full_name']);

        return Inertia::render('Admin/Courses/Create', [
            'instructors' => $instructors,
        ]);
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
            'instructor_id' => ['required', 'exists:users,id'],
            'thumbnail_url' => ['nullable', 'string'],
        ]);

        $validated['slug'] = $this->content->uniqueSlug($validated['title']);
        $validated['status'] = Course::STATUS_DRAFT;

        $course = Course::create($validated);

        AuditLog::record('course.created', 'course', $course->id, [
            'title' => $course->title,
            'instructor_id' => $course->instructor_id,
        ], $request->user()->id);

        return Redirect::route('admin.courses.index')
            ->with('success', "Course \"{$course->title}\" created.");
    }

    public function show(Course $course): Response
    {
        $course->load([
            'instructor:id,full_name,email',
            'modules' => fn ($q) => $q->orderBy('order_index'),
            'modules.lessons' => fn ($q) => $q->orderBy('order_index'),
            'enrollments' => fn ($q) => $q->latest()->take(10),
            'enrollments.user:id,full_name,email',
        ]);
        $course->loadCount(['enrollments', 'certificates']);

        return Inertia::render('Admin/Courses/Show', [
            'course' => $course,
        ]);
    }

    public function edit(Course $course): Response
    {
        $course->load('instructor:id,full_name');
        $instructors = User::whereHas('role', fn ($q) => $q->whereIn('name', ['instructor', 'course_manager']))
            ->get(['id', 'full_name']);

        return Inertia::render('Admin/Courses/Edit', [
            'course' => $course,
            'instructors' => $instructors,
        ]);
    }

    public function update(Request $request, Course $course): RedirectResponse
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
            'instructor_id' => ['required', 'exists:users,id'],
            'thumbnail_url' => ['nullable', 'string'],
        ]);

        $previousInstructor = $course->instructor_id;

        $course->update($validated);

        if ($previousInstructor !== $course->instructor_id) {
            AuditLog::record('course.instructor_changed', 'course', $course->id, [
                'from' => $previousInstructor,
                'to' => $course->instructor_id,
            ], $request->user()->id);
        }

        return Redirect::route('admin.courses.index')
            ->with('success', "Course \"{$course->title}\" updated.");
    }

    public function destroy(Request $request, Course $course): RedirectResponse
    {
        $title = $course->title;
        $this->content->deleteCourse($course);

        AuditLog::record('course.deleted', 'course', $course->id, ['title' => $title], $request->user()->id);

        return Redirect::route('admin.courses.index')
            ->with('success', "Course \"{$title}\" deleted.");
    }

    public function updateStatus(Request $request, Course $course): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:draft,pending_review,published,archived'],
        ]);

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
}
