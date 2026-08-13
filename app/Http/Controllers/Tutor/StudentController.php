<?php

namespace App\Http\Controllers\Tutor;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Progress;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    public function index(Request $request, Course $course): Response
    {
        $this->authorizeTutor($request, $course);

        $enrollments = Enrollment::where('course_id', $course->id)
            ->with('user:id,full_name,email,avatar_url')
            ->withCount([
                'progress as completed_lessons_count' => fn ($q) => $q->where('status', Progress::STATUS_COMPLETED),
            ])
            ->latest('enrolled_at')
            ->paginate(20);

        // Percentages use the same denominator as the student's own view, and
        // are capped so an unpublished-lesson race cannot show 120%.
        $totalLessons = $course->total_lessons;
        $enrollments->getCollection()->transform(function ($enrollment) use ($totalLessons) {
            $enrollment->percentage = $totalLessons > 0
                ? min((int) round($enrollment->completed_lessons_count / $totalLessons * 100), 100)
                : 0;

            return $enrollment;
        });

        return Inertia::render('Tutor/Students/Index', [
            'course' => $course->only(['id', 'title', 'slug', 'total_lessons']),
            'enrollments' => $enrollments,
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
