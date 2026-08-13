<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Submission;
use App\Models\User;
use App\Notifications\SubmissionGraded;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notification;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_grading_notifies_the_student(): void
    {
        $instructor = User::factory()->instructor()->create();
        $course = Course::factory()->create(['instructor_id' => $instructor->id]);
        $student = User::factory()->create();
        Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);

        $assignment = Assignment::create([
            'course_id' => $course->id,
            'title' => 'Build a classifier',
            'max_marks' => 100,
            'is_published' => true,
        ]);

        $this->actingAs($student)->post(route('assignments.submit', $assignment), [
            'type' => 'repo',
            'repo_url' => 'https://github.com/student/v1',
        ]);

        $this->actingAs($instructor)->patch(
            route('instructor.grade-submission', Submission::firstOrFail()),
            ['marks_awarded' => 88, 'feedback' => 'Nice work.', 'status' => 'graded'],
        );

        $notification = $student->fresh()->notifications()->first();

        $this->assertNotNull($notification);
        $this->assertSame(SubmissionGraded::class, $notification->type);
        $this->assertStringContainsString('88/100', $notification->data['body']);
    }

    public function test_notifications_page_lists_and_marks_read(): void
    {
        $student = User::factory()->create();

        $student->notify(new class extends Notification
        {
            public function via(object $notifiable): array
            {
                return ['database'];
            }

            public function toArray(object $notifiable): array
            {
                return ['title' => 'Quiz result ready', 'body' => 'You scored 80%.'];
            }
        });

        $this->actingAs($student)
            ->get(route('dashboard.notifications'))
            ->assertOk()
            ->assertSee('Quiz result ready');

        $notification = $student->notifications()->firstOrFail();
        $this->assertNull($notification->read_at);

        $this->actingAs($student)->post(route('notifications.read', $notification->id));

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_a_user_cannot_mark_someone_elses_notification_read(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $owner->notify(new class extends Notification
        {
            public function via(object $notifiable): array
            {
                return ['database'];
            }

            public function toArray(object $notifiable): array
            {
                return ['title' => 'Private'];
            }
        });

        $notification = $owner->notifications()->firstOrFail();

        $this->actingAs($intruder)->post(route('notifications.read', $notification->id));

        $this->assertNull($notification->fresh()->read_at);
    }

    public function test_mark_all_read_clears_the_badge(): void
    {
        $student = User::factory()->create();

        foreach (range(1, 3) as $i) {
            $student->notify(new class extends Notification
            {
                public function via(object $notifiable): array
                {
                    return ['database'];
                }

                public function toArray(object $notifiable): array
                {
                    return ['title' => 'Something happened'];
                }
            });
        }

        $this->assertSame(3, $student->unreadNotifications()->count());

        $this->actingAs($student)->post(route('notifications.read-all'));

        $this->assertSame(0, $student->fresh()->unreadNotifications()->count());
    }
}
