<?php

namespace Tests\Feature;

use App\Models\SupportTicket;
use App\Models\User;
use App\Notifications\SupportTicketReplied;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupportTicketTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->create();
        $this->staff = User::factory()->admin()->create();
    }

    private function ticket(?User $owner = null): SupportTicket
    {
        $ticket = SupportTicket::create([
            'user_id' => ($owner ?? $this->student)->id,
            'subject' => 'Video will not play',
            'category' => 'technical',
        ]);

        $ticket->messages()->create([
            'user_id' => $ticket->user_id,
            'body' => 'The player spins forever on lesson three.',
            'from_staff' => false,
        ]);

        return $ticket;
    }

    public function test_a_student_can_raise_a_ticket(): void
    {
        $this->actingAs($this->student)
            ->post(route('support.store'), [
                'subject' => 'Certificate has the wrong name',
                'body' => 'It shows my old name.',
                'category' => 'general',
            ])
            ->assertSessionHasNoErrors();

        $ticket = SupportTicket::firstOrFail();

        $this->assertSame($this->student->id, $ticket->user_id);
        $this->assertSame(SupportTicket::STATUS_OPEN, $ticket->status);
        $this->assertStringStartsWith('GS-', $ticket->reference);
        $this->assertSame(1, $ticket->messages()->count());
    }

    public function test_a_student_only_sees_their_own_tickets(): void
    {
        $mine = $this->ticket();
        $theirs = $this->ticket(User::factory()->create());

        $this->actingAs($this->student)
            ->get(route('support.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('tickets', 1)->where('tickets.0.id', $mine->id));

        // And cannot open someone else's by URL.
        $this->actingAs($this->student)->get(route('support.show', $theirs))->assertForbidden();
    }

    public function test_staff_can_read_any_ticket(): void
    {
        $ticket = $this->ticket();

        $this->actingAs($this->staff)->get(route('support.show', $ticket))->assertOk();
    }

    public function test_a_staff_reply_is_badged_and_notifies_the_student(): void
    {
        $ticket = $this->ticket();

        $this->actingAs($this->staff)
            ->post(route('support.reply', $ticket), ['body' => 'Try clearing your cache and tell us if it helps.'])
            ->assertSessionHasNoErrors();

        $reply = $ticket->messages()->latest('created_at')->first();

        $this->assertTrue($reply->from_staff);
        // Waiting on the student now.
        $this->assertSame(SupportTicket::STATUS_PENDING, $ticket->refresh()->status);

        $notification = $this->student->fresh()->notifications()->first();
        $this->assertSame(SupportTicketReplied::class, $notification->type);
    }

    public function test_a_student_reply_reopens_the_ticket_and_notifies_nobody(): void
    {
        $ticket = $this->ticket();
        $ticket->update(['status' => SupportTicket::STATUS_PENDING]);

        $this->actingAs($this->student)
            ->post(route('support.reply', $ticket), ['body' => 'Still broken, same spinner.'])
            ->assertSessionHasNoErrors();

        $this->assertSame(SupportTicket::STATUS_OPEN, $ticket->refresh()->status);
        $this->assertFalse($ticket->messages()->latest('created_at')->first()->from_staff);
        $this->assertSame(0, $this->student->fresh()->notifications()->count());
    }

    public function test_a_stranger_cannot_reply(): void
    {
        $ticket = $this->ticket();

        $this->actingAs(User::factory()->create())
            ->post(route('support.reply', $ticket), ['body' => 'Let me in'])
            ->assertForbidden();

        $this->assertSame(1, $ticket->messages()->count());
    }

    public function test_the_requester_can_close_and_reopen_by_replying(): void
    {
        $ticket = $this->ticket();

        $this->actingAs($this->student)->patch(route('support.close', $ticket))->assertSessionHasNoErrors();

        $ticket->refresh();
        $this->assertSame(SupportTicket::STATUS_CLOSED, $ticket->status);
        $this->assertNotNull($ticket->resolved_at);

        $this->actingAs($this->student)->post(route('support.reply', $ticket), ['body' => 'It came back.']);

        $this->assertSame(SupportTicket::STATUS_OPEN, $ticket->refresh()->status);
        $this->assertNull($ticket->resolved_at);
    }

    public function test_only_staff_reach_the_queue(): void
    {
        $this->actingAs($this->student)->get(route('admin.support.index'))->assertForbidden();
        $this->actingAs($this->staff)->get(route('admin.support.index'))->assertOk();
    }

    public function test_staff_can_triage_a_ticket(): void
    {
        $ticket = $this->ticket();

        $this->actingAs($this->staff)
            ->patch(route('admin.support.update', $ticket), [
                'assigned_to' => $this->staff->id,
                'priority' => 'high',
                'status' => SupportTicket::STATUS_RESOLVED,
            ])
            ->assertSessionHasNoErrors();

        $ticket->refresh();

        $this->assertSame($this->staff->id, $ticket->assigned_to);
        $this->assertSame('high', $ticket->priority);
        $this->assertNotNull($ticket->resolved_at);
        $this->assertDatabaseHas('audit_logs', ['action' => 'support_ticket.updated']);
    }

    public function test_the_queue_filters_by_status_and_assignment(): void
    {
        $open = $this->ticket();
        $assigned = $this->ticket();
        $assigned->update(['assigned_to' => $this->staff->id, 'status' => SupportTicket::STATUS_PENDING]);

        $this->actingAs($this->staff)
            ->get(route('admin.support.index', ['status' => 'open']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('tickets.data', 1)->where('tickets.data.0.id', $open->id));

        $this->actingAs($this->staff)
            ->get(route('admin.support.index', ['status' => 'all', 'assignee' => 'unassigned']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('tickets.data', 1)->where('tickets.data.0.id', $open->id));
    }
}
