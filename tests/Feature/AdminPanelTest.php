<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Role;
use App\Models\User;
use App\Models\VideoAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminPanelTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $secondAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create();
        $this->secondAdmin = User::factory()->admin()->create();
    }

    public function test_students_cannot_reach_the_admin_panel(): void
    {
        $this->actingAs(User::factory()->create())->get(route('admin.dashboard'))->assertForbidden();
        $this->actingAs(User::factory()->create())->get(route('admin.users.index'))->assertForbidden();
    }

    public function test_admin_pages_render(): void
    {
        $course = Course::factory()->create();

        foreach ([
            route('admin.dashboard'),
            route('admin.users.index'),
            route('admin.users.show', $this->secondAdmin),
            route('admin.users.edit', $this->secondAdmin),
            route('tutor.courses.index'),
            route('tutor.courses.create'),
            route('tutor.courses.edit', $course),
            route('admin.enrollments.index'),
            route('admin.payments.index'),
            route('admin.badges.index'),
        ] as $url) {
            $this->actingAs($this->admin)->get($url)->assertOk();
        }
    }

    public function test_an_admin_cannot_delete_their_own_account(): void
    {
        $this->actingAs($this->admin)
            ->delete(route('admin.users.destroy', $this->admin))
            ->assertSessionHas('error');

        $this->assertNotNull(User::find($this->admin->id));
    }

    public function test_the_last_admin_cannot_be_deleted(): void
    {
        // Leave exactly one admin standing, then try to remove them.
        $this->secondAdmin->delete();

        $survivor = User::factory()->admin()->create();

        $this->actingAs($survivor)
            ->delete(route('admin.users.destroy', $this->admin))
            ->assertSessionHasNoErrors();

        // Now $survivor is the only admin left and cannot be removed by anyone.
        $this->actingAs($survivor)
            ->delete(route('admin.users.destroy', $survivor))
            ->assertSessionHas('error');

        $this->assertNotNull(User::find($survivor->id));
    }

    public function test_the_last_admin_cannot_be_demoted(): void
    {
        $this->secondAdmin->delete();

        $this->actingAs($this->admin)
            ->patch(route('admin.users.update', $this->admin), [
                'full_name' => $this->admin->full_name,
                'email' => $this->admin->email,
                'role_id' => Role::where('name', Role::STUDENT)->value('id'),
            ])
            ->assertForbidden();

        $this->assertTrue($this->admin->refresh()->isAdmin());
    }

    public function test_nobody_can_change_their_own_role(): void
    {
        $this->actingAs($this->secondAdmin)
            ->patch(route('admin.users.update', $this->secondAdmin), [
                'full_name' => $this->secondAdmin->full_name,
                'email' => $this->secondAdmin->email,
                'role_id' => Role::where('name', Role::STUDENT)->value('id'),
            ])
            ->assertForbidden();
    }

    public function test_role_changes_are_audited(): void
    {
        $target = User::factory()->create();

        // Student promoted to admin — the mutation that matters most.
        $this->actingAs($this->admin)
            ->patch(route('admin.users.update', $target), [
                'full_name' => $target->full_name,
                'email' => $target->email,
                'role_id' => Role::where('name', Role::ADMIN)->value('id'),
            ])
            ->assertSessionHasNoErrors();

        $this->assertTrue($target->refresh()->isAdmin());
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.role_changed',
            'entity_id' => $target->id,
            'actor_id' => $this->admin->id,
        ]);
    }

    public function test_granting_an_enrollment_updates_the_course_counter(): void
    {
        $course = Course::factory()->create(['total_enrollments' => 0]);
        $student = User::factory()->create();

        $this->actingAs($this->admin)
            ->post(route('admin.enrollments.store'), [
                'user_id' => $student->id,
                'course_id' => $course->id,
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(1, $course->refresh()->total_enrollments);
        $this->assertDatabaseHas('audit_logs', ['action' => 'enrollment.granted']);
    }

    public function test_a_refunded_enrollment_can_be_re_granted(): void
    {
        $course = Course::factory()->create();
        $student = User::factory()->create();

        Enrollment::factory()->refunded()->create([
            'user_id' => $student->id,
            'course_id' => $course->id,
        ]);

        $this->actingAs($this->admin)
            ->post(route('admin.enrollments.store'), [
                'user_id' => $student->id,
                'course_id' => $course->id,
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame(
            Enrollment::STATUS_ACTIVE,
            Enrollment::where('user_id', $student->id)->firstOrFail()->status,
        );
    }

    public function test_suspending_an_enrollment_revokes_live_video_tickets(): void
    {
        $course = Course::factory()->create();
        $module = Module::factory()->create(['course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['module_id' => $module->id]);

        $student = User::factory()->create();
        $enrollment = Enrollment::factory()->create([
            'user_id' => $student->id,
            'course_id' => $course->id,
        ]);

        $ticket = $this->actingAs($student)
            ->postJson(route('api.video-token.issue', $lesson))
            ->json('data.ticket');

        $this->actingAs($this->admin)
            ->patch(route('admin.enrollments.update', $enrollment), ['status' => 'suspended'])
            ->assertSessionHasNoErrors();

        $this->assertNotNull(VideoAccessToken::firstOrFail()->revoked_at);

        $this->actingAs($student)
            ->getJson(route('api.video-token.heartbeat', $ticket))
            ->assertForbidden();
    }

    public function test_admin_course_creation_handles_duplicate_titles(): void
    {
        $instructor = User::factory()->admin()->create();

        $payload = [
            'title' => 'Shared Title',
            'category' => 'Robotics',
            'difficulty' => 'beginner',
            'language' => 'en',
            'price' => 0,
            'currency' => 'USD',
            'instructor_id' => $instructor->id,
        ];

        $this->actingAs($this->admin)->post(route('tutor.courses.store'), $payload)->assertSessionHasNoErrors();
        $this->actingAs($this->admin)->post(route('tutor.courses.store'), $payload)->assertSessionHasNoErrors();

        $this->assertSame(2, Course::count());
        $this->assertSame(2, Course::pluck('slug')->unique()->count());
    }
}
