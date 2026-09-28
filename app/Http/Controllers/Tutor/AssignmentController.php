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
use Illuminate\Validation\ValidationException;

/**
 * Course-level assignment authoring. Creates are always drafts; publish or
 * schedule only after questions are complete.
 */
class AssignmentController extends Controller
{
    public function __construct(private readonly CurriculumGate $curriculum) {}

    public function store(Request $request, Course $course): RedirectResponse
    {
        $this->authorizeTutor($request, $course);

        $validated = $this->validateAssignment($request, $course);
        // Never publish on create — questions must be added first.
        $validated['is_published'] = false;
        $validated['publish_at'] = null;
        $validated['is_required'] = $request->boolean('is_required', false);

        $moduleId = $validated['module_id'] ?? null;
        $afterLessonId = $validated['after_lesson_id'] ?? null;
        unset($validated['module_id'], $validated['after_lesson_id'], $validated['is_published']);

        $assignment = $course->assignments()->create([
            ...$validated,
            'is_published' => false,
            'publish_at' => null,
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

        return Redirect::back()->with(
            'success',
            "Assignment \"{$assignment->title}\" saved as a draft — add questions, then publish or schedule."
        );
    }

    public function update(Request $request, Assignment $assignment): RedirectResponse
    {
        $this->authorizeTutor($request, $assignment->course);

        $validated = $this->validateAssignment($request, $assignment->course);
        $validated['is_required'] = $request->boolean('is_required', $assignment->is_required);
        // Publish state is managed via publish / schedule / unpublish endpoints.
        unset($validated['is_published'], $validated['publish_at']);

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

        if ($assignment->is_published) {
            $this->forgetDashboardCaches($assignment);
        }

        return Redirect::back()->with('success', 'Assignment updated.');
    }

    public function publish(Request $request, Assignment $assignment): RedirectResponse
    {
        $this->authorizeTutor($request, $assignment->course);
        $this->assertReady($assignment);

        $wasPublished = $assignment->is_published;

        $assignment->forceFill([
            'is_published' => true,
            'publish_at' => null,
        ])->save();

        $assignment->load('course:id,title,slug');

        if (! $wasPublished) {
            $this->notifyEnrolledStudents($assignment, $request->user()->id);
        } else {
            $this->forgetDashboardCaches($assignment);
        }

        return Redirect::back()->with(
            'success',
            "Assignment \"{$assignment->title}\" published — enrolled students have been notified."
        );
    }

    public function schedule(Request $request, Assignment $assignment): RedirectResponse
    {
        $this->authorizeTutor($request, $assignment->course);
        $this->assertReady($assignment);

        $validated = $request->validate([
            'publish_at' => ['required', 'date', 'after:now'],
        ]);

        $assignment->forceFill([
            'is_published' => false,
            'publish_at' => $validated['publish_at'],
        ])->save();

        return Redirect::back()->with(
            'success',
            "Assignment \"{$assignment->title}\" scheduled for ".
            $assignment->publish_at->timezone(config('app.timezone'))->format('M j, Y g:i A').'.'
        );
    }

    public function unpublish(Request $request, Assignment $assignment): RedirectResponse
    {
        $this->authorizeTutor($request, $assignment->course);

        $assignment->forceFill([
            'is_published' => false,
            'publish_at' => null,
        ])->save();

        $this->forgetDashboardCaches($assignment);

        return Redirect::back()->with('success', "Assignment \"{$assignment->title}\" unpublished.");
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

    private function assertReady(Assignment $assignment): void
    {
        $errors = $assignment->readinessErrors();

        if ($errors !== []) {
            throw ValidationException::withMessages([
                'questions' => $errors,
            ]);
        }
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
