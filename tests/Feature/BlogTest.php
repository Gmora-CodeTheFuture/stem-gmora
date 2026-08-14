<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BlogTest extends TestCase
{
    use RefreshDatabase;

    private function article(array $attributes = []): Post
    {
        return Post::create([
            'author_id' => User::factory()->admin()->create()->id,
            'title' => 'Teaching neural networks',
            'slug' => 'teaching-neural-networks-'.fake()->unique()->numerify('###'),
            'excerpt' => 'What works in the classroom.',
            'body' => "## Heading\n\nSome **markdown** body.",
            'status' => Post::STATUS_PUBLISHED,
            'published_at' => now()->subDay(),
            ...$attributes,
        ]);
    }

    public function test_the_public_blog_lists_published_posts(): void
    {
        $live = $this->article(['title' => 'A live article']);
        $this->article(['title' => 'A draft article', 'status' => Post::STATUS_DRAFT, 'published_at' => null]);

        $this->get(route('blog.index'))
            ->assertOk()
            ->assertSee('A live article')
            ->assertDontSee('A draft article');

        $this->get(route('blog.show', $live->slug))->assertOk()->assertSee('A live article');
    }

    public function test_future_dated_posts_stay_hidden_until_their_date(): void
    {
        $scheduled = $this->article(['title' => 'Scheduled article', 'published_at' => now()->addWeek()]);

        $this->get(route('blog.index'))->assertOk()->assertDontSee('Scheduled article');
        $this->get(route('blog.show', $scheduled->slug))->assertNotFound();

        $this->travel(8)->days();

        $this->get(route('blog.show', $scheduled->slug))->assertOk();
    }

    public function test_a_draft_is_not_reachable_by_url(): void
    {
        $draft = $this->article(['status' => Post::STATUS_DRAFT, 'published_at' => null]);

        $this->get(route('blog.show', $draft->slug))->assertNotFound();
    }

    public function test_markdown_is_rendered_and_raw_html_is_stripped(): void
    {
        $post = $this->article([
            'body' => "## Real heading\n\n<script>alert('xss')</script>\n\nSafe **text**.",
        ]);

        $html = $post->renderedBody();

        $this->assertStringContainsString('<h2>Real heading</h2>', $html);
        $this->assertStringContainsString('<strong>text</strong>', $html);
        $this->assertStringNotContainsString('<script>', $html);
    }

    public function test_posts_can_be_filtered_by_category_and_tag(): void
    {
        $this->article(['title' => 'Robotics piece', 'category' => 'Robotics', 'tags' => ['arduino']]);
        $this->article(['title' => 'AI piece', 'category' => 'AI', 'tags' => ['models']]);

        $this->get(route('blog.index', ['category' => 'Robotics']))
            ->assertOk()
            ->assertSee('Robotics piece')
            ->assertDontSee('AI piece');

        $this->get(route('blog.index', ['tag' => 'models']))
            ->assertOk()
            ->assertSee('AI piece')
            ->assertDontSee('Robotics piece');
    }

    public function test_search_matches_titles_and_bodies(): void
    {
        $this->article(['title' => 'Gradient descent explained', 'body' => 'Downhill steps.']);
        $this->article(['title' => 'Unrelated', 'body' => 'Nothing to see.']);

        $this->get(route('blog.index', ['search' => 'gradient']))
            ->assertOk()
            ->assertSee('Gradient descent explained')
            ->assertDontSee('Unrelated');
    }

    public function test_only_staff_can_author_posts(): void
    {
        $this->actingAs(User::factory()->create())->get(route('admin.posts.index'))->assertForbidden();
        $this->actingAs(User::factory()->admin()->create())->get(route('admin.posts.index'))->assertOk();
    }

    public function test_an_admin_can_write_and_publish_a_post(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post(route('admin.posts.store'), [
                'title' => 'Our first write-up',
                'body' => 'Body text here.',
                'status' => 'published',
                'tags' => ['launch'],
            ])
            ->assertSessionHasNoErrors();

        $post = Post::firstOrFail();

        $this->assertSame('our-first-write-up', $post->slug);
        $this->assertNotNull($post->published_at, 'Publishing without a date should mean now.');
        $this->assertTrue($post->isLive());

        $this->get(route('blog.show', $post->slug))->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'post.created']);
    }

    public function test_duplicate_titles_get_distinct_slugs(): void
    {
        $admin = User::factory()->admin()->create();
        $payload = ['title' => 'Same Title', 'body' => 'Body.', 'status' => 'draft'];

        $this->actingAs($admin)->post(route('admin.posts.store'), $payload)->assertSessionHasNoErrors();
        $this->actingAs($admin)->post(route('admin.posts.store'), $payload)->assertSessionHasNoErrors();

        $this->assertSame(2, Post::count());
        $this->assertSame(2, Post::pluck('slug')->unique()->count());
    }

    public function test_a_published_posts_url_does_not_change_when_retitled(): void
    {
        $post = $this->article(['title' => 'Original title', 'slug' => 'original-title']);

        $this->actingAs(User::factory()->admin()->create())
            ->patch(route('admin.posts.update', $post), [
                'title' => 'Completely different title',
                'body' => $post->body,
                'status' => 'published',
            ])
            ->assertSessionHasNoErrors();

        // Changing the slug would break every existing link to the article.
        $this->assertSame('original-title', $post->refresh()->slug);
    }

    public function test_unpublishing_removes_a_post_from_the_public_blog(): void
    {
        $post = $this->article(['title' => 'Retracted piece']);

        $this->actingAs(User::factory()->admin()->create())
            ->patch(route('admin.posts.update', $post), [
                'title' => $post->title,
                'body' => $post->body,
                'status' => 'draft',
            ]);

        $this->assertNull($post->refresh()->published_at);
        $this->get(route('blog.index'))->assertDontSee('Retracted piece');
        $this->get(route('blog.show', $post->slug))->assertNotFound();
    }
}
