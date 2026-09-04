import { Head } from '@inertiajs/react';
import MarketingLayout from '@/Layouts/MarketingLayout';

interface Props {
    title: string;
    updated: string;
    sections: Array<{ heading: string; body: string }>;
}

export default function Legal({ title, updated, sections }: Props) {
    return (
        <MarketingLayout nav>
            <Head title={`${title} — Gmora STEM`} />

            <article className="max-w-3xl mx-auto px-6 py-16 md:py-24">
                <p className="text-xs font-semibold uppercase tracking-widest text-surface-400 mb-3">
                    Last updated {updated}
                </p>
                <h1 className="text-3xl md:text-4xl font-semibold text-surface-900 dark:text-white mb-10">{title}</h1>

                <div className="space-y-10">
                    {sections.map((section) => (
                        <section key={section.heading}>
                            <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-3">{section.heading}</h2>
                            <p className="text-surface-600 dark:text-surface-300 leading-relaxed whitespace-pre-line">{section.body}</p>
                        </section>
                    ))}
                </div>
            </article>
        </MarketingLayout>
    );
}
