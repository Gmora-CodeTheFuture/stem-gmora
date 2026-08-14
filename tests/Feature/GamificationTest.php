<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\Badge;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\Submission;
use App\Models\User;
use App\Services\LevelingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * XP, levels, streaks and badges must reflect work the student actually did —
 * previously the event existed but was never dispatched, so every dashboard
 * showed level 1 / 0 XP forever.
 */
class GamificationTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private Course $course;

    private Enrollment $enrollment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->create();
        $this->course = Course::factory()->create(['total_lessons' => 3]);
        $this->enrollment = Enrollment::factory()->create([
            'user_id' => $this->student->id,
            'course_id' => $this->course->id,
        ]);
    }

    private function lesson(): Lesson
    {
        $module = Module::factory()->create(['course_id' => $this->course->id]);

        return Lesson::factory()->create(['module_id' => $module->id]);
    }

    public function test_completing_a_lesson_awards_xp_and_starts_a_streak(): void
    {
        $lesson = $this->lesson();
        $this->lesson(); // a second lesson, so the course is not finished yet

        $this->actingAs($this->student)
            ->patch(route('learn.progress', $lesson), ['watch_percentage' => 95]);

        $stat = $this->student->fresh()->stat;

        $this->assertNotNull($stat);
        $this->assertSame(config('gamification.xp.lesson_completed'), $stat->xp);
        $this->assertSame(1, $stat->current_streak);
    }

    public function test_xp_is_only_awarded_once_per_lesson(): void
    {
        $lesson = $this->lesson();
        $this->lesson();

        $this->actingAs($this->student)->patch(route('learn.progress', $lesson), ['watch_percentage' => 95]);
        $this->actingAs($this->student)->patch(route('learn.progress', $lesson), ['watch_percentage' => 100]);

        $this->assertSame(
            config('gamification.xp.lesson_completed'),
            $this->student->fresh()->stat->xp,
        );
    }

    public function test_passing_a_quiz_awards_xp_once(): void
    {
        $quiz = Quiz::create([
            'course_id' => $this->course->id,
            'title' => 'Check-in',
            'max_attempts' => 3,
            'passing_score' => 50,
            'is_published' => true,
        ]);

        $question = Question::create([
            'quiz_id' => $quiz->id,
            'type' => Question::TYPE_MCQ,
            'body' => 'Pick one',
            'options' => [['text' => 'Right', 'is_correct' => true], ['text' => 'Wrong']],
            'correct_answer' => [0],
            'points' => 1,
            'order_index' => 0,
        ]);

        foreach (range(1, 2) as $i) {
            $this->actingAs($this->student)->post(route('quiz.start', $quiz));
            $attempt = QuizAttempt::where('user_id', $this->student->id)
                ->where('status', QuizAttempt::STATUS_IN_PROGRESS)
                ->firstOrFail();

            $this->actingAs($this->student)->post(route('quiz.submit', $attempt), [
                'answers' => [$question->id => [0]],
            ]);
        }

        // Two passes, one award.
        $this->assertSame(
            config('gamification.xp.quiz_passed'),
            $this->student->fresh()->stat->xp,
        );
    }

    public function test_grading_an_assignment_awards_xp_to_the_student(): void
    {
        $instructor = User::factory()->instructor()->create();
        $this->course->update(['instructor_id' => $instructor->id]);

        $assignment = Assignment::create([
            'course_id' => $this->course->id,
            'title' => 'Project',
            'max_marks' => 100,
            'is_published' => true,
        ]);

        $this->actingAs($this->student)->post(route('assignments.submit', $assignment), [
            'type' => 'repo',
            'repo_url' => 'https://github.com/student/project',
        ]);

        $this->actingAs($instructor)->patch(
            route('instructor.grade-submission', Submission::firstOrFail()),
            ['marks_awarded' => 90, 'status' => 'graded'],
        );

        $this->assertSame(
            config('gamification.xp.assignment_graded'),
            $this->student->fresh()->stat->xp,
        );
    }

    public function test_finishing_a_course_awards_the_completion_bonus(): void
    {
        $this->course->update(['total_lessons' => 1]);
        $lesson = $this->lesson();

        $this->actingAs($this->student)->patch(route('learn.progress', $lesson), [
            'watch_percentage' => 100,
            'completed' => true,
        ]);

        $expected = config('gamification.xp.lesson_completed') + config('gamification.xp.course_completed');

        $this->assertSame($expected, $this->student->fresh()->stat->xp);
        $this->assertSame(Enrollment::STATUS_COMPLETED, $this->enrollment->refresh()->status);
    }

    public function test_levels_follow_the_xp_curve(): void
    {
        $leveling = app(LevelingService::class);

        $this->assertSame(1, $leveling->levelFor(0));
        $this->assertSame(1, $leveling->levelFor(99));
        $this->assertSame(2, $leveling->levelFor(100));
        $this->assertSame(3, $leveling->levelFor(400));
        $this->assertSame(4, $leveling->levelFor(900));
        $this->assertSame(1, $leveling->xpToNextLevel(99));
    }

    public function test_badges_are_awarded_when_their_criteria_are_met(): void
    {
        $badge = Badge::create([
            'name' => 'First Steps',
            'description' => 'Completed your first lesson.',
            'type' => 'progress',
            'criteria' => ['metric' => 'lessons_completed', 'threshold' => 1],
        ]);

        Badge::create([
            'name' => 'Far Off',
            'description' => 'Completed 500 lessons.',
            'type' => 'progress',
            'criteria' => ['metric' => 'lessons_completed', 'threshold' => 500],
        ]);

        $this->actingAs($this->student)
            ->patch(route('learn.progress', $this->lesson()), ['watch_percentage' => 95]);

        $held = $this->student->fresh()->badges;

        $this->assertCount(1, $held);
        $this->assertSame($badge->id, $held->first()->id);

        // And the student is told about it. Other notifications (a certificate,
        // for instance) can land in the same second, so match on content.
        $titles = $this->student->fresh()->notifications->pluck('data.title');

        $this->assertContains('Badge earned: First Steps', $titles);
    }

    public function test_a_badge_is_never_awarded_twice(): void
    {
        Badge::create([
            'name' => 'First Steps',
            'description' => 'Completed your first lesson.',
            'type' => 'progress',
            'criteria' => ['metric' => 'lessons_completed', 'threshold' => 1],
        ]);

        $this->actingAs($this->student)->patch(route('learn.progress', $this->lesson()), ['watch_percentage' => 95]);
        $this->actingAs($this->student)->patch(route('learn.progress', $this->lesson()), ['watch_percentage' => 95]);

        $this->assertCount(1, $this->student->fresh()->badges);
    }

    public function test_the_dashboard_reports_the_real_level_and_streak(): void
    {
        $lesson = $this->lesson();
        $this->lesson();

        $this->actingAs($this->student)->patch(route('learn.progress', $lesson), ['watch_percentage' => 95]);

        $this->actingAs($this->student)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('stats.xp', config('gamification.xp.lesson_completed'))
                ->where('stats.level', 1)
                ->where('streak.current', 1)
                ->where('stats.lessons_completed', 1));
    }
}
