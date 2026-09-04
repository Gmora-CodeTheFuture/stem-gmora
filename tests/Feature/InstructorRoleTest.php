<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstructorRoleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $instructor;

    private User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create();
        $this->instructor = User::factory()->instructor()->create();
        $this->student = User::factory()->create();
    }

    public function test_admin_can_create_an_instructor(): void
    {
        $this->actingAs($this->admin)
            ->post(route('admin.instructors.store'), [
                'full_name' => 'New Instructor',
                'email' => 'new.instructor@example.com',
                'password' => 'password123',
                'headline' => 'Physics mentor',
            ])
            ->assertSessionHasNoErrors();

        $created = User::where('email', 'new.instructor@example.com')->first();
        $this->assertNotNull($created);
        $this->assertTrue($created->isInstructor());
    }

    public function test_admin_can_assign_an_instructor_to_a_student(): void
    {
        $this->actingAs($this->admin)
            ->patch(route('admin.users.update', $this->student), [
                'full_name' => $this->student->full_name,
                'email' => $this->student->email,
                'role_id' => Role::where('name', Role::STUDENT)->value('id'),
                'assigned_instructor_id' => $this->instructor->id,
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame($this->instructor->id, $this->student->refresh()->assigned_instructor_id);
    }

    public function test_instructor_sees_only_assigned_courses_and_students(): void
    {
        $mine = Course::factory()->create(['instructor_id' => $this->instructor->id]);
        $other = Course::factory()->create();
        $this->student->update(['assigned_instructor_id' => $this->instructor->id]);
        $outsider = User::factory()->create();

        $this->actingAs($this->instructor)
            ->get(route('instructor.home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Instructor/Home')
                ->has('courses', 1)
                ->where('courses.0.id', $mine->id)
                ->has('students', 1)
                ->where('students.0.id', $this->student->id));

        $this->actingAs($this->instructor)
            ->get(route('tutor.courses.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('courses.data', 1)
                ->where('courses.data.0.id', $mine->id));

        $this->actingAs($this->instructor)
            ->get(route('tutor.courses.edit', $other))
            ->assertForbidden();

        $this->assertNotSame($outsider->id, $this->student->id);
    }

    public function test_students_cannot_open_the_instructor_portal(): void
    {
        $this->actingAs($this->student)
            ->get(route('instructor.home'))
            ->assertForbidden();
    }

    public function test_instructor_cannot_reach_the_admin_panel(): void
    {
        $this->actingAs($this->instructor)
            ->get(route('admin.dashboard'))
            ->assertForbidden();
    }

    public function test_admin_can_reassign_a_course_to_an_instructor(): void
    {
        $course = Course::factory()->create(['instructor_id' => $this->admin->id]);

        $this->actingAs($this->admin)
            ->patch(route('tutor.courses.update', $course), [
                'title' => $course->title,
                'subtitle' => $course->subtitle,
                'description' => $course->description,
                'category' => $course->category,
                'difficulty' => $course->difficulty,
                'language' => $course->language,
                'price' => $course->price,
                'currency' => $course->currency,
                'instructor_id' => $this->instructor->id,
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame($this->instructor->id, $course->refresh()->instructor_id);
    }
}
