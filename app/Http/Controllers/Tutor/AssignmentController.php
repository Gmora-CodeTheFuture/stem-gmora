<?php

namespace App\Http\Controllers\Tutor;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use App\Notifications\AssignmentPublished;
use App\Services\CurriculumGate;
use App\Services\DashboardCache;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;

/**
 * Course-level assignment authoring with optional curriculum placement
 * between lessons and nested question banks.
 */
class AssignmentController extends Controller
{
    public function __construct(private readonly CurriculumGate $curriculum) {}

    public function store(Request $request, Course $course): RedirectResponse
    {
        $this->authorizeTutor($request, $course);

        $validated = $this->validateAssignment($request, $course);
        $validated['is_published'] = $request->boolean('is_published', true);
        $validated['is_required'] = $request->boolean('is_required', false);

        $moduleId = $validated['module_id'] ?? null;
        $afterLessonId = $validated['after_lesson_id'] ?? null;
        unset($validated['module_id'], $validated['after_lesson_id']);

        $assignment = $course->assignments()->create([
            ...$validated,
            'module_id' => null,
            'order_index' => 0,
        ]);

        if ($moduleId) {
            $module = Module::where('course_id', $course->id)->findOrFail($moduleId);
            $afterLesson = $afterLessonId
                ? Lesson::where('module_id', $module->id)->findOrFail($afterLessonId)
                : null;
            $this->curriculum->placeAfterLesson($assignment, $module, $afterLesson);
        }

        $assignment->load('course:id,title,slug');

        if ($assignment->is_published) {
            $this->notifyEnrolledStudents($assignment, $request->user()->id);
        }

        return Redirect::back()->with(
            'success',
            $assignment->is_published
                ? "Assignment \"{$assignment->title}\" published — enrolled students have been notified."
                : "Assignment \"{$assignment->title}\" saved as a draft."
        );
    }

    public function update(Request $request, Assignment $assignment): RedirectResponse
    {
        $this->authorizeTutor($request, $assignment->course);

        $wasPublished = $assignment->is_published;
        $validated = $this->validateAssignment($request, $assignment->course);
        $validated['is_published'] = $request->boolean('is_published', $wasPublished);
        $validated['is_required'] = $request->boolean('is_required', $assignment->is_required);

        $moduleId = array_key_exists('module_id', $validated) ? $validated['module_id'] : $assignment->module_id;
        $afterLessonId = $validated['after_lesson_id'] ?? null;
        $placementTouched = $request->has('module_id') || $request->has('after_lesson_id');
        unset($validated['module_id'], $validated['after_lesson_id']);

        $assignment->update($validated);
        $assignment->load('course:id,title,slug');

        if ($placementTouched) {
            if ($moduleId) {
                $module = Module::where('course_id', $assignment->course_id)->findOrFail($moduleId);
                $afterLesson = $afterLessonId
                    ? Lesson::where('module_id', $module->id)->findOrFail($afterLessonId)
                    : null;
                $this->curriculum->placeAfterLesson($assignment, $module, $afterLesson);
            } else {
                $this->curriculum->clearPlacement($assignment);
            }
        }

        if ($assignment->is_published && ! $wasPublished) {
            $this->notifyEnrolledStudents($assignment, $request->user()->id);
        } elseif ($assignment->is_published) {
            $this->forgetDashboardCaches($assignment);
        }

        return Redirect::back()->with('success', 'Assignment updated.');
    }

    public function destroy(Request $request, Assignment $assignment): RedirectResponse
    {
        $this->authorizeTutor($request, $assignment->course);

        $title = $assignment->title;
        $courseId = $assignment->course_id;
        $assignment->delete();

        $this->forgetDashboardCachesForCourse($courseId);

        return Redirect::back()->with('success', "Assignment \"{$title}\" deleted.");
    }

    /** @return array<string, mixed> */
    private function validateAssignment(Request $request, Course $course): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'deadline_at' => ['nullable', 'date'],
            'max_marks' => ['required', 'integer', 'min:1', 'max:1000'],
            'is_published' => ['sometimes', 'boolean'],
            'is_required' => ['sometimes', 'boolean'],
            'lesson_id' => ['nullable', 'uuid', 'exists:lessons,id'],
            'module_id' => [
                'nullable',
                'uuid',
                Rule::exists('modules', 'id')->where('course_id', $course->id),
            ],
            'after_lesson_id' => [
                'nullable',
                'uuid',
                'exists:lessons,id',
            ],
        ]);
    }

    private function authorizeTutor(Request $request, Course $course): void
    {
        $user = $request->user();
        if (! $user->isAdmin() && $course->instructor_id !== $user->id) {
            abort(403, 'You can only manage your own courses.');
        }
    }

    private function notifyEnrolledStudents(Assignment $assignment, string $actorId): void
    {
        $userIds = Enrollment::where('course_id', $assignment->course_id)
            ->whereIn('status', [Enrollment::STATUS_ACTIVE, Enrollment::STATUS_COMPLETED])
            ->pluck('user_id')
            ->reject(fn (string $id) => $id === $actorId)
            ->values();

        if ($userIds->isEmpty()) {
            return;
        }

        $students = User::whereIn('id', $userIds)->get();
        Notification::send($students, new AssignmentPublished($assignment));

        foreach ($userIds as $userId) {
            DashboardCache::forget($userId);
        }
    }

    private function forgetDashboardCaches(Assignment $assignment): void
    {
        $this->forgetDashboardCachesForCourse($assignment->course_id);
    }

    private function forgetDashboardCachesForCourse(string $courseId): void
    {
        $userIds = Enrollment::where('course_id', $courseId)
            ->whereIn('status', [Enrollment::STATUS_ACTIVE, Enrollment::STATUS_COMPLETED])
            ->pluck('user_id');

        foreach ($userIds as $userId) {
            DashboardCache::forget($userId);
        }
    }
}
