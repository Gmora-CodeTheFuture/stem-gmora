<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Progress;
use App\Models\QuizAttempt;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Platform reporting (Plan §10.3).
 *
 * Everything here is computed from real rows — enrollments, progress, quiz
 * attempts, submissions. Where a number cannot be known yet (revenue, since no
 * payment provider is connected), it is reported as such rather than shown as
 * a confident zero.
 */
class ReportsController extends Controller
{
    public function index(Request $request): Response
    {
        $days = (int) ($request->integer('days') ?: 30);
        $days = in_array($days, [7, 30, 90], true) ? $days : 30;

        $since = now()->subDays($days)->startOfDay();

        $report = Cache::remember(
            "reports:{$days}:".now()->format('Y-m-d-H'),
            now()->addMinutes(30),
            fn () => $this->build($since, $days),
        );

        return Inertia::render('Admin/Reports/Index', [
            'days' => $days,
            ...$report,
        ]);
    }

    /** @return array<string, mixed> */
    private function build(Carbon $since, int $days): array
    {
        return [
            'headline' => $this->headline($since),
            'signups' => $this->dailySeries(User::query(), 'created_at', $since, $days),
            'enrollments' => $this->dailySeries(Enrollment::query(), 'enrolled_at', $since, $days),
            'completions' => $this->dailySeries(
                Progress::where('status', Progress::STATUS_COMPLETED),
                'completed_at',
                $since,
                $days,
            ),
            'courses' => $this->coursePerformance(),
            'assessment' => $this->assessment($since),
            'unavailable' => [
                // Stated plainly rather than reported as zero revenue.
                'revenue' => 'No payment provider is connected yet, so revenue cannot be reported.',
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function headline(Carbon $since): array
    {
        $activeLearners = Progress::where('updated_at', '>=', $since)
            ->distinct('enrollment_id')
            ->count('enrollment_id');

        $completedEnrollments = Enrollment::where('status', Enrollment::STATUS_COMPLETED)->count();
        $totalEnrollments = Enrollment::count();

        return [
            'users' => User::count(),
            'new_users' => User::where('created_at', '>=', $since)->count(),
            'enrollments' => $totalEnrollments,
            'new_enrollments' => Enrollment::where('enrolled_at', '>=', $since)->count(),
            'active_learners' => $activeLearners,
            'certificates' => Certificate::count(),
            'completion_rate' => $totalEnrollments > 0
                ? (int) round($completedEnrollments / $totalEnrollments * 100)
                : 0,
            'published_courses' => Course::where('status', Course::STATUS_PUBLISHED)->count(),
        ];
    }

    /**
     * A day-by-day count, with empty days filled in so the chart has no gaps.
     *
     * @return array<int, array{date: string, count: int}>
     */
    private function dailySeries($query, string $column, Carbon $since, int $days): array
    {
        $counts = $query->where($column, '>=', $since)
            ->get([$column])
            ->groupBy(fn ($row) => Carbon::parse($row->{$column})->toDateString())
            ->map->count();

        return collect(range($days - 1, 0))
            ->map(function (int $ago) use ($counts) {
                $date = now()->subDays($ago)->toDateString();

                return ['date' => $date, 'count' => (int) $counts->get($date, 0)];
            })
            ->all();
    }

    /**
     * Per-course health: enrollments, how far people actually get, and how
     * many finish.
     *
     * @return array<int, array<string, mixed>>
     */
    private function coursePerformance(): array
    {
        return Course::query()
            ->where('status', Course::STATUS_PUBLISHED)
            ->withCount([
                'enrollments',
                'enrollments as completed_count' => fn ($q) => $q->where('status', Enrollment::STATUS_COMPLETED),
                'certificates',
            ])
            ->orderByDesc('enrollments_count')
            ->limit(15)
            ->get()
            ->map(function (Course $course) {
                $lessonsDone = Progress::where('status', Progress::STATUS_COMPLETED)
                    ->whereIn('enrollment_id', Enrollment::where('course_id', $course->id)->select('id'))
                    ->count();

                $possible = $course->enrollments_count * max($course->total_lessons, 1);

                return [
                    'id' => $course->id,
                    'title' => $course->title,
                    'enrollments' => $course->enrollments_count,
                    'completed' => $course->completed_count,
                    'certificates' => $course->certificates_count,
                    'completion_rate' => $course->enrollments_count > 0
                        ? (int) round($course->completed_count / $course->enrollments_count * 100)
                        : 0,
                    // How much of the course the average enrolled learner has done.
                    'average_progress' => $possible > 0 ? (int) round($lessonsDone / $possible * 100) : 0,
                ];
            })
            ->all();
    }

    /** @return array<string, mixed> */
    private function assessment(Carbon $since): array
    {
        $attempts = QuizAttempt::where('status', '!=', QuizAttempt::STATUS_IN_PROGRESS)
            ->where('submitted_at', '>=', $since);

        $graded = (clone $attempts)->whereNotNull('score');

        return [
            'quiz_attempts' => (clone $attempts)->count(),
            'quiz_average' => round((float) (clone $graded)->avg('score'), 1),
            'quiz_pass_rate' => $this->passRate($since),
            'submissions' => Submission::where('created_at', '>=', $since)->count(),
            'awaiting_grading' => Submission::where('status', 'pending')->count(),
            'graded_last_period' => Submission::where('graded_at', '>=', $since)->count(),
        ];
    }

    /** Share of finished attempts that met their quiz's own pass mark. */
    private function passRate(Carbon $since): int
    {
        $row = QuizAttempt::query()
            ->join('quizzes', 'quizzes.id', '=', 'quiz_attempts.quiz_id')
            ->where('quiz_attempts.status', '!=', QuizAttempt::STATUS_IN_PROGRESS)
            ->where('quiz_attempts.submitted_at', '>=', $since)
            ->selectRaw('count(*) as total')
            ->selectRaw('sum(case when quiz_attempts.score >= quizzes.passing_score then 1 else 0 end) as passed')
            ->first();

        $total = (int) ($row->total ?? 0);

        return $total > 0 ? (int) round(((int) $row->passed) / $total * 100) : 0;
    }
}
