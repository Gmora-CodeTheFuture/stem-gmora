<?php

namespace Tests\Feature;

use App\Models\ContentBlock;
use App\Models\User;
use App\Services\ContentBlocks;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContentBlockTest extends TestCase
{
    use RefreshDatabase;

    /** Public pages redirect signed-in users, so assert them as a visitor. */
    private function guest(): static
    {
        auth()->guard('web')->logout();
        app('auth')->forgetGuards();

        return $this;
    }

    public function test_pages_ship_with_default_copy_when_nothing_is_edited(): void
    {
        $home = ContentBlocks::forPage('home');

        $this->assertSame('STEM Education', $home['hero']['highlight']);
        $this->assertCount(4, $home['stats']['items']);

        $this->get(route('home'))->assertOk()->assertSee('STEM Education');
    }

    public function test_only_admins_can_open_the_editor(): void
    {
        $this->actingAs(User::factory()->create())->get(route('admin.content.index'))->assertForbidden();
        $this->actingAs(User::factory()->create())->get(route('admin.content.index'))->assertForbidden();
        $this->actingAs(User::factory()->admin()->create())->get(route('admin.content.index'))->assertOk();
    }

    public function test_an_admin_can_rewrite_the_home_hero(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->patch(route('admin.content.update', 'home.hero'), [
                'is_published' => true,
                'content' => [
                    'badge' => 'Enrolment open',
                    'title' => 'Build things that',
                    'highlight' => 'actually work',
                    'subtitle' => 'Project-driven STEM for curious people.',
                    'primary_cta' => 'Join now',
                    'secondary_cta' => 'See courses',
                ],
            ])
            ->assertSessionHasNoErrors();

        $this->guest()
            ->get(route('home'))
            ->assertOk()
            ->assertSee('actually work')
            ->assertSee('Project-driven STEM for curious people.')
            ->assertDontSee('STEM Education');

        $this->assertDatabaseHas('audit_logs', ['action' => 'content_block.updated']);
    }

    public function test_a_repeatable_section_can_be_edited(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->patch(route('admin.content.update', 'home.stats'), [
                'is_published' => true,
                'content' => [
                    'items' => [
                        ['value' => '12', 'label' => 'Real students'],
                        ['value' => '3', 'label' => 'Live courses'],
                        // Blank rows are dropped rather than rendered empty.
                        ['value' => '', 'label' => ''],
                    ],
                ],
            ])
            ->assertSessionHasNoErrors();

        $stats = ContentBlocks::forPage('home')['stats']['items'];

        $this->assertCount(2, $stats);
        $this->assertSame('Real students', $stats[0]['label']);

        $this->guest()->get(route('home'))->assertOk()->assertSee('Real students');
    }

    public function test_hiding_a_section_falls_back_to_the_default_copy(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->patch(route('admin.content.update', 'home.hero'), [
            'is_published' => false,
            'content' => ['badge' => 'Hidden badge', 'title' => 'Hidden', 'highlight' => 'Hidden highlight',
                'subtitle' => 'Hidden subtitle', 'primary_cta' => 'x', 'secondary_cta' => 'y'],
        ]);

        // A page must never render blank because someone unpublished a block.
        $this->guest()->get(route('home'))->assertOk()->assertSee('STEM Education')->assertDontSee('Hidden highlight');
    }

    public function test_resetting_restores_the_shipped_copy(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->patch(route('admin.content.update', 'home.cta'), [
            'is_published' => true,
            'content' => ['title' => 'Custom closing line', 'subtitle' => 'Custom', 'button' => 'Go'],
        ]);

        $this->guest()->get(route('home'))->assertSee('Custom closing line');

        $this->actingAs($admin)->delete(route('admin.content.destroy', 'home.cta'))->assertSessionHasNoErrors();

        $this->assertSame(0, ContentBlock::where('section_key', 'home.cta')->count());
        $this->guest()->get(route('home'))->assertSee('Ready to Start Your STEM Journey?');
    }

    public function test_unknown_sections_are_rejected(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->patch(route('admin.content.update', 'home.not-a-section'), [
                'is_published' => true,
                'content' => ['anything' => 'here'],
            ])
            ->assertNotFound();
    }

    public function test_only_declared_fields_are_stored(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->patch(route('admin.content.update', 'home.contact'), [
                'is_published' => true,
                'content' => [
                    'email' => 'hi@example.com',
                    'support_email' => 'help@example.com',
                    'location' => 'Kandy',
                    'sneaky_extra' => 'should not persist',
                ],
            ]);

        $stored = ContentBlock::where('section_key', 'home.contact')->firstOrFail()->content;

        $this->assertArrayNotHasKey('sneaky_extra', $stored);
        $this->assertSame('Kandy', $stored['location']);

        // Contact details render on the homepage now that the standalone page is gone.
        $this->guest()->get(route('home'))->assertOk()->assertSee('hi@example.com');
    }
}
