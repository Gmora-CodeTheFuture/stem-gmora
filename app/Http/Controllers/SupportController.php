<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\SupportTicket;
use App\Models\SupportTicketMessage;
use App\Notifications\SupportTicketReplied;
use App\Services\SupportStaff;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The learner's side of support: raise a ticket, follow the thread, reply.
 *
 * A ticket is private to its author and to staff — there is no route by which
 * one student can read another's, which matters because tickets routinely
 * carry personal detail (Plan §7.6).
 */
class SupportController extends Controller
{
    public function index(Request $request): Response
    {
        $tickets = SupportTicket::where('user_id', $request->user()->id)
            ->withCount('messages')
            ->orderByDesc('last_reply_at')
            ->get()
            ->map(fn (SupportTicket $ticket) => $this->summary($ticket))
            ->all();

        return Inertia::render('Support/Index', [
            'tickets' => $tickets,
            'categories' => SupportTicket::CATEGORIES,
            'courses' => Enrollment::where('user_id', $request->user()->id)
                ->with('course:id,title')
                ->get()
                ->map(fn (Enrollment $e) => $e->course?->only(['id', 'title']))
                ->filter()
                ->values()
                ->all(),
        ]);
    }

    public function show(Request $request, SupportTicket $ticket): Response
    {
        $this->authorizeView($request, $ticket);

        $ticket->load(['messages.author:id,full_name', 'assignee:id,full_name', 'course:id,title']);

        return Inertia::render('Support/Show', [
            'ticket' => [
                ...$this->summary($ticket),
                'assignee' => $ticket->assignee?->full_name,
                'course' => $ticket->course?->title,
                'is_staff_view' => false,
            ],
            'messages' => $ticket->messages
                ->sortBy('created_at')
                ->map(fn (SupportTicketMessage $message) => [
                    'id' => $message->id,
                    'body' => $message->body,
                    'from_staff' => $message->from_staff,
                    'author' => $message->author?->full_name,
                    'created_at' => $message->created_at->toIso8601String(),
                ])
                ->values()
                ->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:5000'],
            'category' => ['required', 'in:'.implode(',', SupportTicket::CATEGORIES)],
            'course_id' => ['nullable', 'uuid', 'exists:courses,id'],
        ]);

        $ticket = SupportTicket::create([
            'user_id' => $request->user()->id,
            'subject' => $validated['subject'],
            'category' => $validated['category'],
            'course_id' => $validated['course_id'] ?? null,
            'status' => SupportTicket::STATUS_OPEN,
        ]);

        $ticket->messages()->create([
            'user_id' => $request->user()->id,
            'body' => $validated['body'],
            'from_staff' => false,
        ]);

        return redirect()->route('support.show', $ticket)
            ->with('success', "Ticket {$ticket->reference} raised. We'll get back to you here.");
    }

    public function reply(Request $request, SupportTicket $ticket): RedirectResponse
    {
        $this->authorizeView($request, $ticket);

        $validated = $request->validate(['body' => ['required', 'string', 'max:5000']]);

        $user = $request->user();
        $fromStaff = SupportStaff::includes($user);

        $ticket->messages()->create([
            'user_id' => $user->id,
            'body' => $validated['body'],
            'from_staff' => $fromStaff,
        ]);

        $ticket->update([
            'last_reply_at' => now(),
            // A staff answer waits on the student; a student reply reopens it.
            'status' => $fromStaff ? SupportTicket::STATUS_PENDING : SupportTicket::STATUS_OPEN,
            'resolved_at' => null,
        ]);

        if ($fromStaff) {
            $ticket->requester?->notify(new SupportTicketReplied($ticket));
        }

        return back()->with('success', 'Reply sent.');
    }

    /** The requester can close their own ticket once they are satisfied. */
    public function close(Request $request, SupportTicket $ticket): RedirectResponse
    {
        $this->authorizeView($request, $ticket);

        $ticket->update([
            'status' => SupportTicket::STATUS_CLOSED,
            'resolved_at' => now(),
        ]);

        return back()->with('info', 'Ticket closed.');
    }

    /** @return array<string, mixed> */
    private function summary(SupportTicket $ticket): array
    {
        return [
            'id' => $ticket->id,
            'reference' => $ticket->reference,
            'subject' => $ticket->subject,
            'category' => $ticket->category,
            'priority' => $ticket->priority,
            'status' => $ticket->status,
            'messages_count' => $ticket->messages_count ?? $ticket->messages()->count(),
            'last_reply_at' => $ticket->last_reply_at?->toIso8601String(),
            'created_at' => $ticket->created_at->toIso8601String(),
            'is_closed' => $ticket->isClosed(),
        ];
    }

    private function authorizeView(Request $request, SupportTicket $ticket): void
    {
        abort_unless(
            $ticket->user_id === $request->user()->id || SupportStaff::includes($request->user()),
            403,
        );
    }
}
