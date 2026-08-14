<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Progress;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create();
    }

    public function test_only_admins_can_open_reports(): void
    {
        $this->actingAs(User::factory()->create())->get(route('admin.reports.index'))->assertForbidden();
        $this->actingAs(User::factory()->instructor()->create())->get(route('admin.reports.index'))->assertForbidden();
        $this->actingAs($this->admin)->get(route('admin.reports.index'))->assertOk();
    }

    public function test_headline_figures_come_from_real_rows(): void
    {
        $course = Course::factory()->create(['total_lessons' => 2]);
        $module = Module::factory()->create(['course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['module_id' => $module->id]);

        $student = User::factory()->create();
        $enrollment = Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);

        Progress::create([
            'enrollment_id' => $enrollment->id,
            'lesson_id' => $lesson->id,
            'status' => Progress::STATUS_COMPLETED,
            'watch_percentage' => 100,
            'completed_at' => now(),
        ]);

        $this->actingAs($this->admin)
            ->get(route('admin.reports.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('headline.enrollments', 1)
                ->where('headline.active_learners', 1)
                ->where('headline.published_courses', 1)
                ->has('courses', 1)
                // One of two lessons done by the only enrolled learner.
                ->where('courses.0.average_progress', 50));
    }

    public function test_the_series_covers_the_whole_window_with_no_gaps(): void
    {
        $this->actingAs($this->admin)
            ->get(route('admin.reports.index', ['days' => 7]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('days', 7)
                ->has('signups', 7)
                ->has('enrollments', 7)
                ->has('completions', 7));
    }

    public function test_an_unsupported_window_falls_back_to_thirty_days(): void
    {
        $this->actingAs($this->admin)
            ->get(route('admin.reports.index', ['days' => 4000]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('days', 30)->has('signups', 30));
    }

    public function test_quiz_pass_rate_is_measured_against_each_quizzes_own_mark(): void
    {
        $course = Course::factory()->create();
        $quiz = Quiz::create([
            'course_id' => $course->id,
            'title' => 'Check',
            'max_attempts' => 3,
            'passing_score' => 60,
            'is_published' => true,
        ]);

        Question::create([
            'quiz_id' => $quiz->id,
            'type' => Question::TYPE_MCQ,
            'body' => 'Pick',
            'options' => [['text' => 'Right', 'is_correct' => true], ['text' => 'Wrong']],
            'correct_answer' => [0],
            'points' => 1,
            'order_index' => 0,
        ]);

        foreach ([80, 40] as $score) {
            QuizAttempt::create([
                'user_id' => User::factory()->create()->id,
                'quiz_id' => $quiz->id,
                'answers' => [],
                'score' => $score,
                'points_earned' => 1,
                'points_possible' => 1,
                'status' => QuizAttempt::STATUS_GRADED,
                'started_at' => now(),
                'submitted_at' => now(),
            ]);
        }

        $this->actingAs($this->admin)
            ->get(route('admin.reports.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('assessment.quiz_attempts', 2)
                ->where('assessment.quiz_pass_rate', 50)
                ->where('assessment.quiz_average', 60));
    }

    public function test_revenue_is_reported_as_unavailable_rather_than_zero(): void
    {
        $this->actingAs($this->admin)
            ->get(route('admin.reports.index'))
            ->assertOk()
            ->assertSee('No payment provider is connected');
    }
}
