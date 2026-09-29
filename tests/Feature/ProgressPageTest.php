<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProgressPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_enrolled_student_can_view_progress_page(): void
    {
        $student = User::factory()->create();

        $this->actingAs($student)
            ->get(route('dashboard.progress'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard/Progress')
                ->has('stats')
                ->has('streak')
                ->has('activity')
                ->has('enrollments')
                ->has('badges')
                ->has('certificates'));
    }

    public function test_instructor_is_redirected_from_progress_page(): void
    {
        $instructor = User::factory()->instructor()->create();

        $this->actingAs($instructor)
            ->get(route('dashboard.progress'))
            ->assertRedirect(route('instructor.home'));
    }
}
