<?php

namespace App\Http\Controllers;

use App\Services\DashboardCache;
use App\Services\StudentDashboardData;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The student home: progress summary, resume learning, and upcoming work.
 */
class DashboardController extends Controller
{
    public function __construct(private readonly StudentDashboardData $dashboard) {}

    public function __invoke(Request $request): Response|\Illuminate\Http\RedirectResponse
    {
        $user = $request->user();

        if ($user->isInstructor()) {
            return redirect()->route('instructor.home');
        }

        return Inertia::render('Dashboard', DashboardCache::remember(
            $user->id,
            fn () => $this->dashboard->build($user),
        ));
    }
}
