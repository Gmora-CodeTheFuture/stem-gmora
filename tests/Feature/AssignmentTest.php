<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AssignmentTest extends TestCase
{
    use RefreshDatabase;

    private Course $course;

    private Assignment $assignment;

    private User $student;

    private User $instructor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->instructor = User::factory()->instructor()->create();
        $this->course = Course::factory()->create(['instructor_id' => $this->instructor->id]);
        $this->student = User::factory()->create();

        Enrollment::factory()->create([
            'user_id' => $this->student->id,
            'course_id' => $this->course->id,
        ]);

        $this->assignment = Assignment::create([
            'course_id' => $this->course->id,
            'title' => 'Build a classifier',
            'max_marks' => 100,
            'is_published' => true,
        ]);
    }

    public function test_student_can_submit_a_repository_link(): void
    {
        $this->actingAs($this->student)
            ->post(route('assignments.submit', $this->assignment), [
                'type' => 'repo',
                'repo_url' => 'https://github.com/student/project',
                'notes' => 'Ran out of time on the write-up.',
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('submissions', [
            'assignment_id' => $this->assignment->id,
            'user_id' => $this->student->id,
            'repo_url' => 'https://github.com/student/project',
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('audit_logs', ['action' => 'submission.created']);
    }

    public function test_uploaded_files_land_on_the_private_disk(): void
    {
        Storage::fake('local');

        $this->actingAs($this->student)
            ->post(route('assignments.submit', $this->assignment), [
                'type' => 'file',
                'file' => UploadedFile::fake()->create('project.pdf', 100, 'application/pdf'),
            ])
            ->assertSessionHasNoErrors();

        $submission = Submission::firstOrFail();

        Storage::disk('local')->assertExists($submission->file_url);
    }

    public function test_oversized_uploads_are_rejected(): void
    {
        Storage::fake('local');

        $this->actingAs($this->student)
            ->post(route('assignments.submit', $this->assignment), [
                'type' => 'file',
                'file' => UploadedFile::fake()->create('huge.zip', 30_000),
            ])
            ->assertSessionHasErrors('file');

        $this->assertDatabaseCount('submissions', 0);
    }

    public function test_unenrolled_user_cannot_submit(): void
    {
        $this->actingAs(User::factory()->create())
            ->post(route('assignments.submit', $this->assignment), [
                'type' => 'link',
                'link_url' => 'https://example.com/work',
            ])
            ->assertForbidden();
    }

    public function test_resubmission_replaces_the_previous_answer(): void
    {
        $payload = ['type' => 'repo', 'repo_url' => 'https://github.com/student/v1'];
        $this->actingAs($this->student)->post(route('assignments.submit', $this->assignment), $payload);

        $this->actingAs($this->student)->post(route('assignments.submit', $this->assignment), [
            'type' => 'repo',
            'repo_url' => 'https://github.com/student/v2',
        ]);

        $this->assertDatabaseCount('submissions', 1);
        $this->assertSame('https://github.com/student/v2', Submission::first()->repo_url);
    }

    public function test_a_graded_submission_is_locked(): void
    {
        $this->actingAs($this->student)->post(route('assignments.submit', $this->assignment), [
            'type' => 'repo',
            'repo_url' => 'https://github.com/student/v1',
        ]);

        $submission = Submission::firstOrFail();

        $this->actingAs($this->instructor)->patch(route('instructor.grade-submission', $submission), [
            'marks_awarded' => 80,
            'feedback' => 'Solid work.',
            'status' => 'graded',
        ])->assertSessionHasNoErrors();

        $this->actingAs($this->student)
            ->post(route('assignments.submit', $this->assignment), [
                'type' => 'repo',
                'repo_url' => 'https://github.com/student/sneaky-v2',
            ])
            ->assertSessionHas('error');

        $this->assertSame('https://github.com/student/v1', $submission->fresh()->repo_url);
    }

    public function test_instructor_grades_their_own_course_submission(): void
    {
        $this->actingAs($this->student)->post(route('assignments.submit', $this->assignment), [
            'type' => 'repo',
            'repo_url' => 'https://github.com/student/v1',
        ]);

        $submission = Submission::firstOrFail();

        $this->actingAs($this->instructor)
            ->patch(route('instructor.grade-submission', $submission), [
                'marks_awarded' => 92,
                'feedback' => 'Clear evaluation section.',
                'status' => 'graded',
            ])
            ->assertSessionHasNoErrors();

        $submission->refresh();

        $this->assertSame(92, $submission->marks_awarded);
        $this->assertSame($this->instructor->id, $submission->graded_by);
        $this->assertNotNull($submission->graded_at);
        $this->assertDatabaseHas('audit_logs', ['action' => 'submission.graded']);
    }

    public function test_instructor_cannot_grade_another_instructors_course(): void
    {
        $this->actingAs($this->student)->post(route('assignments.submit', $this->assignment), [
            'type' => 'repo',
            'repo_url' => 'https://github.com/student/v1',
        ]);

        $outsider = User::factory()->instructor()->create();

        $this->actingAs($outsider)
            ->patch(route('instructor.grade-submission', Submission::firstOrFail()), [
                'marks_awarded' => 10,
                'status' => 'graded',
            ])
            ->assertForbidden();
    }

    public function test_students_cannot_reach_the_grading_queue(): void
    {
        $this->actingAs($this->student)->get(route('instructor.grading'))->assertForbidden();
        $this->actingAs($this->instructor)->get(route('instructor.grading'))->assertOk();
    }

    public function test_marks_cannot_exceed_the_assignment_maximum(): void
    {
        $this->actingAs($this->student)->post(route('assignments.submit', $this->assignment), [
            'type' => 'repo',
            'repo_url' => 'https://github.com/student/v1',
        ]);

        $this->actingAs($this->instructor)
            ->patch(route('instructor.grade-submission', Submission::firstOrFail()), [
                'marks_awarded' => 150,
                'status' => 'graded',
            ])
            ->assertSessionHasErrors('marks_awarded');
    }

    public function test_a_student_cannot_download_another_students_file(): void
    {
        Storage::fake('local');

        $this->actingAs($this->student)->post(route('assignments.submit', $this->assignment), [
            'type' => 'file',
            'file' => UploadedFile::fake()->create('project.pdf', 100, 'application/pdf'),
        ]);

        $submission = Submission::firstOrFail();

        $classmate = User::factory()->create();
        Enrollment::factory()->create(['user_id' => $classmate->id, 'course_id' => $this->course->id]);

        $this->actingAs($classmate)->get(route('submissions.download', $submission))->assertForbidden();
        $this->actingAs($this->student)->get(route('submissions.download', $submission))->assertOk();
        $this->actingAs($this->instructor)->get(route('submissions.download', $submission))->assertOk();
    }
}
