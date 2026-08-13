<?php

namespace Tests\Feature;

use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Progress;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LearningTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: Course, 1: Lesson} */
    private function courseWithLesson(int $lessons = 1): array
    {
        $course = Course::factory()->create();
        $module = Module::factory()->create(['course_id' => $course->id]);

        $created = collect(range(1, $lessons))->map(fn ($i) => Lesson::factory()->create([
            'module_id' => $module->id,
            'order_index' => $i - 1,
        ]));

        $course->update(['total_lessons' => $lessons]);

        return [$course, $created->first()];
    }

    public function test_catalog_lists_published_courses_only(): void
    {
        $published = Course::factory()->create(['title' => 'Published Course']);
        $draft = Course::factory()->draft()->create(['title' => 'Draft Course']);

        $this->get(route('courses.index'))
            ->assertOk()
            ->assertSee($published->title)
            ->assertDontSee($draft->title);
    }

    public function test_student_can_enroll_in_a_free_course(): void
    {
        [$course] = $this->courseWithLesson();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('enroll.store', $course->slug))
            ->assertRedirect(route('learn.show', $course->slug));

        $this->assertDatabaseHas('enrollments', [
            'user_id' => $user->id,
            'course_id' => $course->id,
            'status' => Enrollment::STATUS_ACTIVE,
        ]);

        $this->assertSame(1, $course->fresh()->total_enrollments);
    }

    public function test_paid_course_enrollment_is_deferred_to_checkout(): void
    {
        $course = Course::factory()->paid()->create();

        $this->actingAs(User::factory()->create())
            ->post(route('enroll.store', $course->slug))
            ->assertRedirect(route('courses.show', $course->slug));

        $this->assertDatabaseCount('enrollments', 0);
    }

    public function test_unenrolled_user_cannot_open_the_player(): void
    {
        [$course] = $this->courseWithLesson();

        $this->actingAs(User::factory()->create())
            ->get(route('learn.show', $course->slug))
            ->assertForbidden();
    }

    public function test_enrolled_student_sees_the_player_without_the_video_id(): void
    {
        [$course, $lesson] = $this->courseWithLesson();
        $user = User::factory()->create();
        Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);

        $this->actingAs($user)
            ->get(route('learn.show', $course->slug))
            ->assertOk()
            ->assertDontSee($lesson->content_ref);
    }

    public function test_progress_auto_completes_at_ninety_percent(): void
    {
        [$course, $lesson] = $this->courseWithLesson(2);
        $user = User::factory()->create();
        $enrollment = Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);

        $this->actingAs($user)
            ->patch(route('learn.progress', $lesson), ['watch_percentage' => 91])
            ->assertRedirect();

        $this->assertDatabaseHas('progress', [
            'enrollment_id' => $enrollment->id,
            'lesson_id' => $lesson->id,
            'status' => Progress::STATUS_COMPLETED,
        ]);

        // Only one of two lessons is done, so the course stays active.
        $this->assertSame(Enrollment::STATUS_ACTIVE, $enrollment->fresh()->status);
    }

    public function test_progress_never_moves_backwards(): void
    {
        [$course, $lesson] = $this->courseWithLesson(2);
        $user = User::factory()->create();
        $enrollment = Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);

        $this->actingAs($user)->patch(route('learn.progress', $lesson), ['watch_percentage' => 40]);
        $this->actingAs($user)->patch(route('learn.progress', $lesson), ['watch_percentage' => 12]);

        $progress = Progress::where('enrollment_id', $enrollment->id)->first();

        $this->assertEquals(40, (float) $progress->watch_percentage);
    }

    public function test_completing_every_lesson_issues_a_certificate(): void
    {
        [$course, $lesson] = $this->courseWithLesson(1);
        $user = User::factory()->create();
        $enrollment = Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);

        $this->actingAs($user)->patch(route('learn.progress', $lesson), [
            'watch_percentage' => 100,
            'completed' => true,
        ]);

        $this->assertSame(Enrollment::STATUS_COMPLETED, $enrollment->fresh()->status);

        $certificate = Certificate::where('user_id', $user->id)->first();

        $this->assertNotNull($certificate);
        $this->assertStringStartsWith('GM-', $certificate->certificate_code);

        // The public verification page resolves the code.
        $this->get(route('certificate.verify', $certificate->certificate_code))
            ->assertOk()
            ->assertSee($certificate->certificate_code);
    }

    public function test_refund_removes_access_to_the_player(): void
    {
        [$course] = $this->courseWithLesson();
        $user = User::factory()->create();
        $enrollment = Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);

        $this->actingAs($user)
            ->delete(route('enroll.destroy', $enrollment))
            ->assertRedirect(route('dashboard.courses'));

        $this->actingAs($user)
            ->get(route('learn.show', $course->slug))
            ->assertForbidden();
    }
}
