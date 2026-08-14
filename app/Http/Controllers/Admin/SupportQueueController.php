<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SupportTicket;
use App\Services\SupportStaff;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The staff queue (Plan §10.3): triage, assign, and work through tickets.
 */
class SupportQueueController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString() ?: SupportTicket::STATUS_OPEN;
        $assignee = $request->string('assignee')->toString();

        $tickets = SupportTicket::query()
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($assignee === 'unassigned', fn ($q) => $q->whereNull('assigned_to'))
            ->when($assignee !== '' && $assignee !== 'unassigned', fn ($q) => $q->where('assigned_to', $assignee))
            ->with(['requester:id,full_name,email', 'assignee:id,full_name'])
            ->withCount('messages')
            ->orderByRaw("case when priority = 'high' then 0 when priority = 'normal' then 1 else 2 end")
            ->orderBy('last_reply_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (SupportTicket $ticket) => [
                'id' => $ticket->id,
                'reference' => $ticket->reference,
                'subject' => $ticket->subject,
                'category' => $ticket->category,
                'priority' => $ticket->priority,
                'status' => $ticket->status,
                'messages_count' => $ticket->messages_count,
                'last_reply_at' => $ticket->last_reply_at?->toIso8601String(),
                'requester' => $ticket->requester?->only(['id', 'full_name', 'email']),
                'assignee' => $ticket->assignee?->only(['id', 'full_name']),
            ]);

        return Inertia::render('Admin/Support/Index', [
            'tickets' => $tickets,
            'filters' => ['status' => $status, 'assignee' => $assignee],
            'staff' => SupportStaff::all()->map->only(['id', 'full_name'])->all(),
            'counts' => [
                'open' => SupportTicket::where('status', SupportTicket::STATUS_OPEN)->count(),
                'pending' => SupportTicket::where('status', SupportTicket::STATUS_PENDING)->count(),
                'unassigned' => SupportTicket::whereNull('assigned_to')
                    ->whereIn('status', [SupportTicket::STATUS_OPEN, SupportTicket::STATUS_PENDING])
                    ->count(),
            ],
        ]);
    }

    /** Triage: assignee, priority and status in one action. */
    public function update(Request $request, SupportTicket $ticket): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'in:'.implode(',', SupportTicket::STATUSES)],
            'priority' => ['sometimes', 'in:'.implode(',', SupportTicket::PRIORITIES)],
            'assigned_to' => ['sometimes', 'nullable', 'uuid', 'exists:users,id'],
        ]);

        if (array_key_exists('status', $validated)) {
            $validated['resolved_at'] = in_array(
                $validated['status'],
                [SupportTicket::STATUS_RESOLVED, SupportTicket::STATUS_CLOSED],
                true,
            ) ? now() : null;
        }

        $ticket->update($validated);

        AuditLog::record('support_ticket.updated', 'support_ticket', $ticket->id, $validated, $request->user()->id);

        return back()->with('success', "Ticket {$ticket->reference} updated.");
    }
}
