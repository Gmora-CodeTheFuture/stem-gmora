<?php

namespace App\Http\Controllers\Instructor;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Home base for instructors: their courses and the students an admin
 * assigned to them.
 */
class DashboardController extends Controller
{
    public function home(Request $request): Response
    {
        $user = $request->user();

        $courses = Course::query()
            ->where('instructor_id', $user->id)
            ->withCount('enrollments')
            ->latest()
            ->get(['id', 'title', 'slug', 'status', 'category', 'difficulty', 'thumbnail_url', 'total_enrollments']);

        $students = User::query()
            ->where('assigned_instructor_id', $user->id)
            ->with(['role:id,name,display_name', 'stat:user_id,xp,level,current_streak'])
            ->withCount('enrollments')
            ->orderBy('full_name')
            ->get(['id', 'full_name', 'email', 'headline', 'avatar_url', 'role_id', 'created_at']);

        return Inertia::render('Instructor/Home', [
            'courses' => $courses,
            'students' => $students,
            'stats' => [
                'courses' => $courses->count(),
                'students' => $students->count(),
                'published_courses' => $courses->where('status', Course::STATUS_PUBLISHED)->count(),
            ],
        ]);
    }

    public function courses(Request $request): Response
    {
        $courses = Course::query()
            ->where('instructor_id', $request->user()->id)
            ->withCount('enrollments')
            ->when($request->string('search')->toString(), fn ($q, $search) => $q->whereLike('title', "%{$search}%"))
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Instructor/Courses', [
            'courses' => $courses,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function students(Request $request): Response
    {
        $students = User::query()
            ->where('assigned_instructor_id', $request->user()->id)
            ->with(['stat:user_id,xp,level,current_streak'])
            ->withCount('enrollments')
            ->when($request->string('search')->toString(), function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->whereLike('full_name', "%{$search}%")
                        ->orWhereLike('email', "%{$search}%");
                });
            })
            ->orderBy('full_name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Instructor/Students', [
            'students' => $students,
            'filters' => $request->only(['search']),
        ]);
    }
}
