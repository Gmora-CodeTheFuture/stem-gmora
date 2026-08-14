<?php

namespace App\Http\Controllers;

use App\Models\Enrollment;
use App\Models\Event;
use App\Models\EventRegistration;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Signing up for a workshop, hackathon or class on the calendar.
 *
 * Visibility rules match the calendar itself: a student may only register for
 * a platform-wide event, or one attached to a course they are enrolled in.
 */
class EventRegistrationController extends Controller
{
    public function store(Request $request, Event $event): RedirectResponse
    {
        $this->assertVisible($request, $event);

        if (! $event->acceptsRegistrations()) {
            return back()->with('error', $event->isFull()
                ? 'This event is full.'
                : 'Registration is closed for this event.');
        }

        // Two people claiming the last seat at once must not both get it, so
        // the capacity check and the insert happen together.
        DB::transaction(function () use ($request, $event) {
            $locked = Event::whereKey($event->id)->lockForUpdate()->first();

            if ($locked->isFull()) {
                return;
            }

            EventRegistration::firstOrCreate(
                ['event_id' => $event->id, 'user_id' => $request->user()->id],
                ['registered_at' => now()],
            );
        });

        return back()->with('success', "You're registered for \"{$event->title}\".");
    }

    public function destroy(Request $request, Event $event): RedirectResponse
    {
        EventRegistration::where('event_id', $event->id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return back()->with('info', 'Registration cancelled.');
    }

    private function assertVisible(Request $request, Event $event): void
    {
        if ($event->course_id === null) {
            return;
        }

        $enrolled = Enrollment::where('user_id', $request->user()->id)
            ->where('course_id', $event->course_id)
            ->whereIn('status', [Enrollment::STATUS_ACTIVE, Enrollment::STATUS_COMPLETED])
            ->exists();

        abort_unless($enrolled, 403, 'This event belongs to a course you are not enrolled in.');
    }
}
