<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Progress;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MyCoursesTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->create();
    }

    public function test_enrolled_tab_lists_only_the_students_courses(): void
    {
        $mine = Course::factory()->create(['title' => 'Robotics Basics']);
        Course::factory()->create(['title' => 'Someone Elses Course']);

        Enrollment::factory()->create(['user_id' => $this->student->id, 'course_id' => $mine->id]);

        $response = $this->actingAs($this->student)->get(route('dashboard.courses'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.filter', 'enrolled')
                ->has('enrolled', 1)
                ->where('enrolled.0.title', 'Robotics Basics')
                ->where('counts.enrolled', 1)
                ->where('counts.all', 2));
    }

    public function test_all_tab_lists_the_whole_catalog_and_flags_enrollment(): void
    {
        $mine = Course::factory()->create(['title' => 'Robotics Basics']);
        Course::factory()->create(['title' => 'Intro to Electronics']);
        Enrollment::factory()->create(['user_id' => $this->student->id, 'course_id' => $mine->id]);

        $this->actingAs($this->student)
            ->get(route('dashboard.courses', ['filter' => 'all']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('catalog', 2)
                ->where('catalog', fn ($catalog) => collect($catalog)
                    ->firstWhere('title', 'Robotics Basics')['is_enrolled'] === true
                    && collect($catalog)->firstWhere('title', 'Intro to Electronics')['is_enrolled'] === false));
    }

    public function test_search_matches_by_name(): void
    {
        Course::factory()->create(['title' => 'Arduino for Beginners']);
        Course::factory()->create(['title' => 'Advanced Cryptography']);

        $this->actingAs($this->student)
            ->get(route('dashboard.courses', ['filter' => 'all', 'search' => 'arduino']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('catalog', 1)
                ->where('catalog.0.title', 'Arduino for Beginners'));
    }

    public function test_search_applies_to_the_enrolled_tab_too(): void
    {
        $arduino = Course::factory()->create(['title' => 'Arduino for Beginners']);
        $crypto = Course::factory()->create(['title' => 'Advanced Cryptography']);

        foreach ([$arduino, $crypto] as $course) {
            Enrollment::factory()->create(['user_id' => $this->student->id, 'course_id' => $course->id]);
        }

        $this->actingAs($this->student)
            ->get(route('dashboard.courses', ['search' => 'crypto']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('enrolled', 1)
                ->where('enrolled.0.title', 'Advanced Cryptography'));
    }

    public function test_category_filter_narrows_the_catalog(): void
    {
        Course::factory()->create(['title' => 'Robot Arms', 'category' => 'Robotics']);
        Course::factory()->create(['title' => 'Neural Nets', 'category' => 'Artificial Intelligence']);

        $this->actingAs($this->student)
            ->get(route('dashboard.courses', ['filter' => 'all', 'category' => 'Robotics']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('catalog', 1)
                ->where('catalog.0.title', 'Robot Arms'));
    }

    public function test_unpublished_courses_stay_out_of_the_catalog(): void
    {
        Course::factory()->create(['title' => 'Live Course']);
        Course::factory()->draft()->create(['title' => 'Draft Course']);

        $this->actingAs($this->student)
            ->get(route('dashboard.courses', ['filter' => 'all']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('catalog', 1)->where('catalog.0.title', 'Live Course'));
    }

    public function test_enrolled_rows_carry_real_progress(): void
    {
        $course = Course::factory()->create(['total_lessons' => 2]);
        $module = Module::factory()->create(['course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['module_id' => $module->id]);
        Lesson::factory()->create(['module_id' => $module->id, 'order_index' => 1]);

        $enrollment = Enrollment::factory()->create([
            'user_id' => $this->student->id,
            'course_id' => $course->id,
        ]);

        Progress::create([
            'enrollment_id' => $enrollment->id,
            'lesson_id' => $lesson->id,
            'status' => Progress::STATUS_COMPLETED,
            'watch_percentage' => 100,
            'completed_at' => now(),
        ]);

        $this->actingAs($this->student)
            ->get(route('dashboard.courses'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('enrolled.0.completed_lessons_count', 1)
                ->where('enrolled.0.percentage', 50));
    }
}
