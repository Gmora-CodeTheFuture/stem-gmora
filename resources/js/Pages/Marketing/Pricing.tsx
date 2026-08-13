import { Head, Link } from '@inertiajs/react';
import { Check, Minus } from 'lucide-react';
import MarketingLayout from '@/Layouts/MarketingLayout';

const tiers = [
    {
        name: 'Explorer',
        price: 'Free',
        cadence: '',
        summary: 'Start learning with free courses and preview lessons.',
        features: [
            'Free courses in full',
            'Preview lessons on paid courses',
            'Progress tracking',
            'Community access (Phase 2)',
        ],
        missing: ['Verified certificates', 'Live labs', 'AI tutor'],
        cta: 'Create an account',
        href: '/register',
        featured: false,
    },
    {
        name: 'Learner',
        price: 'Per course',
        cadence: 'one-time',
        summary: 'Buy a course once and keep it — including every future update.',
        features: [
            'Lifetime access to the course',
            'Live labs with the instructor',
            'Assignments with instructor feedback',
            'Verified, shareable certificate',
        ],
        missing: ['AI tutor across the catalog'],
        cta: 'Browse courses',
        href: '/courses',
        featured: true,
    },
    {
        name: 'Schools',
        price: 'Custom',
        cadence: 'per cohort',
        summary: 'For schools and STEM clubs managing a group of learners.',
        features: [
            'Everything in Learner',
            'Cohort dashboard and reporting',
            'Bulk seat management',
            'Priority instructor support',
        ],
        missing: [],
        cta: 'Talk to us',
        href: '/contact',
        featured: false,
    },
];

export default function Pricing() {
    return (
        <MarketingLayout>
            <Head title="Pricing — Gmora STEM" />

            <section className="pt-28 md:pt-36 pb-14 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800">
                <div className="container-wide text-center max-w-2xl">
                    <h1 className="text-3xl md:text-5xl font-semibold text-surface-900 dark:text-white mb-4">
                        Simple, <span className="text-primary-600 dark:text-primary-400">honest pricing</span>
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400">
                        Pay per course, keep it for life. Regional pricing is applied automatically at checkout.
                    </p>
                </div>
            </section>

            <section className="section pt-12">
                <div className="container-wide grid md:grid-cols-3 gap-6 items-start max-w-5xl">
                    {tiers.map((tier) => (
                        <div
                            key={tier.name}
                            className={`card p-7 h-full flex flex-col ${
                                tier.featured ? 'ring-2 ring-primary-500 md:-mt-4 md:pb-11' : ''
                            }`}
                        >
                            {tier.featured && (
                                <span className="badge-primary self-start mb-3">Most popular</span>
                            )}

                            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                                {tier.name}
                            </h2>
                            <div className="mt-2 mb-1">
                                <span className="text-3xl font-semibold text-surface-900 dark:text-white">
                                    {tier.price}
                                </span>
                                {tier.cadence && (
                                    <span className="text-sm text-surface-500 ml-1.5">{tier.cadence}</span>
                                )}
                            </div>
                            <p className="text-sm text-surface-500 leading-relaxed mb-6">{tier.summary}</p>

                            <ul className="space-y-2.5 text-sm mb-7">
                                {tier.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2 text-surface-700 dark:text-surface-200">
                                        <Check className="w-4 h-4 mt-0.5 text-accent-500 shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                                {tier.missing.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2 text-surface-400">
                                        <Minus className="w-4 h-4 mt-0.5 shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={tier.href}
                                className={`${tier.featured ? 'btn-primary' : 'btn-secondary'} w-full mt-auto`}
                            >
                                {tier.cta}
                            </Link>
                        </div>
                    ))}
                </div>

                <p className="text-center text-sm text-surface-500 mt-10">
                    Subscriptions covering the full catalog arrive with Phase 3.
                </p>
            </section>
        </MarketingLayout>
    );
}
