<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use App\Services\CourseContentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regression cover for a course that reached students with nothing in it.
 *
 * Three modules and four lessons were authored but never published — the
 * builder had no toggle to do so. The course was then published from a status
 * control that, unlike the review queue, ran no readiness check, and the first
 * student to enrol was redirected into a hard 404.
 */
class CoursePublishingGateTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $instructor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create();
        $this->instructor = User::factory()->admin()->create();
    }

    /** A course whose content exists but is all still in draft. */
    private function unpublishedContent(): Course
    {
        $course = Course::factory()->draft()->create([
            'instructor_id' => $this->instructor->id,
            'description' => str_repeat('A genuinely useful description of the course. ', 3),
        ]);

        $module = Module::factory()->create(['course_id' => $course->id, 'is_published' => false]);
        Lesson::factory()->create([
            'module_id' => $module->id,
            'is_published' => false,
            'content_ref' => 'aircAruvnKk',
            'duration_seconds' => 600,
        ]);

        return $course->refresh();
    }

    public function test_the_status_control_will_not_publish_an_empty_course(): void
    {
        $course = $this->unpublishedContent();

        $this->actingAs($this->admin)
            ->patch(route('tutor.courses.status', $course), ['status' => Course::STATUS_PUBLISHED])
            ->assertSessionHas('error');

        $this->assertSame(Course::STATUS_DRAFT, $course->refresh()->status);
    }

    public function test_it_still_publishes_a_course_that_is_ready(): void
    {
        $course = $this->unpublishedContent();
        $course->modules->each->update(['is_published' => true]);
        Lesson::query()->update(['is_published' => true]);
        app(CourseContentService::class)->syncCounters($course);

        $this->actingAs($this->admin)
            ->patch(route('tutor.courses.status', $course), ['status' => Course::STATUS_PUBLISHED])
            ->assertSessionHasNoErrors();

        $this->assertSame(Course::STATUS_PUBLISHED, $course->refresh()->status);
    }

    public function test_other_statuses_are_never_gated(): void
    {
        $course = $this->unpublishedContent();

        $this->actingAs($this->admin)
            ->patch(route('tutor.courses.status', $course), ['status' => Course::STATUS_ARCHIVED]);

        $this->assertSame(Course::STATUS_ARCHIVED, $course->refresh()->status);
    }

    public function test_a_published_course_can_still_be_re_saved_as_published(): void
    {
        // Re-affirming the current status must not trip the gate, or an admin
        // could not touch the dropdown on a course whose tutor later unpublished
        // a module.
        $course = $this->unpublishedContent();
        $course->update(['status' => Course::STATUS_PUBLISHED]);

        $this->actingAs($this->admin)
            ->patch(route('tutor.courses.status', $course), ['status' => Course::STATUS_PUBLISHED])
            ->assertSessionHasNoErrors();

        $this->assertSame(Course::STATUS_PUBLISHED, $course->refresh()->status);
    }

    public function test_an_enrolled_student_sees_an_explanation_rather_than_a_404(): void
    {
        $course = $this->unpublishedContent();
        $course->update(['status' => Course::STATUS_PUBLISHED]);

        $student = User::factory()->create();
        Enrollment::create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'status' => Enrollment::STATUS_ACTIVE,
            'enrolled_at' => now(),
        ]);

        $this->actingAs($student)
            ->get(route('learn.show', $course->slug))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Learn/Empty')
                ->where('course.title', $course->title)
                ->where('instructor', $this->instructor->full_name));
    }

    public function test_enrolling_in_such_a_course_still_succeeds(): void
    {
        $course = $this->unpublishedContent();
        $course->update(['status' => Course::STATUS_PUBLISHED, 'price' => 0]);

        $student = User::factory()->create();

        $this->actingAs($student)
            ->post(route('enroll.store', $course->slug))
            ->assertRedirect(route('learn.show', $course->slug));

        $this->assertDatabaseHas('enrollments', [
            'user_id' => $student->id,
            'course_id' => $course->id,
            'status' => Enrollment::STATUS_ACTIVE,
        ]);
    }

    public function test_a_tutor_can_publish_a_module_and_a_lesson(): void
    {
        // The toggles the builder was missing; without these the course above
        // could never have become legitimately publishable.
        $course = $this->unpublishedContent();
        $module = $course->modules->first();
        $lesson = $module->lessons()->first();

        $this->actingAs($this->instructor)
            ->patch(route('tutor.modules.update', $module), [
                'title' => $module->title,
                'is_published' => true,
            ])
            ->assertSessionHasNoErrors();

        $this->actingAs($this->instructor)
            ->patch(route('tutor.lessons.update', $lesson), [
                'title' => $lesson->title,
                'type' => $lesson->type,
                'is_published' => true,
            ])
            ->assertSessionHasNoErrors();

        $this->assertTrue($module->refresh()->is_published);
        $this->assertTrue($lesson->refresh()->is_published);
        $this->assertSame(1, $course->refresh()->total_lessons);
    }
}
