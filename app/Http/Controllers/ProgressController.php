<?php

namespace App\Http\Controllers;

use App\Services\DashboardCache;
use App\Services\StudentDashboardData;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Student progress analytics: stats, activity, badges, and per-course completion.
 */
class ProgressController extends Controller
{
    public function __construct(private readonly StudentDashboardData $dashboard) {}

    public function __invoke(Request $request): Response|\Illuminate\Http\RedirectResponse
    {
        $user = $request->user();

        if ($user->isInstructor()) {
            return redirect()->route('instructor.home');
        }

        // Reuse the same cache entry — payload is built once for home/progress.
        $full = DashboardCache::remember(
            $user->id,
            fn () => $this->dashboard->build($user),
        );

        return Inertia::render('Dashboard/Progress', [
            'stats' => $full['stats'],
            'streak' => $full['streak'],
            'badges' => $full['badges'],
            'activity' => $full['activity'],
            'enrollments' => $full['enrollments'],
            'certificates' => $full['certificates'],
        ]);
    }
}
