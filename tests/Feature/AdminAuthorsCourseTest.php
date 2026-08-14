<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Gmora publishes its own courses, not only tutors' — so an admin has to be
 * able to drive the course builder from an empty draft to a live course
 * without going through the review queue they themselves staff.
 */
class AdminAuthorsCourseTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create();
    }

    private function draft(): Course
    {
        $this->actingAs($this->admin)->post(route('tutor.courses.store'), [
            'title' => 'Gmora Foundations of Robotics',
            'description' => str_repeat('A genuinely useful description of the course. ', 3),
            'category' => 'Robotics',
            'difficulty' => 'beginner',
            'language' => 'en',
            'price' => 0,
            'currency' => 'LKR',
        ])->assertSessionHasNoErrors();

        return Course::where('title', 'Gmora Foundations of Robotics')->firstOrFail();
    }

    public function test_an_admin_can_open_the_builder(): void
    {
        $this->actingAs($this->admin)->get(route('tutor.courses.index'))->assertOk();
        $this->actingAs($this->admin)->get(route('tutor.dashboard'))->assertOk();
    }

    public function test_a_course_an_admin_creates_is_owned_by_them_and_starts_as_a_draft(): void
    {
        $course = $this->draft();

        $this->assertSame($this->admin->id, $course->instructor_id);
        $this->assertSame(Course::STATUS_DRAFT, $course->status);

        // And it shows up in their own builder list, not just the admin console.
        $this->actingAs($this->admin)
            ->get(route('tutor.courses.index'))
            ->assertInertia(fn ($page) => $page->where('courses.data.0.id', $course->id));
    }

    public function test_the_builder_shows_the_readiness_checklist(): void
    {
        $course = $this->draft();

        $this->actingAs($this->admin)
            ->get(route('tutor.courses.edit', $course))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('canPublishDirectly', true)
                ->where('readiness.blocking', fn ($blocking) => $blocking > 0)
                ->has('readiness.checks'));
    }

    public function test_an_admin_cannot_publish_an_empty_course_from_the_builder(): void
    {
        $course = $this->draft();

        $this->actingAs($this->admin)
            ->patch(route('tutor.courses.status', $course), ['status' => Course::STATUS_PUBLISHED])
            ->assertSessionHas('error');

        $this->assertSame(Course::STATUS_DRAFT, $course->refresh()->status);
    }

    public function test_an_admin_takes_a_course_from_draft_to_published(): void
    {
        $course = $this->draft();

        // Build the curriculum through the same endpoints the UI uses.
        $this->actingAs($this->admin)->post(route('tutor.modules.store', $course), [
            'title' => 'Getting started',
        ])->assertSessionHasNoErrors();

        $module = Module::where('course_id', $course->id)->firstOrFail();

        $this->actingAs($this->admin)->post(route('tutor.lessons.store', $module), [
            'title' => 'What a robot is',
            'type' => 'youtube',
            'content_ref' => 'aircAruvnKk',
            'duration_seconds' => 600,
        ])->assertSessionHasNoErrors();

        $lesson = Lesson::where('module_id', $module->id)->firstOrFail();

        // Both have to be published before students can see anything.
        $this->actingAs($this->admin)->patch(route('tutor.modules.update', $module), [
            'title' => $module->title,
            'is_published' => true,
        ])->assertSessionHasNoErrors();

        $this->actingAs($this->admin)->patch(route('tutor.lessons.update', $lesson), [
            'title' => $lesson->title,
            'type' => $lesson->type,
            'is_published' => true,
        ])->assertSessionHasNoErrors();

        // An admin publishes directly — no review queue.
        $this->actingAs($this->admin)
            ->patch(route('tutor.courses.status', $course), ['status' => Course::STATUS_PUBLISHED])
            ->assertSessionHasNoErrors();

        $this->assertSame(Course::STATUS_PUBLISHED, $course->refresh()->status);
        $this->assertSame(1, $course->total_lessons);

        // And a student can now find it and enrol.
        $student = User::factory()->create();

        $this->actingAs($student)
            ->post(route('enroll.store', $course->slug))
            ->assertRedirect(route('learn.show', $course->slug));

        $this->actingAs($student)
            ->get(route('learn.show', $course->slug))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Learn/Show')
                ->where('currentLesson.title', 'What a robot is'));
    }

    public function test_a_tutor_still_has_to_go_through_review(): void
    {
        $tutor = User::factory()->instructor()->create();

        $course = Course::factory()->draft()->create(['instructor_id' => $tutor->id]);
        $module = Module::factory()->create(['course_id' => $course->id, 'is_published' => true]);
        Lesson::factory()->create([
            'module_id' => $module->id,
            'is_published' => true,
            'content_ref' => 'aircAruvnKk',
            'duration_seconds' => 600,
        ]);
        $course->update(['description' => str_repeat('A genuinely useful description. ', 5)]);

        $this->actingAs($tutor)
            ->patch(route('tutor.courses.status', $course), ['status' => Course::STATUS_PUBLISHED]);

        // Downgraded to the queue rather than going live.
        $this->assertSame(Course::STATUS_PENDING_REVIEW, $course->refresh()->status);
    }

    public function test_a_lesson_can_be_edited_after_it_is_created(): void
    {
        // The builder could create lessons but never edit them, so a lesson
        // saved without a duration blocked publishing with no way to fix it.
        $course = $this->draft();

        $this->actingAs($this->admin)->post(route('tutor.modules.store', $course), ['title' => 'Module one']);
        $module = Module::where('course_id', $course->id)->firstOrFail();

        $this->actingAs($this->admin)->post(route('tutor.lessons.store', $module), [
            'title' => 'Typo in the title',
            'type' => 'youtube',
            'content_ref' => 'aircAruvnKk',
            'duration_seconds' => 0,
        ]);

        $lesson = Lesson::where('module_id', $module->id)->firstOrFail();
        $this->assertSame(0, $lesson->duration_seconds);

        $this->actingAs($this->admin)
            ->patch(route('tutor.lessons.update', $lesson), [
                'title' => 'Fixed title',
                'type' => 'youtube',
                'content_ref' => '',
                'duration_seconds' => 600,
                'is_free_preview' => true,
            ])
            ->assertSessionHasNoErrors();

        $lesson->refresh();

        $this->assertSame('Fixed title', $lesson->title);
        $this->assertSame(600, $lesson->duration_seconds);
        $this->assertTrue($lesson->is_free_preview);
        // An empty content_ref means "unchanged", never "erase the video".
        $this->assertSame('aircAruvnKk', $lesson->getRawOriginal('content_ref'));
    }

    public function test_a_module_can_be_renamed(): void
    {
        $course = $this->draft();

        $this->actingAs($this->admin)->post(route('tutor.modules.store', $course), ['title' => 'Modle one']);
        $module = Module::where('course_id', $course->id)->firstOrFail();

        $this->actingAs($this->admin)
            ->patch(route('tutor.modules.update', $module), [
                'title' => 'Module one',
                'description' => 'Where we start.',
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame('Module one', $module->refresh()->title);
        $this->assertSame('Where we start.', $module->description);
    }

    public function test_a_student_cannot_reach_the_builder(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('tutor.courses.index'))
            ->assertForbidden();
    }
}
