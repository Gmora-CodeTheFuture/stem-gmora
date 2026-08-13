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

    private User $superAdmin;

    private User $platformAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdmin = User::factory()->role(Role::SUPER_ADMIN)->create();
        $this->platformAdmin = User::factory()->role(Role::PLATFORM_ADMIN)->create();
    }

    public function test_students_cannot_reach_the_admin_panel(): void
    {
        $this->actingAs(User::factory()->create())->get(route('admin.dashboard'))->assertForbidden();
        $this->actingAs(User::factory()->instructor()->create())->get(route('admin.users.index'))->assertForbidden();
    }

    public function test_admin_pages_render(): void
    {
        $course = Course::factory()->create();

        foreach ([
            route('admin.dashboard'),
            route('admin.users.index'),
            route('admin.users.show', $this->platformAdmin),
            route('admin.users.edit', $this->platformAdmin),
            route('admin.courses.index'),
            route('admin.courses.create'),
            route('admin.courses.show', $course),
            route('admin.courses.edit', $course),
            route('admin.enrollments.index'),
            route('admin.payments.index'),
            route('admin.badges.index'),
        ] as $url) {
            $this->actingAs($this->superAdmin)->get($url)->assertOk();
        }
    }

    public function test_an_admin_cannot_delete_their_own_account(): void
    {
        $this->actingAs($this->superAdmin)
            ->delete(route('admin.users.destroy', $this->superAdmin))
            ->assertSessionHas('error');

        $this->assertNotNull(User::find($this->superAdmin->id));
    }

    public function test_the_last_super_admin_cannot_be_deleted(): void
    {
        // superAdmin is the only one; platformAdmin tries to remove them.
        $this->actingAs($this->platformAdmin)
            ->delete(route('admin.users.destroy', $this->superAdmin))
            ->assertForbidden();

        $this->assertNotNull(User::find($this->superAdmin->id));
    }

    public function test_a_platform_admin_cannot_grant_super_admin(): void
    {
        $target = User::factory()->create();

        $this->actingAs($this->platformAdmin)
            ->patch(route('admin.users.update', $target), [
                'full_name' => $target->full_name,
                'email' => $target->email,
                'role_id' => Role::where('name', Role::SUPER_ADMIN)->value('id'),
            ])
            ->assertForbidden();

        $this->assertTrue($target->refresh()->hasRole(Role::STUDENT));
    }

    public function test_nobody_can_change_their_own_role(): void
    {
        $this->actingAs($this->platformAdmin)
            ->patch(route('admin.users.update', $this->platformAdmin), [
                'full_name' => $this->platformAdmin->full_name,
                'email' => $this->platformAdmin->email,
                'role_id' => Role::where('name', Role::STUDENT)->value('id'),
            ])
            ->assertForbidden();
    }

    public function test_role_changes_are_audited(): void
    {
        $target = User::factory()->create();

        $this->actingAs($this->superAdmin)
            ->patch(route('admin.users.update', $target), [
                'full_name' => $target->full_name,
                'email' => $target->email,
                'role_id' => Role::where('name', Role::INSTRUCTOR)->value('id'),
            ])
            ->assertSessionHasNoErrors();

        $this->assertTrue($target->refresh()->hasRole(Role::INSTRUCTOR));
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.role_changed',
            'entity_id' => $target->id,
            'actor_id' => $this->superAdmin->id,
        ]);
    }

    public function test_granting_an_enrollment_updates_the_course_counter(): void
    {
        $course = Course::factory()->create(['total_enrollments' => 0]);
        $student = User::factory()->create();

        $this->actingAs($this->superAdmin)
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

        $this->actingAs($this->superAdmin)
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

        $this->actingAs($this->superAdmin)
            ->patch(route('admin.enrollments.update', $enrollment), ['status' => 'suspended'])
            ->assertSessionHasNoErrors();

        $this->assertNotNull(VideoAccessToken::firstOrFail()->revoked_at);

        $this->actingAs($student)
            ->getJson(route('api.video-token.heartbeat', $ticket))
            ->assertForbidden();
    }

    public function test_admin_course_creation_handles_duplicate_titles(): void
    {
        $instructor = User::factory()->instructor()->create();

        $payload = [
            'title' => 'Shared Title',
            'category' => 'Robotics',
            'difficulty' => 'beginner',
            'language' => 'en',
            'price' => 0,
            'currency' => 'USD',
            'instructor_id' => $instructor->id,
        ];

        $this->actingAs($this->superAdmin)->post(route('admin.courses.store'), $payload)->assertSessionHasNoErrors();
        $this->actingAs($this->superAdmin)->post(route('admin.courses.store'), $payload)->assertSessionHasNoErrors();

        $this->assertSame(2, Course::count());
        $this->assertSame(2, Course::pluck('slug')->unique()->count());
    }
}
