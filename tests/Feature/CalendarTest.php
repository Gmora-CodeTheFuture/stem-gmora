<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CalendarTest extends TestCase
{
    use RefreshDatabase;

    private Course $course;

    private User $student;

    private User $instructor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->instructor = User::factory()->admin()->create();
        $this->course = Course::factory()->create(['instructor_id' => $this->instructor->id]);
        $this->student = User::factory()->create();

        Enrollment::factory()->create([
            'user_id' => $this->student->id,
            'course_id' => $this->course->id,
        ]);
    }

    public function test_student_sees_events_for_their_course_and_platform_wide_ones(): void
    {
        Event::factory()->create([
            'course_id' => $this->course->id,
            'title' => 'My Course Event',
            'created_by' => $this->instructor->id,
        ]);

        Event::factory()->create([
            'course_id' => null,
            'title' => 'Platform Wide Event',
            'created_by' => $this->instructor->id,
        ]);

        $otherCourse = Course::factory()->create();
        Event::factory()->create([
            'course_id' => $otherCourse->id,
            'title' => 'Someone Elses Event',
            'created_by' => $this->instructor->id,
        ]);

        $this->actingAs($this->student)
            ->get(route('dashboard.calendar', ['month' => now()->format('Y-m')]))
            ->assertOk()
            ->assertSee('My Course Event')
            ->assertSee('Platform Wide Event')
            ->assertDontSee('Someone Elses Event');
    }

    public function test_unpublished_events_are_hidden(): void
    {
        Event::factory()->unpublished()->create([
            'course_id' => $this->course->id,
            'title' => 'Draft Event',
            'created_by' => $this->instructor->id,
        ]);

        $this->actingAs($this->student)
            ->get(route('dashboard.calendar'))
            ->assertOk()
            ->assertDontSee('Draft Event');
    }

    public function test_assignment_deadlines_appear_on_the_calendar(): void
    {
        Assignment::create([
            'course_id' => $this->course->id,
            'title' => 'Final Project',
            'deadline_at' => now()->addDays(4),
            'max_marks' => 100,
            'is_published' => true,
        ]);

        $this->actingAs($this->student)
            ->get(route('dashboard.calendar'))
            ->assertOk()
            ->assertSee('Final Project due');
    }

    public function test_instructor_can_publish_an_event_to_their_own_course(): void
    {
        $this->actingAs($this->instructor)
            ->post(route('events.store'), [
                'course_id' => $this->course->id,
                'title' => 'Extra revision class',
                'type' => Event::TYPE_CLASS,
                'starts_at' => now()->addDays(5)->format('Y-m-d H:i:s'),
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('events', [
            'course_id' => $this->course->id,
            'title' => 'Extra revision class',
            'created_by' => $this->instructor->id,
        ]);

        $this->assertDatabaseHas('audit_logs', ['action' => 'event.created']);
    }

    public function test_an_admin_can_publish_to_any_course(): void
    {
        $otherCourse = Course::factory()->create();

        $this->actingAs($this->instructor)
            ->post(route('events.store'), [
                'course_id' => $otherCourse->id,
                'title' => 'Guest lecture',
                'type' => Event::TYPE_CLASS,
                'starts_at' => now()->addDay()->format('Y-m-d H:i:s'),
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('events', ['title' => 'Guest lecture', 'course_id' => $otherCourse->id]);
    }

    public function test_only_admins_can_publish_platform_wide(): void
    {
        $payload = [
            'course_id' => null,
            'title' => 'Everyone announcement',
            'type' => Event::TYPE_ANNOUNCEMENT,
            'starts_at' => now()->addDay()->format('Y-m-d H:i:s'),
        ];

        $this->actingAs($this->student)
            ->post(route('events.store'), $payload)
            ->assertForbidden();

        $this->actingAs(User::factory()->admin()->create())
            ->post(route('events.store'), $payload)
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('events', ['title' => 'Everyone announcement', 'course_id' => null]);
    }

    public function test_students_cannot_create_events(): void
    {
        $this->actingAs($this->student)
            ->post(route('events.store'), [
                'course_id' => $this->course->id,
                'title' => 'Student event',
                'type' => Event::TYPE_CLASS,
                'starts_at' => now()->addDay()->format('Y-m-d H:i:s'),
            ])
            ->assertForbidden();
    }

    public function test_end_time_must_follow_the_start(): void
    {
        $this->actingAs($this->instructor)
            ->post(route('events.store'), [
                'course_id' => $this->course->id,
                'title' => 'Backwards event',
                'type' => Event::TYPE_CLASS,
                'starts_at' => now()->addDays(2)->format('Y-m-d H:i:s'),
                'ends_at' => now()->addDay()->format('Y-m-d H:i:s'),
            ])
            ->assertSessionHasErrors('ends_at');
    }

    public function test_instructor_can_delete_their_event(): void
    {
        $event = Event::factory()->create([
            'course_id' => $this->course->id,
            'created_by' => $this->instructor->id,
        ]);

        $this->actingAs($this->instructor)
            ->delete(route('events.destroy', $event))
            ->assertSessionHasNoErrors();

        $this->assertSoftDeleted($event);
    }

    public function test_an_event_can_be_edited_after_it_is_published(): void
    {
        // Create and delete existed; update had no caller in the interface, so
        // a wrong date could only be fixed by deleting and retyping the event.
        $this->actingAs($this->instructor)->post(route('events.store'), [
            'course_id' => $this->course->id,
            'title' => 'Robotics wrokshop',
            'type' => Event::TYPE_WORKSHOP,
            'starts_at' => now()->addDay()->format('Y-m-d H:i:s'),
            'capacity' => 20,
            'registration_open' => true,
        ])->assertSessionHasNoErrors();

        $event = Event::firstOrFail();

        $this->actingAs($this->instructor)
            ->patch(route('events.update', $event), [
                'course_id' => $this->course->id,
                'title' => 'Robotics workshop',
                'type' => Event::TYPE_WORKSHOP,
                'starts_at' => now()->addDays(3)->format('Y-m-d H:i:s'),
                'location' => 'Lab 2',
                'capacity' => 30,
                'registration_open' => true,
            ])
            ->assertSessionHasNoErrors();

        $event->refresh();

        $this->assertSame('Robotics workshop', $event->title);
        $this->assertSame('Lab 2', $event->location);
        $this->assertSame(30, $event->capacity);
        $this->assertDatabaseHas('audit_logs', ['action' => 'event.updated']);
    }

    public function test_a_student_cannot_edit_an_event(): void
    {
        $event = Event::factory()->create([
            'course_id' => $this->course->id,
            'created_by' => $this->instructor->id,
        ]);

        $this->actingAs($this->student)
            ->patch(route('events.update', $event), [
                'title' => 'Cancelled',
                'type' => Event::TYPE_CLASS,
                'starts_at' => now()->addDay()->format('Y-m-d H:i:s'),
            ])
            ->assertForbidden();
    }

    public function test_the_calendar_carries_the_fields_the_edit_form_needs(): void
    {
        Event::factory()->create([
            'course_id' => $this->course->id,
            'created_by' => $this->instructor->id,
            'starts_at' => now()->addDay(),
            'capacity' => 12,
            'registration_open' => true,
        ]);

        $this->actingAs($this->student)
            ->get(route('dashboard.calendar'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('items.0.capacity', 12)
                ->where('items.0.registration_open', true));
    }
}
