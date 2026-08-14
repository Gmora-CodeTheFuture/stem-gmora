<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityConsoleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->role(Role::SUPER_ADMIN)->create();
    }

    public function test_only_admins_can_open_the_console(): void
    {
        $this->actingAs(User::factory()->create())->get(route('admin.security.index'))->assertForbidden();
        $this->actingAs(User::factory()->instructor()->create())->get(route('admin.security.index'))->assertForbidden();
        $this->actingAs($this->admin)->get(route('admin.security.index'))->assertOk();
    }

    public function test_it_lists_audit_entries(): void
    {
        AuditLog::record('course.published', 'course', 'course-123', ['from' => 'draft'], $this->admin->id);

        $this->actingAs($this->admin)
            ->get(route('admin.security.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('logs.data', 1)
                ->where('logs.data.0.action', 'course.published')
                ->where('logs.data.0.entity_id', 'course-123'));
    }

    public function test_entries_can_be_filtered_by_action(): void
    {
        AuditLog::record('user.role_changed', 'user', 'u-1', null, $this->admin->id);
        AuditLog::record('post.created', 'post', 'p-1', null, $this->admin->id);

        $this->actingAs($this->admin)
            ->get(route('admin.security.index', ['action' => 'user.role_changed']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('logs.data', 1)
                ->where('logs.data.0.action', 'user.role_changed'));
    }

    public function test_entries_can_be_filtered_by_date(): void
    {
        $old = AuditLog::record('old.action', 'thing', 'a', null, $this->admin->id);
        $old->forceFill(['created_at' => now()->subMonth()])->save();

        AuditLog::record('recent.action', 'thing', 'b', null, $this->admin->id);

        $this->actingAs($this->admin)
            ->get(route('admin.security.index', ['from' => now()->subWeek()->toDateString()]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('logs.data', 1)
                ->where('logs.data.0.action', 'recent.action'));
    }

    public function test_the_token_monitor_counts_real_issuance(): void
    {
        $course = Course::factory()->create();
        $module = Module::factory()->create(['course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['module_id' => $module->id]);

        $student = User::factory()->create();
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);

        $this->actingAs($student)->postJson(route('api.video-token.issue', $lesson))->assertOk();

        $this->actingAs($this->admin)
            ->get(route('admin.security.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('tokens.issued_24h', 1)
                ->where('tokens.active', 1)
                ->has('tokens.top_issuers', 1)
                ->where('tokens.top_issuers.0.issued', 1)
                ->where('tokens.top_issuers.0.suspicious', false));
    }

    public function test_a_user_timeline_shows_their_actions_and_tickets(): void
    {
        $course = Course::factory()->create();
        $module = Module::factory()->create(['course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['module_id' => $module->id, 'title' => 'Watched lesson']);

        $student = User::factory()->create();
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);

        $this->actingAs($student)->postJson(route('api.video-token.issue', $lesson));

        $this->actingAs($this->admin)
            ->get(route('admin.security.user', $student))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('targetUser.id', $student->id)
                // Token issuance is itself an audited action.
                ->where('logs.data.0.action', 'video_token.issued')
                ->has('tokens', 1)
                ->where('tokens.0.lesson', 'Watched lesson'));
    }
}
