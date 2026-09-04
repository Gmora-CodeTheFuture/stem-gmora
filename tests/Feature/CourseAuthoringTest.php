<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\LiveSession;
use App\Models\Module;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseAuthoringTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Course $course;

    private Module $module;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create();
        $this->course = Course::factory()->create(['instructor_id' => $this->admin->id]);
        $this->module = Module::factory()->create(['course_id' => $this->course->id]);
    }

    public function test_creating_a_quiz_lesson_creates_a_quiz_stub(): void
    {
        $this->actingAs($this->admin)->post(route('tutor.lessons.store', $this->module), [
            'title' => 'Module quiz',
            'type' => Lesson::TYPE_QUIZ,
        ])->assertRedirect();

        $lesson = Lesson::where('title', 'Module quiz')->firstOrFail();
        $this->assertDatabaseHas('quizzes', [
            'lesson_id' => $lesson->id,
            'course_id' => $this->course->id,
        ]);
    }

    public function test_author_can_add_questions_and_publish_a_quiz(): void
    {
        $lesson = Lesson::factory()->create([
            'module_id' => $this->module->id,
            'type' => Lesson::TYPE_QUIZ,
            'content_ref' => null,
        ]);
        $quiz = Quiz::create([
            'course_id' => $this->course->id,
            'lesson_id' => $lesson->id,
            'title' => 'Check',
            'max_attempts' => 2,
            'passing_score' => 50,
            'is_published' => false,
        ]);

        $this->actingAs($this->admin)->post(route('tutor.questions.store', $quiz), [
            'type' => Question::TYPE_MCQ,
            'body' => 'Capital of France?',
            'points' => 1,
            'options' => [
                ['text' => 'Paris', 'is_correct' => true],
                ['text' => 'Lyon', 'is_correct' => false],
            ],
        ])->assertRedirect();

        $this->actingAs($this->admin)->patch(route('tutor.quizzes.update', $quiz), [
            'title' => 'Check',
            'max_attempts' => 2,
            'passing_score' => 50,
            'is_published' => true,
        ])->assertRedirect();

        $this->assertTrue($quiz->refresh()->is_published);
        $this->assertSame(1, $quiz->questions()->count());
    }

    public function test_author_can_create_an_assignment(): void
    {
        $this->actingAs($this->admin)->post(route('tutor.assignments.store', $this->course), [
            'title' => 'Build a model',
            'description' => 'Train and evaluate.',
            'deadline_at' => now()->addWeek()->toDateTimeString(),
            'max_marks' => 100,
            'is_published' => true,
        ])->assertRedirect();

        $this->assertDatabaseHas('assignments', [
            'course_id' => $this->course->id,
            'title' => 'Build a model',
            'max_marks' => 100,
        ]);
        $this->assertInstanceOf(Assignment::class, Assignment::first());
    }

    public function test_author_can_configure_a_live_session(): void
    {
        $lesson = Lesson::factory()->create([
            'module_id' => $this->module->id,
            'type' => Lesson::TYPE_LIVE,
            'content_ref' => null,
        ]);

        $this->actingAs($this->admin)->patch(route('tutor.lessons.live-session', $lesson), [
            'title' => 'Office hours',
            'scheduled_start' => now()->addDays(3)->toDateTimeString(),
            'duration_minutes' => 45,
            'zoom_join_url' => 'https://zoom.us/j/123456789',
        ])->assertRedirect();

        $this->assertDatabaseHas('live_sessions', [
            'lesson_id' => $lesson->id,
            'title' => 'Office hours',
            'duration_minutes' => 45,
        ]);
        $this->assertInstanceOf(LiveSession::class, LiveSession::first());
    }
}
