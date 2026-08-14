<?php

namespace App\Http\Middleware;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\Discussion;
use App\Models\DiscussionReply;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\Submission;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * [v2] Enrollment gate — the layer that sits *on top of* RBAC.
 *
 * A valid `student` role is not enough: the user must hold an active
 * enrollment for the course that owns the route's lesson/course before any
 * lesson content (and in particular any video token) is reachable.
 *
 * Resolves the course from a `lesson` or `course` route binding. The resolved
 * Enrollment is stashed on the request as `enrollment` so downstream
 * controllers do not query it again.
 */
class EnsureEnrolled
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user, 401);

        $courseId = $this->resolveCourseId($request);
        abort_if($courseId === null, 404);

        // Instructors own their course content, and admins oversee all of it;
        // neither enrols in their own courses, but both must reach the pages.
        if ($this->isCourseStaff($user, $courseId)) {
            return $next($request);
        }

        $enrollment = Enrollment::where('user_id', $user->id)
            ->where('course_id', $courseId)
            ->whereIn('status', [Enrollment::STATUS_ACTIVE, Enrollment::STATUS_COMPLETED])
            ->first();

        if (! $enrollment) {
            // Free-preview lessons are viewable without an enrollment.
            $lesson = $request->route('lesson');

            if ($lesson instanceof Lesson && $lesson->is_free_preview && $lesson->is_published) {
                return $next($request);
            }

            abort(403, 'You are not enrolled in this course.');
        }

        $request->attributes->set('enrollment', $enrollment);

        return $next($request);
    }

    private function isCourseStaff($user, string $courseId): bool
    {
        return $user->isAdmin()
            || Course::whereKey($courseId)->where('instructor_id', $user->id)->exists();
    }

    /**
     * Walks whichever bound model the route carries back to its course.
     */
    private function resolveCourseId(Request $request): ?string
    {
        foreach (['lesson', 'course', 'quiz', 'attempt', 'assignment', 'submission', 'discussion', 'reply'] as $parameter) {
            $model = $request->route($parameter);

            $courseId = match (true) {
                $model instanceof Course => $model->id,
                $model instanceof Lesson => $model->loadMissing('module')->module?->course_id,
                $model instanceof Quiz, $model instanceof Assignment => $model->course_id,
                $model instanceof QuizAttempt => $model->loadMissing('quiz')->quiz?->course_id,
                $model instanceof Submission => $model->loadMissing('assignment')->assignment?->course_id,
                $model instanceof Discussion => $model->course_id,
                $model instanceof DiscussionReply => $model->loadMissing('discussion')->discussion?->course_id,
                default => null,
            };

            if ($courseId !== null) {
                return $courseId;
            }
        }

        return null;
    }
}
