<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regressions for the course-authoring bugs found in the tutor/admin panels.
 */
class CourseAuthoringTest extends TestCase
{
    use RefreshDatabase;

    private User $instructor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->instructor = User::factory()->instructor()->create();
    }

    /** @return array<string, mixed> */
    private function coursePayload(array $overrides = []): array
    {
        return [
            'title' => 'Intro to Robotics',
            'category' => 'Robotics',
            'difficulty' => 'beginner',
            'language' => 'en',
            'price' => 0,
            'currency' => 'USD',
            ...$overrides,
        ];
    }

    public function test_two_courses_with_the_same_title_do_not_collide(): void
    {
        $this->actingAs($this->instructor)
            ->post(route('tutor.courses.store'), $this->coursePayload())
            ->assertSessionHasNoErrors();

        // Previously this hit a UNIQUE constraint on courses.slug and 500'd.
        $this->actingAs($this->instructor)
            ->post(route('tutor.courses.store'), $this->coursePayload())
            ->assertSessionHasNoErrors();

        $slugs = Course::pluck('slug');

        $this->assertCount(2, $slugs);
        $this->assertSame($slugs->unique()->count(), $slugs->count());
    }

    public function test_editing_a_lesson_does_not_erase_its_video_id(): void
    {
        $course = Course::factory()->create(['instructor_id' => $this->instructor->id]);
        $module = Module::factory()->create(['course_id' => $course->id]);
        $lesson = Lesson::factory()->create([
            'module_id' => $module->id,
            'content_ref' => 'aircAruvnKk',
        ]);

        // The edit form submits an empty string when the field is untouched.
        $this->actingAs($this->instructor)
            ->patch(route('tutor.lessons.update', $lesson), [
                'title' => 'Renamed lesson',
                'type' => 'youtube',
                'content_ref' => '',
                'is_published' => true,
            ])
            ->assertSessionHasNoErrors();

        $lesson->refresh();

        $this->assertSame('aircAruvnKk', $lesson->content_ref);
        $this->assertSame('Renamed lesson', $lesson->title);
    }

    public function test_a_new_video_id_still_replaces_the_old_one(): void
    {
        $course = Course::factory()->create(['instructor_id' => $this->instructor->id]);
        $module = Module::factory()->create(['course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['module_id' => $module->id, 'content_ref' => 'old-id']);

        $this->actingAs($this->instructor)->patch(route('tutor.lessons.update', $lesson), [
            'title' => $lesson->title,
            'type' => 'youtube',
            'content_ref' => 'new-video-id',
        ]);

        $this->assertSame('new-video-id', $lesson->refresh()->content_ref);
    }

    public function test_a_video_lesson_cannot_be_published_without_a_video(): void
    {
        $course = Course::factory()->create(['instructor_id' => $this->instructor->id]);
        $module = Module::factory()->create(['course_id' => $course->id]);
        $lesson = Lesson::factory()->create([
            'module_id' => $module->id,
            'content_ref' => null,
            'is_published' => false,
        ]);

        $this->actingAs($this->instructor)
            ->patch(route('tutor.lessons.update', $lesson), [
                'title' => $lesson->title,
                'type' => 'youtube',
                'is_published' => true,
            ])
            ->assertSessionHas('error');

        $this->assertFalse($lesson->refresh()->is_published);
    }

    public function test_the_tutor_can_see_the_video_id_they_own(): void
    {
        $course = Course::factory()->create(['instructor_id' => $this->instructor->id]);
        $module = Module::factory()->create(['course_id' => $course->id]);
        Lesson::factory()->create(['module_id' => $module->id, 'content_ref' => 'aircAruvnKk']);

        $this->actingAs($this->instructor)
            ->get(route('tutor.courses.edit', $course))
            ->assertOk()
            ->assertSee('aircAruvnKk');
    }

    public function test_deleting_a_module_removes_its_lessons_and_fixes_the_count(): void
    {
        $course = Course::factory()->create(['instructor_id' => $this->instructor->id]);

        $keep = Module::factory()->create(['course_id' => $course->id, 'is_published' => true]);
        $drop = Module::factory()->create(['course_id' => $course->id, 'is_published' => true]);

        Lesson::factory()->count(2)->create(['module_id' => $keep->id, 'is_published' => true]);
        Lesson::factory()->count(3)->create(['module_id' => $drop->id, 'is_published' => true]);

        $this->actingAs($this->instructor)
            ->delete(route('tutor.modules.destroy', $drop))
            ->assertSessionHasNoErrors();

        // Lessons under the deleted module must not survive as orphans...
        $this->assertSame(0, Lesson::where('module_id', $drop->id)->count());

        // ...and the counter students' progress divides by must be correct.
        $this->assertSame(2, $course->refresh()->total_lessons);
    }

    public function test_lesson_counts_only_include_published_content(): void
    {
        $course = Course::factory()->create(['instructor_id' => $this->instructor->id]);
        $module = Module::factory()->create(['course_id' => $course->id, 'is_published' => true]);

        Lesson::factory()->create(['module_id' => $module->id, 'is_published' => true]);
        $draft = Lesson::factory()->create(['module_id' => $module->id, 'is_published' => false]);

        // Touch the draft so counters recalculate.
        $this->actingAs($this->instructor)->patch(route('tutor.lessons.update', $draft), [
            'title' => $draft->title,
            'type' => 'youtube',
            'is_published' => false,
        ]);

        $this->assertSame(1, $course->refresh()->total_lessons);
    }

    public function test_unpublishing_a_module_drops_its_lessons_from_the_count(): void
    {
        $course = Course::factory()->create(['instructor_id' => $this->instructor->id]);
        $module = Module::factory()->create(['course_id' => $course->id, 'is_published' => true]);
        Lesson::factory()->count(2)->create(['module_id' => $module->id, 'is_published' => true]);

        $this->actingAs($this->instructor)->patch(route('tutor.modules.update', $module), [
            'title' => $module->title,
            'is_published' => false,
        ]);

        $this->assertSame(0, $course->refresh()->total_lessons);
    }

    public function test_a_tutor_cannot_touch_another_tutors_course(): void
    {
        $course = Course::factory()->create();
        $module = Module::factory()->create(['course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['module_id' => $module->id]);

        $this->actingAs($this->instructor)
            ->patch(route('tutor.lessons.update', $lesson), ['title' => 'Hijacked', 'type' => 'youtube'])
            ->assertForbidden();

        $this->actingAs($this->instructor)
            ->delete(route('tutor.modules.destroy', $module))
            ->assertForbidden();

        $this->actingAs($this->instructor)
            ->get(route('tutor.courses.edit', $course))
            ->assertForbidden();
    }

    public function test_a_tutor_cannot_publish_a_course_directly(): void
    {
        $course = Course::factory()->draft()->create(['instructor_id' => $this->instructor->id]);

        $this->actingAs($this->instructor)
            ->patch(route('tutor.courses.status', $course), ['status' => 'published']);

        // Tutors submit for review; only admins publish (Plan §8.9).
        $this->assertSame(Course::STATUS_PENDING_REVIEW, $course->refresh()->status);
    }

    public function test_deleting_a_course_takes_its_modules_and_lessons_with_it(): void
    {
        $course = Course::factory()->create(['instructor_id' => $this->instructor->id]);
        $module = Module::factory()->create(['course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['module_id' => $module->id]);

        $this->actingAs($this->instructor)->delete(route('tutor.courses.destroy', $course));

        $this->assertSoftDeleted($course);
        $this->assertSoftDeleted($module);
        $this->assertSoftDeleted($lesson);
    }

    public function test_students_never_receive_content_ref_from_the_catalog(): void
    {
        $course = Course::factory()->create(['instructor_id' => $this->instructor->id]);
        $module = Module::factory()->create(['course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['module_id' => $module->id, 'content_ref' => 'secret-video']);

        $student = User::factory()->create();
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);

        $this->actingAs($student)->get(route('learn.show', $course->slug))->assertDontSee('secret-video');
        $this->get(route('courses.show', $course->slug))->assertDontSee('secret-video');
    }
}
