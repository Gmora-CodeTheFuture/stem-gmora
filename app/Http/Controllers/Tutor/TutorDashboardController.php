<?php

namespace App\Http\Controllers\Tutor;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\Enrollment;
use App\Models\Payment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TutorDashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $courses = $user->courses()->withCount(['enrollments', 'certificates'])->get();

        $courseIds = $courses->pluck('id');

        $totalStudents = Enrollment::whereIn('course_id', $courseIds)
            ->distinct('user_id')->count('user_id');
        $totalRevenue = Payment::whereIn('course_id', $courseIds)
            ->where('status', 'completed')->sum('amount');
        $averageRating = $courses->avg('average_rating');

        return Inertia::render('Tutor/Dashboard', [
            'stats' => [
                'total_courses' => $courses->count(),
                'published_courses' => $courses->where('status', 'published')->count(),
                'total_students' => $totalStudents,
                'total_revenue' => round($totalRevenue, 2),
                'total_certificates' => $courses->sum('certificates_count'),
                'average_rating' => round($averageRating ?? 0, 1),
            ],
            'courses' => $courses->map(fn ($c) => [
                'id' => $c->id,
                'title' => $c->title,
                'slug' => $c->slug,
                'status' => $c->status,
                'category' => $c->category,
                'thumbnail_url' => $c->thumbnail_url,
                'enrollments_count' => $c->enrollments_count,
                'total_lessons' => $c->total_lessons,
                'created_at' => $c->created_at->toIso8601String(),
            ])->values(),
        ]);
    }
}
