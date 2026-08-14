<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Discussion;
use App\Models\DiscussionReply;
use App\Models\Lesson;
use App\Notifications\DiscussionReplied;
use App\Services\ContentVersion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Course and lesson discussion boards (Plan §9.4).
 *
 * Every route is enrollment-gated, so a board is only readable by people
 * actually taking the course. Staff on the course get moderation powers:
 * pinning, highlighting an answer, and removing anyone's post.
 */
class DiscussionController extends Controller
{
    /** The board for a course, optionally narrowed to one lesson. */
    public function index(Request $request, Course $course): Response
    {
        $key = 'board:'.$course->id.':'.$request->user()->id.':'.ContentVersion::current()
            .':'.md5(serialize($request->only('filter', 'lesson', 'search', 'page')));

        return Inertia::render('Discussions/Index', Cache::remember(
            $key,
            now()->addMinutes(5),
            fn () => $this->boardPayload($request, $course),
        ));
    }

    /** @return array<string, mixed> */
    private function boardPayload(Request $request, Course $course): array
    {
        $filter = $request->string('filter')->toString() ?: 'all';
        $lessonId = $request->string('lesson')->toString();
        $search = trim($request->string('search')->toString());

        $discussions = Discussion::where('course_id', $course->id)
            ->when($lessonId !== '', fn ($q) => $q->where('lesson_id', $lessonId))
            ->when($filter === 'unanswered', fn ($q) => $q->where('replies_count', 0))
            ->when($filter === 'solved', fn ($q) => $q->whereNotNull('solved_reply_id'))
            ->when($filter === 'mine', fn ($q) => $q->where('user_id', $request->user()->id))
            ->when($search !== '', fn ($q) => $q->where(fn ($inner) => $inner
                ->whereLike('title', "%{$search}%")
                ->orWhereLike('body', "%{$search}%")))
            ->with(['author:id,full_name,avatar_url', 'lesson:id,title'])
            ->orderByDesc('is_pinned')
            ->orderByDesc('last_activity_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Discussion $discussion) => $this->present($discussion))
            ->toArray();

        return [
            'course' => $course->only(['id', 'title', 'slug']),
            'discussions' => $discussions,
            'lessons' => Lesson::whereHas('module', fn ($q) => $q->where('course_id', $course->id))
                ->where('is_published', true)
                ->orderBy('order_index')
                ->get(['id', 'title'])
                ->toArray(),
            'filters' => ['filter' => $filter, 'lesson' => $lessonId, 'search' => $search],
            'canModerate' => $this->canModerate($request, $course),
        ];
    }

    public function show(Request $request, Discussion $discussion): Response
    {
        $discussion->load([
            'author:id,full_name,avatar_url',
            'course:id,title,slug',
            'lesson:id,title',
            'replies' => fn ($q) => $q->orderBy('created_at'),
            'replies.author:id,full_name,avatar_url,role_id',
            'replies.author.role:id,name,display_name',
        ]);

        return Inertia::render('Discussions/Show', [
            'discussion' => [
                ...$this->present($discussion),
                'body' => $discussion->body,
                'course' => $discussion->course?->only(['id', 'title', 'slug']),
            ],
            // One level of nesting: top-level replies each carry their answers.
            'replies' => $discussion->replies
                ->whereNull('parent_id')
                ->map(fn (DiscussionReply $reply) => [
                    ...$this->presentReply($reply, $discussion),
                    'children' => $discussion->replies
                        ->where('parent_id', $reply->id)
                        ->map(fn (DiscussionReply $child) => $this->presentReply($child, $discussion))
                        ->values(),
                ])->values(),
            'canModerate' => $this->canModerate($request, $discussion->course),
            'isAuthor' => $discussion->user_id === $request->user()->id,
        ]);
    }

    public function store(Request $request, Course $course): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:5000'],
            'lesson_id' => ['nullable', 'uuid', 'exists:lessons,id'],
        ]);

        $discussion = Discussion::create([
            ...$validated,
            'course_id' => $course->id,
            'user_id' => $request->user()->id,
            'last_activity_at' => now(),
        ]);

        return redirect()->route('discussions.show', $discussion)
            ->with('success', 'Your question has been posted.');
    }

    public function reply(Request $request, Discussion $discussion): RedirectResponse
    {
        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
            'parent_id' => ['nullable', 'uuid', 'exists:discussion_replies,id'],
        ]);

        $user = $request->user();

        $reply = DiscussionReply::create([
            ...$validated,
            'discussion_id' => $discussion->id,
            'user_id' => $user->id,
            // Staff answers are badged automatically.
            'is_instructor_answer' => $this->canModerate($request, $discussion->course),
        ]);

        $discussion->syncActivity();

        // Tell the thread author, unless they are the one replying.
        if ($discussion->user_id !== $user->id) {
            $discussion->author?->notify(new DiscussionReplied($discussion, $reply));
        }

        return back()->with('success', 'Reply posted.');
    }

    /** Mark a reply as the accepted answer. Author or staff only. */
    public function solve(Request $request, Discussion $discussion): RedirectResponse
    {
        $this->authorizeThreadOwner($request, $discussion);

        $validated = $request->validate([
            'reply_id' => ['nullable', 'uuid', 'exists:discussion_replies,id'],
        ]);

        $replyId = $validated['reply_id'] ?? null;

        if ($replyId && ! $discussion->replies()->whereKey($replyId)->exists()) {
            return back()->with('error', 'That reply is not part of this discussion.');
        }

        $discussion->update(['solved_reply_id' => $replyId]);

        return back()->with('success', $replyId ? 'Marked as solved.' : 'Solved mark removed.');
    }

    /** Pin a thread to the top of the board. Staff only. */
    public function pin(Request $request, Discussion $discussion): RedirectResponse
    {
        abort_unless($this->canModerate($request, $discussion->course), 403);

        $discussion->update(['is_pinned' => ! $discussion->is_pinned]);

        return back()->with('success', $discussion->is_pinned ? 'Thread pinned.' : 'Thread unpinned.');
    }

    public function destroy(Request $request, Discussion $discussion): RedirectResponse
    {
        $this->authorizeThreadOwner($request, $discussion);

        $course = $discussion->course;
        $discussion->delete();

        return redirect()->route('discussions.index', $course->slug)
            ->with('info', 'Discussion removed.');
    }

    public function destroyReply(Request $request, DiscussionReply $reply): RedirectResponse
    {
        $discussion = $reply->discussion;

        abort_unless(
            $reply->user_id === $request->user()->id || $this->canModerate($request, $discussion->course),
            403,
        );

        if ($discussion->solved_reply_id === $reply->id) {
            $discussion->update(['solved_reply_id' => null]);
        }

        $reply->delete();
        $discussion->syncActivity();

        return back()->with('info', 'Reply removed.');
    }

    /** @return array<string, mixed> */
    private function present(Discussion $discussion): array
    {
        return [
            'id' => $discussion->id,
            'title' => $discussion->title,
            'excerpt' => str($discussion->body)->limit(160)->toString(),
            'is_pinned' => $discussion->is_pinned,
            'is_solved' => $discussion->isSolved(),
            'solved_reply_id' => $discussion->solved_reply_id,
            'replies_count' => $discussion->replies_count,
            'last_activity_at' => $discussion->last_activity_at?->toIso8601String(),
            'created_at' => $discussion->created_at->toIso8601String(),
            'author' => $discussion->author?->only(['id', 'full_name', 'avatar_url']),
            'lesson' => $discussion->lesson?->only(['id', 'title']),
        ];
    }

    /** @return array<string, mixed> */
    private function presentReply(DiscussionReply $reply, Discussion $discussion): array
    {
        return [
            'id' => $reply->id,
            'body' => $reply->body,
            'created_at' => $reply->created_at->toIso8601String(),
            'is_instructor_answer' => $reply->is_instructor_answer,
            'is_accepted' => $discussion->solved_reply_id === $reply->id,
            'author' => [
                ...($reply->author?->only(['id', 'full_name', 'avatar_url']) ?? []),
                'role' => $reply->author?->role?->display_name,
            ],
        ];
    }

    /** Course staff (its instructor) and platform admins moderate. */
    private function canModerate(Request $request, ?Course $course): bool
    {
        $user = $request->user();

        return $user->isAdmin() || ($course && $course->instructor_id === $user->id);
    }

    private function authorizeThreadOwner(Request $request, Discussion $discussion): void
    {
        abort_unless(
            $discussion->user_id === $request->user()->id || $this->canModerate($request, $discussion->course),
            403,
        );
    }
}
