<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ContentBlock;
use App\Services\ContentBlocks;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Website CMS (Plan §10.3). Each editable section is declared in
 * ContentBlocks::schema(), so the editor renders typed fields rather than
 * asking a non-engineer to hand-write JSON.
 */
class ContentBlockController extends Controller
{
    public function index(): Response
    {
        $stored = ContentBlock::all()->keyBy('section_key');

        $sections = collect(ContentBlocks::schema())
            ->map(function (array $definition, string $key) use ($stored) {
                $block = $stored->get($key);

                return [
                    'key' => $key,
                    'page' => $definition['page'],
                    'label' => $definition['label'],
                    'fields' => $definition['fields'] ?? null,
                    'repeat' => $definition['repeat'] ?? null,
                    'content' => array_merge($definition['defaults'], $block?->content ?? []),
                    'is_published' => $block?->is_published ?? true,
                    'is_customised' => $block !== null,
                    'updated_at' => $block?->updated_at?->toIso8601String(),
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Admin/Content/Index', [
            'sections' => $sections,
            'pages' => collect(ContentBlocks::schema())->pluck('page')->unique()->values()->all(),
        ]);
    }

    public function update(Request $request, string $sectionKey): RedirectResponse
    {
        $definition = ContentBlocks::schema()[$sectionKey] ?? abort(404);

        $validated = $request->validate([
            'content' => ['required', 'array'],
            'is_published' => ['required', 'boolean'],
        ]);

        // Only keys the section declares are stored, so the editor cannot
        // smuggle arbitrary structure into a page's props.
        $content = $this->sanitise($definition, $validated['content']);

        $block = ContentBlock::updateOrCreate(
            ['section_key' => $sectionKey],
            [
                'page' => $definition['page'],
                'content' => $content,
                'is_published' => $validated['is_published'],
            ],
        );

        ContentBlocks::forget();

        AuditLog::record('content_block.updated', 'content_block', $block->id, [
            'section' => $sectionKey,
            'published' => $block->is_published,
        ], $request->user()->id);

        return back()->with('success', "\"{$definition['label']}\" saved.");
    }

    /** Drop the override and go back to the copy the site ships with. */
    public function destroy(Request $request, string $sectionKey): RedirectResponse
    {
        $definition = ContentBlocks::schema()[$sectionKey] ?? abort(404);

        ContentBlock::where('section_key', $sectionKey)->delete();
        ContentBlocks::forget();

        AuditLog::record('content_block.reset', 'content_block', null, [
            'section' => $sectionKey,
        ], $request->user()->id);

        return back()->with('info', "\"{$definition['label']}\" reset to the default copy.");
    }

    /**
     * @param  array<string, mixed>  $definition
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    private function sanitise(array $definition, array $input): array
    {
        if (isset($definition['repeat'])) {
            $keys = array_keys($definition['repeat']);

            $items = collect($input['items'] ?? [])
                ->map(fn ($item) => collect($keys)
                    ->mapWithKeys(fn ($key) => [$key => (string) ($item[$key] ?? '')])
                    ->all())
                ->filter(fn ($item) => collect($item)->filter()->isNotEmpty())
                ->values()
                ->all();

            return ['items' => $items];
        }

        return collect($definition['fields'] ?? [])
            ->mapWithKeys(fn ($_, $key) => [$key => (string) ($input[$key] ?? '')])
            ->all();
    }
}
