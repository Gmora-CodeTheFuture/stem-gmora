<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Event;
use App\Models\LiveSession;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The student calendar.
 *
 * Three sources are merged into one feed: events published by staff, live
 * sessions scheduled on lessons, and assignment deadlines. Everything is
 * scoped to the courses the student is actually enrolled in.
 */
class CalendarController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Month being viewed, e.g. ?month=2026-08
        $month = Carbon::parse($request->string('month')->toString() ?: now()->format('Y-m').'-01')
            ->startOfMonth();

        // The grid spills into neighbouring months, so fetch the visible range.
        $from = $month->copy()->startOfWeek();
        $to = $month->copy()->endOfMonth()->endOfWeek();

        $courseIds = Enrollment::where('user_id', $user->id)
            ->whereIn('status', [Enrollment::STATUS_ACTIVE, Enrollment::STATUS_COMPLETED])
            ->pluck('course_id')
            ->all();

        $items = $this->events($courseIds, $from, $to)
            ->concat($this->liveSessions($courseIds, $from, $to))
            ->concat($this->deadlines($courseIds, $from, $to))
            ->sortBy('starts_at')
            ->values();

        return Inertia::render('Dashboard/Calendar', [
            'month' => $month->format('Y-m'),
            'monthLabel' => $month->format('F Y'),
            'rangeStart' => $from->toDateString(),
            'rangeEnd' => $to->toDateString(),
            'items' => $items,
            'canManage' => $this->canManage($request),
            // Courses this user may attach an event to.
            'manageableCourses' => $this->canManage($request)
                ? $this->manageableCourses($request)->map->only(['id', 'title'])->values()
                : [],
        ]);
    }

    /** Publish an event. Staff only — enforced by the route's role middleware. */
    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateEvent($request);

        $this->assertOwnsCourse($request, $validated['course_id'] ?? null);

        $event = Event::create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        AuditLog::record('event.created', 'event', $event->id, [
            'title' => $event->title,
            'starts_at' => $event->starts_at->toIso8601String(),
        ], $request->user()->id);

        return back()->with('success', 'Event published to the calendar.');
    }

    public function update(Request $request, Event $event): RedirectResponse
    {
        $validated = $this->validateEvent($request);

        $this->assertOwnsCourse($request, $event->course_id);
        $this->assertOwnsCourse($request, $validated['course_id'] ?? null);

        $event->update($validated);

        AuditLog::record('event.updated', 'event', $event->id, $validated, $request->user()->id);

        return back()->with('success', 'Event updated.');
    }

    public function destroy(Request $request, Event $event): RedirectResponse
    {
        $this->assertOwnsCourse($request, $event->course_id);

        $event->delete();

        AuditLog::record('event.deleted', 'event', $event->id, null, $request->user()->id);

        return back()->with('info', 'Event removed.');
    }

    /** @return array<string, mixed> */
    private function validateEvent(Request $request): array
    {
        return $request->validate([
            'course_id' => ['nullable', 'uuid', 'exists:courses,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'type' => ['required', 'in:'.implode(',', Event::TYPES)],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'location' => ['nullable', 'string', 'max:255'],
            'join_url' => ['nullable', 'url', 'max:255'],
            'is_published' => ['sometimes', 'boolean'],
        ]);
    }

    /** Instructors may only publish against their own courses. */
    private function assertOwnsCourse(Request $request, ?string $courseId): void
    {
        if ($courseId === null) {
            // Platform-wide events are an admin-only privilege.
            abort_unless($request->user()->isAdmin(), 403, 'Only admins can publish platform-wide events.');

            return;
        }

        abort_unless(
            $this->manageableCourses($request)->contains('id', $courseId),
            403,
            'You can only manage events for your own courses.',
        );
    }

    private function canManage(Request $request): bool
    {
        $user = $request->user();

        return $user->isAdmin() || $this->manageableCourses($request)->isNotEmpty();
    }

    /** @return Collection<int, Course> */
    private function manageableCourses(Request $request): Collection
    {
        $user = $request->user();

        return $user->isAdmin()
            ? Course::orderBy('title')->get(['id', 'title'])
            : Course::where('instructor_id', $user->id)->orderBy('title')->get(['id', 'title']);
    }

    /** @return Collection<int, array<string, mixed>> */
    private function events(array $courseIds, Carbon $from, Carbon $to): Collection
    {
        return Event::visibleTo($courseIds)
            ->between($from, $to)
            ->with('course:id,title,slug')
            ->get()
            ->map(fn (Event $event) => [
                'id' => $event->id,
                'source' => 'event',
                'type' => $event->type,
                'title' => $event->title,
                'description' => $event->description,
                'starts_at' => $event->starts_at->toIso8601String(),
                'ends_at' => $event->ends_at?->toIso8601String(),
                'location' => $event->location,
                'url' => $event->join_url,
                'course' => $event->course?->only(['id', 'title', 'slug']),
                'editable' => true,
            ]);
    }

    /** @return Collection<int, array<string, mixed>> */
    private function liveSessions(array $courseIds, Carbon $from, Carbon $to): Collection
    {
        if ($courseIds === []) {
            return collect();
        }

        return LiveSession::whereBetween('scheduled_start', [$from, $to])
            ->whereHas('lesson.module', fn ($q) => $q->whereIn('course_id', $courseIds))
            ->with('lesson.module.course:id,title,slug')
            ->get()
            ->map(fn (LiveSession $session) => [
                'id' => $session->id,
                'source' => 'live_session',
                'type' => Event::TYPE_CLASS,
                'title' => $session->title,
                'description' => null,
                'starts_at' => $session->scheduled_start->toIso8601String(),
                'ends_at' => $session->scheduled_start->copy()
                    ->addMinutes($session->duration_minutes)->toIso8601String(),
                'location' => 'Zoom',
                // The join link is time-boxed around the session (Plan §8.5).
                'url' => $session->scheduled_start->diffInMinutes(now(), absolute: true) <= 30
                    ? $session->zoom_join_url
                    : null,
                'course' => $session->lesson?->module?->course?->only(['id', 'title', 'slug']),
                'editable' => false,
            ]);
    }

    /** @return Collection<int, array<string, mixed>> */
    private function deadlines(array $courseIds, Carbon $from, Carbon $to): Collection
    {
        if ($courseIds === []) {
            return collect();
        }

        return Assignment::whereIn('course_id', $courseIds)
            ->where('is_published', true)
            ->whereNotNull('deadline_at')
            ->whereBetween('deadline_at', [$from, $to])
            ->with('course:id,title,slug')
            ->get()
            ->map(fn (Assignment $assignment) => [
                'id' => $assignment->id,
                'source' => 'assignment',
                'type' => Event::TYPE_DEADLINE,
                'title' => $assignment->title.' due',
                'description' => null,
                'starts_at' => $assignment->deadline_at->toIso8601String(),
                'ends_at' => null,
                'location' => null,
                'url' => route('assignments.show', $assignment->id),
                'course' => $assignment->course?->only(['id', 'title', 'slug']),
                'editable' => false,
            ]);
    }
}
