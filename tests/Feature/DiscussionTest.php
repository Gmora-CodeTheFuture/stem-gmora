<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Discussion;
use App\Models\DiscussionReply;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use App\Notifications\DiscussionReplied;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DiscussionTest extends TestCase
{
    use RefreshDatabase;

    private Course $course;

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
    }

    private function thread(array $attributes = []): Discussion
    {
        return Discussion::create([
            'course_id' => $this->course->id,
            'user_id' => $this->student->id,
            'title' => 'How does gradient descent work?',
            'body' => 'I understand the loss but not the update step.',
            'last_activity_at' => now(),
            ...$attributes,
        ]);
    }

    public function test_an_enrolled_student_can_ask_a_question(): void
    {
        $this->actingAs($this->student)
            ->post(route('discussions.store', $this->course->slug), [
                'title' => 'Why is my model overfitting?',
                'body' => 'Training accuracy is 99% but validation is 60%.',
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('discussions', [
            'course_id' => $this->course->id,
            'user_id' => $this->student->id,
            'title' => 'Why is my model overfitting?',
        ]);
    }

    public function test_someone_not_enrolled_cannot_see_or_post_to_the_board(): void
    {
        $outsider = User::factory()->create();

        $this->actingAs($outsider)
            ->get(route('discussions.index', $this->course->slug))
            ->assertForbidden();

        $this->actingAs($outsider)
            ->post(route('discussions.store', $this->course->slug), ['title' => 'Hi', 'body' => 'Let me in'])
            ->assertForbidden();

        $this->actingAs($outsider)
            ->get(route('discussions.show', $this->thread()))
            ->assertForbidden();
    }

    public function test_replying_bumps_activity_and_notifies_the_author(): void
    {
        $thread = $this->thread();
        $classmate = User::factory()->create();
        Enrollment::factory()->create(['user_id' => $classmate->id, 'course_id' => $this->course->id]);

        $this->actingAs($classmate)
            ->post(route('discussions.reply', $thread), ['body' => 'Try lowering the learning rate.'])
            ->assertSessionHasNoErrors();

        $thread->refresh();

        $this->assertSame(1, $thread->replies_count);

        $notification = $this->student->fresh()->notifications()->first();

        $this->assertSame(DiscussionReplied::class, $notification->type);
        $this->assertStringContainsString($thread->title, $notification->data['title']);
    }

    public function test_replying_to_your_own_thread_does_not_notify_you(): void
    {
        $thread = $this->thread();

        $this->actingAs($this->student)->post(route('discussions.reply', $thread), ['body' => 'Figured it out.']);

        $this->assertSame(0, $this->student->fresh()->notifications()->count());
    }

    public function test_staff_replies_are_badged_as_instructor_answers(): void
    {
        $thread = $this->thread();

        $this->actingAs($this->instructor)
            ->post(route('discussions.reply', $thread), ['body' => 'Great question — here is the intuition.']);

        $this->assertTrue(DiscussionReply::firstOrFail()->is_instructor_answer);
    }

    public function test_the_author_can_accept_an_answer(): void
    {
        $thread = $this->thread();
        $reply = DiscussionReply::create([
            'discussion_id' => $thread->id,
            'user_id' => $this->instructor->id,
            'body' => 'Because the gradient points uphill.',
        ]);

        $this->actingAs($this->student)
            ->patch(route('discussions.solve', $thread), ['reply_id' => $reply->id])
            ->assertSessionHasNoErrors();

        $this->assertSame($reply->id, $thread->refresh()->solved_reply_id);
        $this->assertTrue($thread->isSolved());
    }

    public function test_a_bystander_cannot_accept_an_answer(): void
    {
        $thread = $this->thread();
        $classmate = User::factory()->create();
        Enrollment::factory()->create(['user_id' => $classmate->id, 'course_id' => $this->course->id]);

        $reply = DiscussionReply::create([
            'discussion_id' => $thread->id,
            'user_id' => $classmate->id,
            'body' => 'I think it is this.',
        ]);

        $this->actingAs($classmate)
            ->patch(route('discussions.solve', $thread), ['reply_id' => $reply->id])
            ->assertForbidden();

        $this->assertNull($thread->refresh()->solved_reply_id);
    }

    public function test_only_staff_can_pin(): void
    {
        $thread = $this->thread();

        $this->actingAs($this->student)->patch(route('discussions.pin', $thread))->assertForbidden();

        $this->actingAs($this->instructor)->patch(route('discussions.pin', $thread))->assertSessionHasNoErrors();

        $this->assertTrue($thread->refresh()->is_pinned);
    }

    public function test_pinned_threads_sort_first(): void
    {
        $this->thread(['title' => 'Newer question', 'last_activity_at' => now()]);
        $pinned = $this->thread(['title' => 'Read me first', 'is_pinned' => true, 'last_activity_at' => now()->subDay()]);

        $this->actingAs($this->student)
            ->get(route('discussions.index', $this->course->slug))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('discussions.data.0.id', $pinned->id));
    }

    public function test_filters_narrow_the_board(): void
    {
        $answered = $this->thread(['title' => 'Answered thread']);
        DiscussionReply::create([
            'discussion_id' => $answered->id,
            'user_id' => $this->instructor->id,
            'body' => 'Here you go.',
        ]);
        $answered->syncActivity();

        $this->thread(['title' => 'Nobody replied yet']);

        $this->actingAs($this->student)
            ->get(route('discussions.index', [$this->course->slug, 'filter' => 'unanswered']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('discussions.data', 1)
                ->where('discussions.data.0.title', 'Nobody replied yet'));
    }

    public function test_a_lesson_filter_scopes_the_board(): void
    {
        $module = Module::factory()->create(['course_id' => $this->course->id]);
        $lesson = Lesson::factory()->create(['module_id' => $module->id]);

        $this->thread(['title' => 'About this lesson', 'lesson_id' => $lesson->id]);
        $this->thread(['title' => 'General question']);

        $this->actingAs($this->student)
            ->get(route('discussions.index', [$this->course->slug, 'lesson' => $lesson->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('discussions.data', 1)
                ->where('discussions.data.0.title', 'About this lesson'));
    }

    public function test_staff_can_remove_any_reply_and_the_count_follows(): void
    {
        $thread = $this->thread();
        $reply = DiscussionReply::create([
            'discussion_id' => $thread->id,
            'user_id' => $this->student->id,
            'body' => 'Never mind.',
        ]);
        $thread->syncActivity();

        $this->assertSame(1, $thread->refresh()->replies_count);

        $this->actingAs($this->instructor)
            ->delete(route('discussions.reply.destroy', $reply))
            ->assertSessionHasNoErrors();

        $this->assertSoftDeleted($reply);
        $this->assertSame(0, $thread->refresh()->replies_count);
    }

    public function test_removing_the_accepted_reply_clears_the_solved_mark(): void
    {
        $thread = $this->thread();
        $reply = DiscussionReply::create([
            'discussion_id' => $thread->id,
            'user_id' => $this->instructor->id,
            'body' => 'This is the answer.',
        ]);
        $thread->update(['solved_reply_id' => $reply->id]);

        $this->actingAs($this->instructor)->delete(route('discussions.reply.destroy', $reply));

        $this->assertNull($thread->refresh()->solved_reply_id);
    }
}
