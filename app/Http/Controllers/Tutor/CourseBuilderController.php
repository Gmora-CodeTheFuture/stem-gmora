<?php

namespace App\Http\Controllers\Tutor;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\Lesson;
use App\Notifications\CourseSubmittedForReview;
use App\Services\CourseContentService;
use App\Services\CourseReadiness;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CourseBuilderController extends Controller
{
    public function __construct(
        private readonly CourseContentService $content,
        private readonly CourseReadiness $readiness,
    ) {}

    /**
     * Admins see every course. Instructors only see courses assigned to them.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $courses = Course::query()
            ->with('instructor:id,full_name')
            ->withCount('enrollments')
            ->when(! $user->isAdmin(), fn ($q) => $q->where('instructor_id', $user->id))
            ->when($request->string('search')->toString(), fn ($q, $search) => $q->whereLike('title', "%{$search}%"))
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->when($request->string('category')->toString(), fn ($q, $category) => $q->where('category', $category))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Tutor/Courses/Index', [
            'courses' => $courses,
            'categories' => Course::select('category')->distinct()->orderBy('category')->pluck('category'),
            'filters' => $request->only(['search', 'status', 'category']),
            'canCreate' => $user->isAdmin(),
        ]);
    }

    public function create(Request $request): Response
    {
        abort_unless($request->user()->isAdmin(), 403);

        $instructors = User::query()
            ->whereHas('role', fn ($q) => $q->where('name', Role::INSTRUCTOR))
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'email']);

        return Inertia::render('Tutor/Courses/Create', [
            'instructors' => $instructors,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $request->merge([
            'instructor_id' => $request->input('instructor_id') ?: null,
        ]);

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
            'instructor_id' => [
                'nullable',
                'uuid',
                Rule::exists('users', 'id')->where(function ($query) {
                    $query->whereExists(function ($inner) {
                        $inner->selectRaw('1')
                            ->from('roles')
                            ->whereColumn('roles.id', 'users.role_id')
                            ->whereIn('roles.name', [Role::INSTRUCTOR, Role::ADMIN]);
                    });
                }),
            ],
        ]);

        $validated['instructor_id'] = $validated['instructor_id'] ?? $request->user()->id;
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
            'modules.lessons.quiz.questions',
            'modules.lessons.presentation:id,lesson_id,original_filename',
            'assignments' => fn ($q) => $q->orderByDesc('created_at'),
        ]);

        // `content_ref` is hidden from every student-facing response; the tutor
        // who owns the course is the one audience that must see it to edit it.
        $course->modules->each(function ($module) {
            $module->lessons->each(function ($lesson) {
                $lesson->makeVisible('content_ref');

                // So the builder can say whether a file is already attached.
                $lesson->setAttribute('has_presentation', $lesson->presentation !== null);
                $lesson->setAttribute(
                    'has_pdf',
                    $lesson->type === Lesson::TYPE_PDF && filled($lesson->getRawOriginal('content_ref')),
                );

                // Authors need the answer key while editing questions.
                $lesson->quiz?->questions?->each->makeVisible('correct_answer');
            });
        });

        return Inertia::render('Tutor/Courses/Edit', [
            'course' => $course,
            // The same checklist the review queue applies, shown while authoring
            // so nobody discovers the blockers only at publish time.
            'readiness' => $this->readiness->for($course),
            'canPublishDirectly' => $request->user()->isAdmin(),
            'instructors' => $request->user()->isAdmin()
                ? User::query()
                    ->whereHas('role', fn ($q) => $q->whereIn('name', [Role::INSTRUCTOR, Role::ADMIN]))
                    ->orderBy('full_name')
                    ->get(['id', 'full_name', 'email'])
                : [],
            'canAssignInstructor' => $request->user()->isAdmin(),
        ]);
    }

    public function update(Request $request, Course $course): RedirectResponse
    {
        $this->authorizeTutor($request, $course);

        $rules = [
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'category' => ['required', 'string', 'max:100'],
            'difficulty' => ['required', 'in:beginner,intermediate,advanced'],
            'language' => ['required', 'string', 'max:10'],
            'price' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'max:3'],
            'thumbnail_url' => ['nullable', 'string'],
        ];

        if ($request->user()->isAdmin()) {
            $rules['instructor_id'] = [
                'required',
                'uuid',
                Rule::exists('users', 'id')->where(function ($query) {
                    $query->whereExists(function ($inner) {
                        $inner->selectRaw('1')
                            ->from('roles')
                            ->whereColumn('roles.id', 'users.role_id')
                            ->whereIn('roles.name', [Role::INSTRUCTOR, Role::ADMIN]);
                    });
                }),
            ];
        }

        $validated = $request->validate($rules);

        $course->update($validated);

        return Redirect::back()->with('success', 'Course updated.');
    }

    /**
     * Upload a cover image.
     *
     * Course covers are shown to visitors on the catalog, so they live on the
     * public disk. The field also accepts a URL, but pasting one is how a
     * YouTube link ended up rendering as a broken image.
     */
    public function uploadImage(Request $request, Course $course): RedirectResponse
    {
        $this->authorizeTutor($request, $course);

        $request->validate([
            'image' => ['required', 'image', 'mimes:jpeg,png,webp', 'max:4096'], // 4 MB
        ]);

        $previous = $course->thumbnail_url;

        $path = $request->file('image')->store('course-covers', 'public');

        $course->update(['thumbnail_url' => Storage::disk('public')->url($path)]);

        // Replacing the cover should not leave the old file behind, but only
        // ever delete something we stored ourselves.
        if ($previous && str_contains($previous, '/storage/course-covers/')) {
            $old = 'course-covers/'.basename(parse_url($previous, PHP_URL_PATH) ?: '');
            if (Storage::disk('public')->exists($old)) {
                Storage::disk('public')->delete($old);
            }
        }

        return Redirect::back()->with('success', 'Cover image updated.');
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

        // An admin publishing their own course skips the review queue, so the
        // readiness bar has to be enforced here too — otherwise a first-party
        // course goes live with nothing published inside it.
        if ($validated['status'] === Course::STATUS_PUBLISHED
            && $course->status !== Course::STATUS_PUBLISHED
            && $this->readiness->for($course)['blocking'] > 0) {
            return Redirect::back()
                ->with('error', 'This course is not ready to publish — check it has published lessons first.');
        }

        $previous = $course->status;

        // Entering the queue records when, and clears the last review's notes.
        if ($validated['status'] === Course::STATUS_PENDING_REVIEW) {
            $validated['submitted_for_review_at'] = now();
            $validated['review_notes'] = null;
        }

        $course->update($validated);
        $this->content->syncCounters($course);

        AuditLog::record('course.status_changed', 'course', $course->id, [
            'from' => $previous,
            'to' => $validated['status'],
        ], $request->user()->id);

        if ($validated['status'] === Course::STATUS_PENDING_REVIEW
            && $previous !== Course::STATUS_PENDING_REVIEW) {
            User::whereHas('role', fn ($q) => $q->where('name', Role::ADMIN))
                ->whereKeyNot($request->user()->id)
                ->each(fn (User $admin) => $admin->notify(new CourseSubmittedForReview($course)));
        }

        return Redirect::back()
            ->with('success', "Course status changed to \"{$validated['status']}\".");
    }

    /**
     * Ensure the instructor owns this course (admins bypass).
     */
    private function authorizeTutor(Request $request, Course $course): void
    {
        $user = $request->user();
        if (! $user->isAdmin() && $course->instructor_id !== $user->id) {
            abort(403, 'You can only manage your own courses.');
        }
    }
}
