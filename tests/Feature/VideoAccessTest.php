<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use App\Models\VideoAccessToken;
use App\Services\VideoAccessService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VideoAccessTest extends TestCase
{
    use RefreshDatabase;

    private function lessonFor(Course $course): Lesson
    {
        $module = Module::factory()->create(['course_id' => $course->id]);

        return Lesson::factory()->create(['module_id' => $module->id]);
    }

    public function test_enrolled_student_receives_a_ticket_and_the_video_id(): void
    {
        $course = Course::factory()->create();
        $lesson = $this->lessonFor($course);
        $user = User::factory()->create();
        Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);

        $response = $this->actingAs($user)
            ->postJson(route('api.video-token.issue', $lesson));

        $response->assertOk()
            ->assertJsonPath('data.video_id', $lesson->content_ref)
            ->assertJsonStructure(['data' => ['video_id', 'ticket', 'expires_at', 'watermark']]);

        $this->assertDatabaseCount('video_access_tokens', 1);
        $this->assertDatabaseHas('audit_logs', ['action' => 'video_token.issued']);
    }

    public function test_unenrolled_user_is_refused_a_ticket(): void
    {
        $course = Course::factory()->create();
        $lesson = $this->lessonFor($course);

        $this->actingAs(User::factory()->create())
            ->postJson(route('api.video-token.issue', $lesson))
            ->assertForbidden();

        $this->assertDatabaseCount('video_access_tokens', 0);
    }

    public function test_guest_is_refused_a_ticket(): void
    {
        $lesson = $this->lessonFor(Course::factory()->create());

        $this->postJson(route('api.video-token.issue', $lesson))->assertUnauthorized();
    }

    public function test_free_preview_lesson_is_playable_without_enrollment(): void
    {
        $course = Course::factory()->create();
        $module = Module::factory()->create(['course_id' => $course->id]);
        $lesson = Lesson::factory()->freePreview()->create(['module_id' => $module->id]);

        $this->actingAs(User::factory()->create())
            ->postJson(route('api.video-token.issue', $lesson))
            ->assertOk()
            ->assertJsonPath('data.video_id', $lesson->content_ref);
    }

    public function test_lesson_payloads_never_expose_content_ref(): void
    {
        $course = Course::factory()->create();
        $lesson = $this->lessonFor($course);

        $this->assertArrayNotHasKey('content_ref', $lesson->fresh()->toArray());

        $this->get(route('courses.show', $course->slug))
            ->assertOk()
            ->assertDontSee($lesson->content_ref);
    }

    public function test_heartbeat_fails_once_the_enrollment_is_no_longer_active(): void
    {
        $course = Course::factory()->create();
        $lesson = $this->lessonFor($course);
        $user = User::factory()->create();
        $enrollment = Enrollment::factory()->create([
            'user_id' => $user->id,
            'course_id' => $course->id,
        ]);

        $ticket = $this->actingAs($user)
            ->postJson(route('api.video-token.issue', $lesson))
            ->json('data.ticket');

        $this->actingAs($user)
            ->getJson(route('api.video-token.heartbeat', $ticket))
            ->assertOk()
            ->assertJsonPath('data.valid', true);

        $enrollment->update(['status' => Enrollment::STATUS_REFUNDED]);

        $this->actingAs($user)
            ->getJson(route('api.video-token.heartbeat', $ticket))
            ->assertForbidden()
            ->assertJsonPath('data.reason', 'enrollment_inactive');
    }

    public function test_a_ticket_cannot_be_replayed_by_another_account(): void
    {
        $course = Course::factory()->create();
        $lesson = $this->lessonFor($course);
        $owner = User::factory()->create();
        Enrollment::factory()->create(['user_id' => $owner->id, 'course_id' => $course->id]);

        $ticket = $this->actingAs($owner)
            ->postJson(route('api.video-token.issue', $lesson))
            ->json('data.ticket');

        $this->actingAs(User::factory()->create())
            ->getJson(route('api.video-token.heartbeat', $ticket))
            ->assertForbidden()
            ->assertJsonPath('data.reason', 'invalid');

        $this->assertDatabaseHas('audit_logs', ['action' => 'video_token.mismatched_user']);
    }

    public function test_logout_revokes_live_tickets(): void
    {
        $course = Course::factory()->create();
        $lesson = $this->lessonFor($course);
        $user = User::factory()->create();
        Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);

        $ticket = $this->actingAs($user)
            ->postJson(route('api.video-token.issue', $lesson))
            ->json('data.ticket');

        $this->actingAs($user)->post(route('logout'));

        $this->assertNotNull(VideoAccessToken::first()->revoked_at);

        $this->actingAs($user)
            ->getJson(route('api.video-token.heartbeat', $ticket))
            ->assertForbidden();
    }

    public function test_expired_ticket_is_rejected(): void
    {
        $course = Course::factory()->create();
        $lesson = $this->lessonFor($course);
        $user = User::factory()->create();
        Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);

        $ticket = $this->actingAs($user)
            ->postJson(route('api.video-token.issue', $lesson))
            ->json('data.ticket');

        $this->travel(VideoAccessService::TTL_MINUTES + 1)->minutes();

        $this->actingAs($user)
            ->getJson(route('api.video-token.heartbeat', $ticket))
            ->assertForbidden()
            ->assertJsonPath('data.reason', 'expired');
    }

    public function test_token_issuance_is_rate_limited_per_lesson(): void
    {
        $course = Course::factory()->create();
        $lesson = $this->lessonFor($course);
        $user = User::factory()->create();
        Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);

        for ($i = 0; $i < 2; $i++) {
            $this->actingAs($user)->postJson(route('api.video-token.issue', $lesson))->assertOk();
        }

        $this->actingAs($user)
            ->postJson(route('api.video-token.issue', $lesson))
            ->assertStatus(429);
    }

    public function test_audit_log_records_every_issuance(): void
    {
        $course = Course::factory()->create();
        $lesson = $this->lessonFor($course);
        $user = User::factory()->create();
        Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);

        $this->actingAs($user)->postJson(route('api.video-token.issue', $lesson))->assertOk();

        $log = AuditLog::where('action', 'video_token.issued')->first();

        $this->assertSame($user->id, $log->actor_id);
        $this->assertSame($lesson->id, $log->entity_id);
    }
}
