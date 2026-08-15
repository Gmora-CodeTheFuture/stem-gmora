<?php

namespace App\Services;

use App\Models\ContentBlock;
use Illuminate\Support\Facades\Cache;

/**
 * The marketing CMS (Plan §10.3).
 *
 * Copy that used to be hardcoded in React now comes from `content_blocks`, so
 * a non-engineer can change it. Every section declares a schema, which gives
 * the editor typed fields instead of a raw JSON textarea, and gives the page a
 * defined shape to fall back on when a block has never been edited.
 */
class ContentBlocks
{
    public const CACHE_KEY = 'content-blocks';

    /**
     * Editable sections, their fields, and the copy the site ships with.
     *
     * `fields` are single values; `repeat` describes a list of items, each
     * built from the named sub-fields.
     *
     * @return array<string, array<string, mixed>>
     */
    public static function schema(): array
    {
        return [
            'home.hero' => [
                'page' => 'home',
                'label' => 'Home — hero',
                'fields' => [
                    'badge' => ['label' => 'Badge', 'type' => 'text'],
                    'title' => ['label' => 'Heading', 'type' => 'text'],
                    'highlight' => ['label' => 'Highlighted words', 'type' => 'text'],
                    'subtitle' => ['label' => 'Subtitle', 'type' => 'textarea'],
                    'primary_cta' => ['label' => 'Primary button', 'type' => 'text'],
                    'secondary_cta' => ['label' => 'Secondary button', 'type' => 'text'],
                ],
                'defaults' => [
                    'badge' => 'Now with AI-Powered Learning',
                    'title' => 'Master the Future with',
                    'highlight' => 'STEM Education',
                    'subtitle' => 'From AI fundamentals to robotics and cybersecurity — learn from expert instructors, earn verified certificates, and join a global community of innovators.',
                    'primary_cta' => 'Start Learning for Free',
                    'secondary_cta' => 'Browse Courses',
                ],
            ],

            'home.stats' => [
                'page' => 'home',
                'label' => 'Home — statistics strip',
                'repeat' => [
                    'value' => ['label' => 'Value', 'type' => 'text'],
                    'label' => ['label' => 'Label', 'type' => 'text'],
                ],
                'defaults' => [
                    'items' => [
                        ['value' => '2,500+', 'label' => 'Active Students'],
                        ['value' => '50+', 'label' => 'Expert Courses'],
                        ['value' => '1,200+', 'label' => 'Certificates Issued'],
                        ['value' => '15+', 'label' => 'Countries'],
                    ],
                ],
            ],

            'home.cta' => [
                'page' => 'home',
                'label' => 'Home — closing call to action',
                'fields' => [
                    'title' => ['label' => 'Heading', 'type' => 'text'],
                    'subtitle' => ['label' => 'Subtitle', 'type' => 'textarea'],
                    'button' => ['label' => 'Button', 'type' => 'text'],
                ],
                'defaults' => [
                    'title' => 'Ready to Start Your STEM Journey?',
                    'subtitle' => 'Join thousands of students mastering AI, robotics, programming, and more. Your first course is just a click away.',
                    'button' => 'Create Free Account',
                ],
            ],

            'home.stem' => [
                'page' => 'home',
                'label' => 'Home — what STEM is',
                'fields' => [
                    'title' => ['label' => 'Heading', 'type' => 'text'],
                    'body' => ['label' => 'Explanation', 'type' => 'textarea'],
                    'science' => ['label' => 'Science', 'type' => 'textarea'],
                    'technology' => ['label' => 'Technology', 'type' => 'textarea'],
                    'engineering' => ['label' => 'Engineering', 'type' => 'textarea'],
                    'maths' => ['label' => 'Mathematics', 'type' => 'textarea'],
                ],
                'defaults' => [
                    'title' => 'What STEM actually means',
                    'body' => 'STEM is Science, Technology, Engineering and Mathematics taught as one connected subject rather than four separate ones. A student does not learn physics on Monday and coding on Thursday and never join them up — they build something that needs both.',
                    'science' => 'Asking what is true, and designing an experiment that could prove you wrong.',
                    'technology' => 'Using the tools well, and understanding what is happening underneath them.',
                    'engineering' => 'Turning a constraint into a design, then building it and watching it fail usefully.',
                    'maths' => 'The language the other three are written in — the part that makes a result repeatable.',
                ],
            ],

            'home.vision' => [
                'page' => 'home',
                'label' => 'Home — our vision',
                'fields' => [
                    'title' => ['label' => 'Heading', 'type' => 'text'],
                    'body' => ['label' => 'Vision statement', 'type' => 'textarea'],
                    'point_one' => ['label' => 'First commitment', 'type' => 'textarea'],
                    'point_two' => ['label' => 'Second commitment', 'type' => 'textarea'],
                    'point_three' => ['label' => 'Third commitment', 'type' => 'textarea'],
                ],
                'defaults' => [
                    'title' => 'Our vision',
                    'body' => 'A student in Sri Lanka should be able to learn robotics, machine learning or cybersecurity to the same standard as a student anywhere else — without needing a university lab, an expensive device, or a family who already knows the field.',
                    'point_one' => 'Build things, not just watch things. Every course ends in something the student made and can show to someone.',
                    'point_two' => 'Teach in the open. Course material is versioned, reviewed before it is published, and corrected when it is wrong.',
                    'point_three' => 'Keep the door low. Free courses stay genuinely free, and a certificate is verifiable by anyone who is handed one.',
                ],
            ],

            'home.contact' => [
                'page' => 'home',
                'label' => 'Home — how to reach us',
                'fields' => [
                    'email' => ['label' => 'General email', 'type' => 'text'],
                    'support_email' => ['label' => 'Support email', 'type' => 'text'],
                    'location' => ['label' => 'Location', 'type' => 'text'],
                ],
                'defaults' => [
                    'email' => 'hello@gmorastem.com',
                    'support_email' => 'support@gmorastem.com',
                    'location' => 'Colombo, Sri Lanka',
                ],
            ],
        ];
    }

    /**
     * Published copy for a page, section key => content, with defaults filled
     * in for anything never edited or currently unpublished.
     *
     * @return array<string, array<string, mixed>>
     */
    public static function forPage(string $page): array
    {
        $stored = Cache::remember(
            self::CACHE_KEY.":{$page}",
            now()->addHour(),
            fn () => ContentBlock::where('page', $page)
                ->where('is_published', true)
                ->orderBy('order_index')
                ->pluck('content', 'section_key')
                ->all(),
        );

        $out = [];

        foreach (self::schema() as $key => $definition) {
            if (($definition['page'] ?? null) !== $page) {
                continue;
            }

            $section = str($key)->after('.')->toString();
            $out[$section] = array_merge($definition['defaults'], $stored[$key] ?? []);
        }

        return $out;
    }

    public static function forget(): void
    {
        foreach (collect(self::schema())->pluck('page')->unique() as $page) {
            Cache::forget(self::CACHE_KEY.":{$page}");
        }
    }
}
