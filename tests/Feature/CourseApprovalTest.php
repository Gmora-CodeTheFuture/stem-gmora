<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use App\Notifications\CourseReviewed;
use App\Services\CourseContentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CourseApprovalTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $instructor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create();
        $this->instructor = User::factory()->instructor()->create();
    }

    /** A course that passes every automated check. */
    private function readyCourse(): Course
    {
        $course = Course::factory()->create([
            'instructor_id' => $this->instructor->id,
            'status' => Course::STATUS_PENDING_REVIEW,
            'description' => str_repeat('A genuinely useful description of the course. ', 3),
            'submitted_for_review_at' => now(),
        ]);

        $module = Module::factory()->create(['course_id' => $course->id, 'is_published' => true]);
        Lesson::factory()->create([
            'module_id' => $module->id,
            'is_published' => true,
            'content_ref' => 'aircAruvnKk',
            'duration_seconds' => 600,
        ]);

        app(CourseContentService::class)->syncCounters($course);

        return $course->refresh();
    }

    public function test_only_admins_can_open_the_queue(): void
    {
        $this->actingAs($this->instructor)->get(route('admin.approvals.index'))->assertForbidden();
        $this->actingAs($this->admin)->get(route('admin.approvals.index'))->assertOk();
    }

    public function test_the_queue_lists_submitted_courses_with_their_checklist(): void
    {
        $this->readyCourse();
        Course::factory()->draft()->create(['title' => 'Still a draft']);

        $this->actingAs($this->admin)
            ->get(route('admin.approvals.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('pending', 1)
                ->where('pending.0.readiness.blocking', 0)
                ->has('pending.0.readiness.checks', 7))
            ->assertDontSee('Still a draft');
    }

    public function test_approving_publishes_the_course_and_tells_the_instructor(): void
    {
        $course = $this->readyCourse();

        $this->actingAs($this->admin)
            ->patch(route('admin.approvals.approve', $course))
            ->assertSessionHasNoErrors();

        $this->assertSame(Course::STATUS_PUBLISHED, $course->refresh()->status);
        $this->assertNotNull($course->reviewed_at);
        $this->assertSame($this->admin->id, $course->reviewed_by);

        $notification = $this->instructor->fresh()->notifications()->first();
        $this->assertSame(CourseReviewed::class, $notification->type);
        $this->assertStringContainsString('is published', $notification->data['title']);

        $this->assertDatabaseHas('audit_logs', ['action' => 'course.approved']);
    }

    public function test_a_course_failing_its_checks_cannot_be_published(): void
    {
        $course = Course::factory()->create([
            'instructor_id' => $this->instructor->id,
            'status' => Course::STATUS_PENDING_REVIEW,
            'description' => null,
        ]);

        $this->actingAs($this->admin)
            ->patch(route('admin.approvals.approve', $course))
            ->assertSessionHas('error');

        $this->assertSame(Course::STATUS_PENDING_REVIEW, $course->refresh()->status);
    }

    public function test_a_video_lesson_without_a_video_blocks_publishing(): void
    {
        $course = $this->readyCourse();

        Lesson::factory()->create([
            'module_id' => $course->modules->first()->id,
            'is_published' => true,
            'content_ref' => null,
        ]);

        $this->actingAs($this->admin)
            ->patch(route('admin.approvals.approve', $course))
            ->assertSessionHas('error');

        $this->assertSame(Course::STATUS_PENDING_REVIEW, $course->refresh()->status);
    }

    public function test_requesting_changes_returns_it_to_draft_with_notes(): void
    {
        $course = $this->readyCourse();

        $this->actingAs($this->admin)
            ->patch(route('admin.approvals.reject', $course), [
                'review_notes' => 'Please add captions to lesson two before we publish this.',
            ])
            ->assertSessionHasNoErrors();

        $course->refresh();

        $this->assertSame(Course::STATUS_DRAFT, $course->status);
        $this->assertStringContainsString('captions', $course->review_notes);

        $notification = $this->instructor->fresh()->notifications()->first();
        $this->assertStringContainsString('Changes requested', $notification->data['title']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'course.changes_requested']);
    }

    public function test_rejection_requires_a_reason(): void
    {
        $course = $this->readyCourse();

        $this->actingAs($this->admin)
            ->patch(route('admin.approvals.reject', $course), ['review_notes' => 'no'])
            ->assertSessionHasErrors('review_notes');

        $this->assertSame(Course::STATUS_PENDING_REVIEW, $course->refresh()->status);
    }

    public function test_a_course_not_in_the_queue_cannot_be_actioned(): void
    {
        $course = Course::factory()->create(['status' => Course::STATUS_PUBLISHED]);

        $this->actingAs($this->admin)
            ->patch(route('admin.approvals.approve', $course))
            ->assertStatus(409);
    }

    public function test_submitting_stamps_the_queue_and_clears_old_notes(): void
    {
        $course = Course::factory()->draft()->create([
            'instructor_id' => $this->instructor->id,
            'review_notes' => 'Old feedback from last time',
        ]);

        $this->actingAs($this->instructor)
            ->patch(route('tutor.courses.status', $course), ['status' => 'pending_review']);

        $course->refresh();

        $this->assertSame(Course::STATUS_PENDING_REVIEW, $course->status);
        $this->assertNotNull($course->submitted_for_review_at);
        $this->assertNull($course->review_notes);
    }
}
