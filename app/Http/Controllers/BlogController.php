<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Services\ContentVersion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The public blog (Plan §4.1). Drafts and future-dated posts are invisible
 * here regardless of who is looking — staff preview through the admin screen.
 */
class BlogController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim($request->string('search')->toString());
        $category = $request->string('category')->toString();
        $tag = $request->string('tag')->toString();

        $key = 'blog:index:'.ContentVersion::current().':'.md5(serialize([
            $search, $category, $tag, $request->integer('page', 1),
        ]));

        return Inertia::render('Marketing/Blog/Index', Cache::remember(
            $key,
            now()->addMinutes(10),
            fn () => $this->payload($search, $category, $tag),
        ));
    }

    /** @return array<string, mixed> */
    private function payload(string $search, string $category, string $tag): array
    {
        $posts = Post::live()
            ->with('author:id,full_name,avatar_url')
            ->when($search !== '', fn ($q) => $q->where(fn ($inner) => $inner
                ->whereLike('title', "%{$search}%")
                ->orWhereLike('excerpt', "%{$search}%")
                ->orWhereLike('body', "%{$search}%")))
            ->when($category !== '', fn ($q) => $q->where('category', $category))
            ->when($tag !== '', fn ($q) => $q->whereJsonContains('tags', $tag))
            ->orderByDesc('published_at')
            ->paginate(9)
            ->withQueryString()
            ->through(fn (Post $post) => $this->card($post))
            ->toArray();

        return [
            'posts' => $posts,
            'categories' => Post::live()->whereNotNull('category')
                ->distinct()->orderBy('category')->pluck('category')->all(),
            'filters' => ['search' => $search, 'category' => $category, 'tag' => $tag],
        ];
    }

    public function show(string $slug): Response
    {
        $post = Post::live()->where('slug', $slug)->with('author:id,full_name,avatar_url,headline')->firstOrFail();

        return Inertia::render('Marketing/Blog/Show', [
            'post' => [
                ...$this->card($post),
                'html' => $post->renderedBody(),
                'author' => [
                    ...($post->author?->only(['id', 'full_name', 'avatar_url']) ?? []),
                    'headline' => $post->author?->headline,
                ],
            ],
            // Same category first, so the suggestion is actually relevant.
            'related' => Post::live()
                ->whereKeyNot($post->id)
                ->when($post->category, fn ($q) => $q->where('category', $post->category))
                ->orderByDesc('published_at')
                ->take(3)
                ->get()
                ->map(fn (Post $related) => $this->card($related))
                ->all(),
        ]);
    }

    /** @return array<string, mixed> */
    private function card(Post $post): array
    {
        return [
            'id' => $post->id,
            'title' => $post->title,
            'slug' => $post->slug,
            'excerpt' => $post->excerpt,
            'category' => $post->category,
            'tags' => $post->tags ?? [],
            'cover_image_url' => $post->cover_image_url,
            'published_at' => $post->published_at?->toIso8601String(),
            'reading_minutes' => $post->readingMinutes(),
            'author_name' => $post->author?->full_name,
        ];
    }
}
