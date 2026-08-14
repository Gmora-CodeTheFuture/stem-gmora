<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Blog authoring. Staff write here; the public controller only ever serves
 * what has actually been published.
 */
class PostManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $posts = Post::with('author:id,full_name')
            ->when($request->string('search')->toString(), fn ($q, $search) => $q->whereLike('title', "%{$search}%"))
            ->when($request->string('status')->toString(), fn ($q, $status) => $q->where('status', $status))
            ->latest('updated_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Post $post) => [
                'id' => $post->id,
                'title' => $post->title,
                'slug' => $post->slug,
                'category' => $post->category,
                'status' => $post->status,
                'is_live' => $post->isLive(),
                'published_at' => $post->published_at?->toIso8601String(),
                'updated_at' => $post->updated_at->toIso8601String(),
                'author_name' => $post->author?->full_name,
            ]);

        return Inertia::render('Admin/Posts/Index', [
            'posts' => $posts,
            'filters' => $request->only('search', 'status'),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Posts/Edit', ['post' => null]);
    }

    public function edit(Post $post): Response
    {
        return Inertia::render('Admin/Posts/Edit', [
            'post' => [
                ...$post->only([
                    'id', 'title', 'slug', 'excerpt', 'body',
                    'cover_image_url', 'category', 'status',
                ]),
                'tags' => $post->tags ?? [],
                'published_at' => $post->published_at?->format('Y-m-d\TH:i'),
                'preview_html' => $post->renderedBody(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validatePost($request);

        $post = Post::create([
            ...$validated,
            'author_id' => $request->user()->id,
            'slug' => $this->uniqueSlug($validated['title']),
            'published_at' => $this->publishedAt($validated),
        ]);

        AuditLog::record('post.created', 'post', $post->id, ['title' => $post->title], $request->user()->id);

        return redirect()->route('admin.posts.edit', $post)->with('success', 'Post created.');
    }

    public function update(Request $request, Post $post): RedirectResponse
    {
        $validated = $this->validatePost($request);

        $post->update([
            ...$validated,
            // The slug is part of the public URL, so it only follows the title
            // while the post has never been published.
            'slug' => $post->published_at ? $post->slug : $this->uniqueSlug($validated['title'], $post->id),
            'published_at' => $this->publishedAt($validated, $post),
        ]);

        AuditLog::record('post.updated', 'post', $post->id, [
            'status' => $post->status,
        ], $request->user()->id);

        return back()->with('success', 'Post saved.');
    }

    public function destroy(Request $request, Post $post): RedirectResponse
    {
        $title = $post->title;
        $post->delete();

        AuditLog::record('post.deleted', 'post', $post->id, ['title' => $title], $request->user()->id);

        return redirect()->route('admin.posts.index')->with('info', "\"{$title}\" deleted.");
    }

    /** @return array<string, mixed> */
    private function validatePost(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'body' => ['required', 'string'],
            'cover_image_url' => ['nullable', 'url', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'tags' => ['nullable', 'array', 'max:10'],
            'tags.*' => ['string', 'max:40'],
            'status' => ['required', 'in:draft,published'],
            'published_at' => ['nullable', 'date'],
        ]);
    }

    /**
     * Publishing without an explicit date means "now"; going back to draft
     * clears the date so the post leaves the public index.
     */
    private function publishedAt(array $validated, ?Post $post = null): ?string
    {
        if ($validated['status'] !== Post::STATUS_PUBLISHED) {
            return null;
        }

        return $validated['published_at']
            ?? $post?->published_at?->toDateTimeString()
            ?? now()->toDateTimeString();
    }

    private function uniqueSlug(string $title, ?string $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'post';
        $slug = $base;
        $suffix = 2;

        while (
            Post::withTrashed()->where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
                ->exists()
        ) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
