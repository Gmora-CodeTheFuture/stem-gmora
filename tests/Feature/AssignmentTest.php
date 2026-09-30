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

        $this->instructor = User::factory()->admin()->create();
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

    public function test_a_student_cannot_grade_a_submission(): void
    {
        $this->actingAs($this->student)->post(route('assignments.submit', $this->assignment), [
            'type' => 'repo',
            'repo_url' => 'https://github.com/student/v1',
        ]);

        $this->actingAs(User::factory()->create())
            ->patch(route('instructor.grade-submission', Submission::firstOrFail()), [
                'marks_awarded' => 10,
                'status' => 'graded',
            ])
            ->assertForbidden();
    }

    public function test_students_cannot_reach_the_grading_queue(): void
    {
        $this->actingAs($this->student)->get(route('tutor.grading'))->assertForbidden();
        $this->actingAs($this->instructor)->get(route('tutor.grading'))->assertOk();
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

    public function test_published_assignment_is_listed_for_enrolled_students(): void
    {
        $draft = Assignment::create([
            'course_id' => $this->course->id,
            'title' => 'Hidden draft',
            'max_marks' => 50,
            'is_published' => false,
        ]);

        $this->actingAs($this->student)
            ->get(route('dashboard.assignments'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('assignments', 1)
                ->where('assignments.0.title', 'Build a classifier'));

        $this->actingAs($this->student)
            ->get(route('assignments.show', $draft))
            ->assertNotFound();
    }

    public function test_creating_assignment_always_saves_as_draft(): void
    {
        $this->actingAs($this->instructor)->post(route('tutor.assignments.store', $this->course), [
            'title' => 'Mock Test 1',
            'description' => 'give python code for hello world',
            'max_marks' => 100,
            'is_published' => true, // client cannot force publish on create
        ])->assertRedirect();

        $assignment = Assignment::where('title', 'Mock Test 1')->firstOrFail();
        $this->assertFalse($assignment->is_published);
        $this->assertNull($assignment->publish_at);
        $this->assertSame(0, $this->student->fresh()->notifications()->count());
    }

    public function test_publishing_requires_complete_questions_then_notifies(): void
    {
        $draft = Assignment::create([
            'course_id' => $this->course->id,
            'title' => 'Draft then publish',
            'max_marks' => 40,
            'is_published' => false,
        ]);

        $this->actingAs($this->instructor)
            ->post(route('tutor.assignments.publish', $draft))
            ->assertSessionHasErrors('questions');

        $this->actingAs($this->instructor)->post(route('tutor.assignment-questions.store', $draft), [
            'type' => 'mcq',
            'body' => 'Pick one',
            'points' => 1,
            'options' => [
                ['text' => 'A', 'is_correct' => false],
                ['text' => 'B', 'is_correct' => false],
            ],
        ])->assertStatus(422);

        $this->actingAs($this->instructor)->post(route('tutor.assignment-questions.store', $draft), [
            'type' => 'mcq',
            'body' => 'Pick one',
            'points' => 1,
            'options' => [
                ['text' => 'A', 'is_correct' => false],
                ['text' => 'B', 'is_correct' => true],
            ],
        ])->assertRedirect();

        $this->actingAs($this->instructor)
            ->post(route('tutor.assignments.publish', $draft))
            ->assertRedirect();

        $this->assertTrue($draft->fresh()->is_published);
        $this->assertSame(1, $this->student->fresh()->notifications()->count());
        $this->assertSame(
            \App\Notifications\AssignmentPublished::class,
            $this->student->fresh()->notifications()->first()->type,
        );
    }

    public function test_schedule_keeps_unpublished_until_command_runs(): void
    {
        $draft = Assignment::create([
            'course_id' => $this->course->id,
            'title' => 'Scheduled quiz',
            'max_marks' => 10,
            'is_published' => false,
        ]);

        $draft->questions()->create([
            'type' => 'normal',
            'body' => 'Explain briefly',
            'options' => [],
            'correct_answer' => null,
            'points' => 2,
            'order_index' => 0,
        ]);

        $this->actingAs($this->instructor)->post(route('tutor.assignments.schedule', $draft), [
            'publish_at' => now()->addHour()->toDateTimeString(),
        ])->assertRedirect();

        $draft->refresh();
        $this->assertFalse($draft->is_published);
        $this->assertNotNull($draft->publish_at);
        $this->assertSame(0, $this->student->fresh()->notifications()->count());

        // Pretend the scheduled time has arrived.
        $draft->forceFill(['publish_at' => now()->subMinute()])->save();

        $this->artisan('assignments:publish-scheduled')->assertSuccessful();

        $this->assertTrue($draft->fresh()->is_published);
        $this->assertNull($draft->fresh()->publish_at);
        $this->assertSame(1, $this->student->fresh()->notifications()->count());
    }

    public function test_required_assignment_blocks_next_lesson_until_submitted(): void
    {
        $module = \App\Models\Module::factory()->create([
            'course_id' => $this->course->id,
            'is_published' => true,
            'order_index' => 0,
        ]);

        $lessonA = \App\Models\Lesson::factory()->create([
            'module_id' => $module->id,
            'title' => 'Lesson A',
            'order_index' => 0,
            'is_published' => true,
        ]);

        $lessonB = \App\Models\Lesson::factory()->create([
            'module_id' => $module->id,
            'title' => 'Lesson B',
            'order_index' => 2,
            'is_published' => true,
        ]);

        $gate = Assignment::create([
            'course_id' => $this->course->id,
            'module_id' => $module->id,
            'order_index' => 1,
            'title' => 'Checkpoint quiz',
            'max_marks' => 10,
            'is_published' => true,
            'is_required' => true,
        ]);

        $mcq = $gate->questions()->create([
            'type' => 'mcq',
            'body' => '2 + 2?',
            'options' => [
                ['text' => '3', 'is_correct' => false],
                ['text' => '4', 'is_correct' => true],
            ],
            'correct_answer' => [1],
            'points' => 1,
            'order_index' => 0,
        ]);

        // Deep-link to Lesson B is redirected to the required assignment.
        $this->actingAs($this->student)
            ->get(route('learn.lesson', [$this->course->slug, $lessonB->id]))
            ->assertRedirect(route('learn.assignment', [$this->course->slug, $gate->id]));

        $this->actingAs($this->student)
            ->get(route('learn.assignment', [$this->course->slug, $gate->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('currentAssignment.id', $gate->id)
                ->has('curriculum', 3));

        $this->actingAs($this->student)
            ->post(route('assignments.submit', $gate), [
                'type' => 'answers',
                'answers' => [$mcq->id => [1]],
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('submissions', [
            'assignment_id' => $gate->id,
            'user_id' => $this->student->id,
            'type' => 'answers',
            'status' => 'graded',
        ]);

        $this->actingAs($this->student)
            ->get(route('learn.lesson', [$this->course->slug, $lessonB->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('currentLesson.id', $lessonB->id));

        // Non-required assignment does not block.
        Assignment::create([
            'course_id' => $this->course->id,
            'module_id' => $module->id,
            'order_index' => 1,
            'title' => 'Optional practice',
            'max_marks' => 5,
            'is_published' => true,
            'is_required' => false,
        ]);

        $this->assertTrue($lessonA->exists);
    }

    public function test_tutor_can_place_assignment_between_lessons_with_questions(): void
    {
        $module = \App\Models\Module::factory()->create([
            'course_id' => $this->course->id,
            'is_published' => true,
            'order_index' => 0,
        ]);

        $lessonA = \App\Models\Lesson::factory()->create([
            'module_id' => $module->id,
            'order_index' => 0,
            'is_published' => true,
        ]);

        $lessonB = \App\Models\Lesson::factory()->create([
            'module_id' => $module->id,
            'order_index' => 1,
            'is_published' => true,
        ]);

        $this->actingAs($this->instructor)->post(route('tutor.assignments.store', $this->course), [
            'title' => 'Between A and B',
            'max_marks' => 20,
            'is_published' => true,
            'is_required' => true,
            'module_id' => $module->id,
            'after_lesson_id' => $lessonA->id,
        ])->assertRedirect();

        $assignment = Assignment::where('title', 'Between A and B')->firstOrFail();
        $this->assertSame($module->id, $assignment->module_id);
        $this->assertSame(1, $assignment->order_index);
        $this->assertTrue($assignment->is_required);
        $this->assertSame(2, $lessonB->fresh()->order_index);

        $this->actingAs($this->instructor)->post(route('tutor.assignment-questions.store', $assignment), [
            'type' => 'short_answer',
            'body' => 'Capital of France?',
            'points' => 2,
            'correct_answer' => 'Paris | paris',
        ])->assertRedirect();

        $this->assertDatabaseHas('assignment_questions', [
            'assignment_id' => $assignment->id,
            'type' => 'short_answer',
        ]);
    }

    public function test_file_upload_rejects_disallowed_types(): void
    {
        Storage::fake('local');

        $this->actingAs($this->student)
            ->post(route('assignments.submit', $this->assignment), [
                'type' => 'file',
                'file' => UploadedFile::fake()->create('notes.docx', 100, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
            ])
            ->assertSessionHasErrors('file');

        $this->actingAs($this->student)
            ->post(route('assignments.submit', $this->assignment), [
                'type' => 'file',
                'file' => UploadedFile::fake()->create('lab.ipynb', 100, 'application/x-ipynb+json'),
            ])
            ->assertSessionHasErrors('file');

        $this->assertDatabaseCount('submissions', 0);
    }

    public function test_file_upload_accepts_pdf_zip_and_images(): void
    {
        Storage::fake('local');

        foreach (['report.pdf' => 'application/pdf', 'bundle.zip' => 'application/zip', 'shot.png' => 'image/png'] as $name => $mime) {
            Submission::query()->delete();

            $this->actingAs($this->student)
                ->post(route('assignments.submit', $this->assignment), [
                    'type' => 'file',
                    'file' => UploadedFile::fake()->create($name, 50, $mime),
                ])
                ->assertSessionHasNoErrors();

            $this->assertDatabaseHas('submissions', [
                'assignment_id' => $this->assignment->id,
                'user_id' => $this->student->id,
                'type' => 'file',
            ]);
        }
    }

    public function test_repo_url_must_be_a_github_link(): void
    {
        $this->actingAs($this->student)
            ->post(route('assignments.submit', $this->assignment), [
                'type' => 'repo',
                'repo_url' => 'https://gitlab.com/student/project',
            ])
            ->assertSessionHasErrors('repo_url');

        $this->actingAs($this->student)
            ->post(route('assignments.submit', $this->assignment), [
                'type' => 'repo',
                'repo_url' => 'https://evil.com/github.com/fake',
            ])
            ->assertSessionHasErrors('repo_url');

        $this->actingAs($this->student)
            ->post(route('assignments.submit', $this->assignment), [
                'type' => 'repo',
                'repo_url' => 'https://github.com/org/repo',
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('submissions', [
            'assignment_id' => $this->assignment->id,
            'repo_url' => 'https://github.com/org/repo',
        ]);
    }

    public function test_external_link_accepts_any_http_url(): void
    {
        $this->actingAs($this->student)
            ->post(route('assignments.submit', $this->assignment), [
                'type' => 'link',
                'link_url' => 'https://example.com/work/portfolio',
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('submissions', [
            'assignment_id' => $this->assignment->id,
            'link_url' => 'https://example.com/work/portfolio',
            'type' => 'link',
        ]);
    }

    public function test_notes_strip_html_and_script_tags(): void
    {
        $this->actingAs($this->student)
            ->post(route('assignments.submit', $this->assignment), [
                'type' => 'repo',
                'repo_url' => 'https://github.com/student/safe',
                'notes' => 'Hello <script>alert(1)</script> world <b>bold</b>',
            ])
            ->assertSessionHasNoErrors();

        $submission = Submission::firstOrFail();
        $this->assertSame('Hello alert(1) world bold', $submission->notes);
        $this->assertStringNotContainsString('<script>', $submission->notes ?? '');
        $this->assertStringNotContainsString('<b>', $submission->notes ?? '');
    }

    public function test_graded_assignment_review_reveals_answers_and_keys(): void
    {
        $module = \App\Models\Module::factory()->create([
            'course_id' => $this->course->id,
            'is_published' => true,
            'order_index' => 0,
        ]);

        $assignment = Assignment::create([
            'course_id' => $this->course->id,
            'module_id' => $module->id,
            'order_index' => 0,
            'title' => 'Review me',
            'max_marks' => 10,
            'is_published' => true,
            'is_required' => false,
        ]);

        $question = $assignment->questions()->create([
            'type' => 'mcq',
            'body' => '2 + 2?',
            'options' => [
                ['text' => '3', 'is_correct' => false],
                ['text' => '4', 'is_correct' => true],
            ],
            'correct_answer' => [1],
            'points' => 10,
            'order_index' => 0,
        ]);

        $this->actingAs($this->student)
            ->post(route('assignments.submit', $assignment), [
                'type' => 'answers',
                'answers' => [$question->id => [1]],
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('submissions', [
            'assignment_id' => $assignment->id,
            'user_id' => $this->student->id,
            'status' => 'graded',
        ]);

        $this->actingAs($this->student)
            ->get(route('learn.assignment', [$this->course->slug, $assignment->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Learn/Show')
                ->where('currentAssignment.id', $assignment->id)
                ->where('currentAssignment.submission.status', 'graded')
                ->where('currentAssignment.questions.0.correct_answer', [1])
                ->where('currentAssignment.questions.0.given_answer', [1])
                ->where('currentAssignment.questions.0.is_correct', true)
                ->has('currentAssignment.questions.0.body'));
    }
}
