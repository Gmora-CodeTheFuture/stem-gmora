<?php

namespace Tests\Feature;

use App\Http\Middleware\TrackLoginSession;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\LoginSession;
use App\Models\Module;
use App\Models\User;
use App\Models\VideoAccessToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Tests\TestCase;

class SecuritySessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_signing_in_records_the_device(): void
    {
        $user = User::factory()->create();

        $this->post(route('login'), ['email' => $user->email, 'password' => 'password']);

        $session = LoginSession::where('user_id', $user->id)->firstOrFail();

        $this->assertNull($session->revoked_at);
        $this->assertNotNull($session->device_label);
        $this->assertNotNull($session->last_seen_at);
    }

    public function test_the_security_page_lists_active_devices(): void
    {
        $user = User::factory()->create();

        LoginSession::create([
            'user_id' => $user->id,
            'session_id' => 'device-a',
            'device_label' => 'Chrome on macOS',
            'last_seen_at' => now(),
        ]);

        LoginSession::create([
            'user_id' => $user->id,
            'session_id' => 'device-b',
            'device_label' => 'Safari on iPhone',
            'last_seen_at' => now()->subHour(),
            'revoked_at' => now(),
        ]);

        $this->actingAs($user)
            ->get(route('profile.security'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                // Revoked devices drop off the list.
                ->has('sessions', 1)
                ->where('sessions.0.device_label', 'Chrome on macOS'));
    }

    public function test_revoking_a_session_kills_its_video_tickets(): void
    {
        $course = Course::factory()->create();
        $module = Module::factory()->create(['course_id' => $course->id]);
        $lesson = Lesson::factory()->create(['module_id' => $module->id]);

        $user = User::factory()->create();
        Enrollment::factory()->create(['user_id' => $user->id, 'course_id' => $course->id]);

        $this->post(route('login'), ['email' => $user->email, 'password' => 'password']);

        $this->postJson(route('api.video-token.issue', $lesson))->assertOk();

        // A second device the user wants to boot.
        $other = LoginSession::create([
            'user_id' => $user->id,
            'session_id' => 'some-other-session-id',
            'device_label' => 'Safari on iPhone',
            'last_seen_at' => now(),
        ]);

        $this->delete(route('profile.sessions.destroy', $other))->assertSessionHasNoErrors();

        $this->assertNotNull($other->refresh()->revoked_at);
        $this->assertNotNull(VideoAccessToken::firstOrFail()->revoked_at);
    }

    public function test_a_user_cannot_revoke_someone_elses_session(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $session = LoginSession::create([
            'user_id' => $owner->id,
            'session_id' => 'owner-session',
            'device_label' => 'Chrome on macOS',
            'last_seen_at' => now(),
        ]);

        $this->actingAs($intruder)
            ->delete(route('profile.sessions.destroy', $session))
            ->assertForbidden();

        $this->assertNull($session->refresh()->revoked_at);
    }

    public function test_signing_out_other_devices_requires_the_password(): void
    {
        $user = User::factory()->create();

        LoginSession::create([
            'user_id' => $user->id,
            'session_id' => 'another-device',
            'device_label' => 'Firefox on Linux',
            'last_seen_at' => now(),
        ]);

        $this->actingAs($user)
            ->delete(route('profile.sessions.destroy-others'), ['password' => 'wrong-password'])
            ->assertSessionHasErrors('password');

        $this->assertNull(LoginSession::firstOrFail()->revoked_at);

        $this->actingAs($user)
            ->delete(route('profile.sessions.destroy-others'), ['password' => 'password'])
            ->assertSessionHasNoErrors();

        // Every device other than the one making the request is signed out.
        $this->assertNotNull(LoginSession::firstOrFail()->revoked_at);
    }

    public function test_a_revoked_device_is_signed_out_on_its_next_request(): void
    {
        $user = User::factory()->create();

        $request = Request::create('/dashboard');
        $request->setLaravelSession(app('session.store'));
        $request->setUserResolver(fn () => $user);

        LoginSession::create([
            'user_id' => $user->id,
            'session_id' => $request->session()->getId(),
            'device_label' => 'Chrome on macOS',
            'last_seen_at' => now(),
            'revoked_at' => now(),
        ]);

        $this->be($user);

        $response = app(TrackLoginSession::class)->handle($request, fn () => new SymfonyResponse('reached'));

        $this->assertTrue($response->isRedirect(route('login')));
        $this->assertGuest();
    }

    public function test_security_headers_are_present(): void
    {
        $response = $this->get(route('login'));

        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');

        $csp = $response->headers->get('Content-Security-Policy');

        $this->assertStringContainsString("default-src 'self'", $csp);
        $this->assertStringContainsString("object-src 'none'", $csp);
        // The lesson player must still be able to frame YouTube.
        $this->assertStringContainsString('frame-src https://www.youtube.com', $csp);
    }
}
