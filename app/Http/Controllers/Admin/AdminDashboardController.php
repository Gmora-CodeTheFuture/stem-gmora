<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $now = Carbon::now();

        // KPI stats
        $totalUsers = User::count();
        $totalCourses = Course::count();
        $publishedCourses = Course::where('status', Course::STATUS_PUBLISHED)->count();
        $totalEnrollments = Enrollment::count();
        $activeEnrollments = Enrollment::where('status', Enrollment::STATUS_ACTIVE)->count();
        $totalCertificates = Certificate::count();
        $totalRevenue = Payment::where('status', 'completed')->sum('amount');
        $monthlyRevenue = Payment::where('status', 'completed')
            ->where('created_at', '>=', $now->copy()->startOfMonth())
            ->sum('amount');

        // New signups over last 30 days
        $signups = collect(range(29, 0))->map(function (int $daysAgo) use ($now) {
            $date = $now->copy()->subDays($daysAgo)->toDateString();

            return [
                'date' => $date,
                'count' => User::whereDate('created_at', $date)->count(),
            ];
        })->all();

        // Recent users
        $recentUsers = User::with('role')
            ->latest()
            ->take(5)
            ->get(['id', 'full_name', 'email', 'avatar_url', 'role_id', 'created_at']);

        // Recent courses
        $recentCourses = Course::with('instructor:id,full_name')
            ->latest()
            ->take(5)
            ->get(['id', 'title', 'slug', 'status', 'instructor_id', 'total_enrollments', 'created_at']);

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'total_users' => $totalUsers,
                'total_courses' => $totalCourses,
                'published_courses' => $publishedCourses,
                'total_enrollments' => $totalEnrollments,
                'active_enrollments' => $activeEnrollments,
                'total_certificates' => $totalCertificates,
                'total_revenue' => round($totalRevenue, 2),
                'monthly_revenue' => round($monthlyRevenue, 2),
            ],
            'signups' => $signups,
            'recentUsers' => $recentUsers,
            'recentCourses' => $recentCourses,
        ]);
    }
}
