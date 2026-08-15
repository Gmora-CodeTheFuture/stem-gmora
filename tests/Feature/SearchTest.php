<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Discussion;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SearchTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->create();
    }

    public function test_it_finds_published_courses_by_title(): void
    {
        Course::factory()->create(['title' => 'Arduino for Beginners']);
        Course::factory()->create(['title' => 'Advanced Cryptography']);

        $this->actingAs($this->student)
            ->get(route('dashboard.search', ['q' => 'arduino']))
            ->assertOk()
            ->assertJson(fn ($json) => $json
                ->has('results.courses', 1)
                ->where('results.courses.0.title', 'Arduino for Beginners')
                ->where('total', 1)->etc());
    }

    public function test_search_is_case_insensitive(): void
    {
        Course::factory()->create(['title' => 'Robotics Foundations']);

        foreach (['robotics', 'ROBOTICS', 'RoBoTiCs'] as $term) {
            $this->actingAs($this->student)
                ->get(route('dashboard.search', ['q' => $term]))
                ->assertOk()
                ->assertJson(fn ($json) => $json->has('results.courses', 1)->etc());
        }
    }

    public function test_draft_courses_never_surface(): void
    {
        Course::factory()->draft()->create(['title' => 'Secret Draft Course']);

        $this->actingAs($this->student)
            ->get(route('dashboard.search', ['q' => 'secret']))
            ->assertOk()
            ->assertJson(fn ($json) => $json->where('total', 0)->etc());
    }

    public function test_lessons_only_surface_for_enrolled_learners(): void
    {
        $course = Course::factory()->create(['title' => 'Neural Networks']);
        $module = Module::factory()->create(['course_id' => $course->id, 'is_published' => true]);
        Lesson::factory()->create([
            'module_id' => $module->id,
            'title' => 'Backpropagation explained',
            'is_published' => true,
        ]);

        // Not enrolled: the lesson is invisible.
        $this->actingAs($this->student)
            ->get(route('dashboard.search', ['q' => 'backpropagation']))
            ->assertOk()
            ->assertJson(fn ($json) => $json->has('results.lessons', 0)->etc());

        Enrollment::factory()->create(['user_id' => $this->student->id, 'course_id' => $course->id]);

        $this->actingAs($this->student)
            ->get(route('dashboard.search', ['q' => 'backpropagation']))
            ->assertOk()
            ->assertJson(fn ($json) => $json
                ->has('results.lessons', 1)
                ->where('results.lessons.0.title', 'Backpropagation explained')->etc());
    }

    public function test_lesson_results_never_carry_the_video_id(): void
    {
        $course = Course::factory()->create();
        $module = Module::factory()->create(['course_id' => $course->id, 'is_published' => true]);
        $lesson = Lesson::factory()->create([
            'module_id' => $module->id,
            'title' => 'Gradient descent',
            'content_ref' => 'super-secret-video',
            'is_published' => true,
        ]);

        Enrollment::factory()->create(['user_id' => $this->student->id, 'course_id' => $course->id]);

        $this->actingAs($this->student)
            ->get(route('dashboard.search', ['q' => 'gradient']))
            ->assertOk()
            ->assertDontSee($lesson->content_ref);
    }

    public function test_discussions_only_surface_from_boards_you_can_open(): void
    {
        $mine = Course::factory()->create();
        $theirs = Course::factory()->create();

        Enrollment::factory()->create(['user_id' => $this->student->id, 'course_id' => $mine->id]);

        Discussion::create([
            'course_id' => $mine->id,
            'user_id' => $this->student->id,
            'title' => 'Overfitting question',
            'body' => 'Why does validation lag?',
            'last_activity_at' => now(),
        ]);

        Discussion::create([
            'course_id' => $theirs->id,
            'user_id' => User::factory()->create()->id,
            'title' => 'Overfitting elsewhere',
            'body' => 'Different course entirely.',
            'last_activity_at' => now(),
        ]);

        $this->actingAs($this->student)
            ->get(route('dashboard.search', ['q' => 'overfitting']))
            ->assertOk()
            ->assertJson(fn ($json) => $json
                ->has('results.discussions', 1)
                ->where('results.discussions.0.title', 'Overfitting question')->etc())
            ->assertDontSee('Overfitting elsewhere');
    }

    public function test_a_single_character_query_is_ignored(): void
    {
        Course::factory()->create(['title' => 'Anything']);

        $this->actingAs($this->student)
            ->get(route('dashboard.search', ['q' => 'a']))
            ->assertOk()
            ->assertJson(fn ($json) => $json->where('total', 0)->etc());
    }

    public function test_search_requires_signing_in(): void
    {
        $this->get(route('dashboard.search', ['q' => 'anything']))->assertRedirect(route('login'));
    }
}
