<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->create();
    }

    private function event(array $attributes = []): Event
    {
        return Event::factory()->create([
            'created_by' => User::factory()->admin()->create()->id,
            'starts_at' => now()->addWeek(),
            'registration_open' => true,
            ...$attributes,
        ]);
    }

    public function test_a_student_can_register_for_an_open_event(): void
    {
        $event = $this->event(['title' => 'Robotics workshop']);

        $this->actingAs($this->student)
            ->post(route('events.register', $event))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('event_registrations', [
            'event_id' => $event->id,
            'user_id' => $this->student->id,
        ]);
    }

    public function test_registering_twice_does_not_duplicate(): void
    {
        $event = $this->event();

        $this->actingAs($this->student)->post(route('events.register', $event));
        $this->actingAs($this->student)->post(route('events.register', $event));

        $this->assertSame(1, EventRegistration::where('event_id', $event->id)->count());
    }

    public function test_a_student_can_cancel(): void
    {
        $event = $this->event();

        $this->actingAs($this->student)->post(route('events.register', $event));
        $this->actingAs($this->student)->delete(route('events.unregister', $event))->assertSessionHasNoErrors();

        $this->assertSame(0, EventRegistration::count());
    }

    public function test_registration_is_refused_once_capacity_is_reached(): void
    {
        $event = $this->event(['capacity' => 1]);

        EventRegistration::create([
            'event_id' => $event->id,
            'user_id' => User::factory()->create()->id,
            'registered_at' => now(),
        ]);

        $this->actingAs($this->student)
            ->post(route('events.register', $event))
            ->assertSessionHas('error');

        $this->assertSame(1, EventRegistration::where('event_id', $event->id)->count());
    }

    public function test_a_closed_event_refuses_sign_ups(): void
    {
        $event = $this->event(['registration_open' => false]);

        $this->actingAs($this->student)
            ->post(route('events.register', $event))
            ->assertSessionHas('error');

        $this->assertSame(0, EventRegistration::count());
    }

    public function test_a_past_event_refuses_sign_ups(): void
    {
        $event = $this->event(['starts_at' => now()->subDay()]);

        $this->actingAs($this->student)
            ->post(route('events.register', $event))
            ->assertSessionHas('error');

        $this->assertSame(0, EventRegistration::count());
    }

    public function test_course_events_are_closed_to_people_outside_the_course(): void
    {
        $course = Course::factory()->create();
        $event = $this->event(['course_id' => $course->id]);

        $this->actingAs($this->student)
            ->post(route('events.register', $event))
            ->assertForbidden();

        Enrollment::factory()->create(['user_id' => $this->student->id, 'course_id' => $course->id]);

        $this->actingAs($this->student)
            ->post(route('events.register', $event))
            ->assertSessionHasNoErrors();

        $this->assertSame(1, EventRegistration::count());
    }

    public function test_the_calendar_reports_registration_state(): void
    {
        $event = $this->event(['capacity' => 10, 'starts_at' => now()->addDays(2)]);

        $this->actingAs($this->student)->post(route('events.register', $event));

        $this->actingAs($this->student)
            ->get(route('dashboard.calendar', ['month' => now()->format('Y-m')]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('items.0.registration.registered', true)
                ->where('items.0.registration.going', 1)
                ->where('items.0.registration.spots_left', 9));
    }

    public function test_staff_can_open_registration_with_a_capacity(): void
    {
        $instructor = User::factory()->admin()->create();
        $course = Course::factory()->create(['instructor_id' => $instructor->id]);

        $this->actingAs($instructor)
            ->post(route('events.store'), [
                'course_id' => $course->id,
                'title' => 'Hackathon kickoff',
                'type' => Event::TYPE_WORKSHOP,
                'starts_at' => now()->addWeek()->format('Y-m-d H:i:s'),
                'capacity' => 25,
                'registration_open' => true,
            ])
            ->assertSessionHasNoErrors();

        $event = Event::where('title', 'Hackathon kickoff')->firstOrFail();

        $this->assertSame(25, $event->capacity);
        $this->assertTrue($event->registration_open);
        $this->assertSame(25, $event->spotsLeft());
    }
}
