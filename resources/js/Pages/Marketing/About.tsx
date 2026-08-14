import { Head } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Compass, Hammer, Rocket, ShieldCheck, Sparkles, Users } from 'lucide-react';
import MarketingLayout from '@/Layouts/MarketingLayout';

const values = [
    {
        icon: Hammer,
        title: 'Build, don’t just watch',
        body: 'Every course ends in something you made. Passive video is the starting point, never the destination.',
    },
    {
        icon: Compass,
        title: 'Structure over scattershot',
        body: 'Curated paths from first principles to portfolio project, so learners always know what comes next.',
    },
    {
        icon: ShieldCheck,
        title: 'Safe by default',
        body: 'A large share of our learners are under 18. Data protection and content access control are built in, not bolted on.',
    },
    {
        icon: Sparkles,
        title: 'AI as a companion',
        body: 'AI tutors, quiz generation, and study plans assist learning — they never replace instructor judgement.',
    },
];

const roadmap = [
    { phase: 'Phase 1', title: 'Launch', body: 'Marketing site, auth, the first course, secure video delivery, and certificates.' },
    { phase: 'Phase 2', title: 'Community', body: 'Forums, profiles, project showcase, gamification, and the blog.' },
    { phase: 'Phase 3', title: 'AI Learning', body: 'AI tutor, quiz generation, personalised paths, and code review.' },
    { phase: 'Phase 4', title: 'Ecosystem', body: 'Multi-instructor marketplace, live at scale, mobile apps, and org dashboards.' },
];

interface AboutContent {
    intro: { title: string; highlight: string; subtitle: string };
}

export default function About({ content }: { content: AboutContent }) {
    return (
        <MarketingLayout>
            <Head title="About — Gmora STEM" />

            <section className="pt-28 md:pt-36 pb-16 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800">
                <div className="container-wide max-w-3xl text-center">
                    <h1 className="text-3xl md:text-5xl font-semibold text-surface-900 dark:text-white mb-5">
                        {content.intro.title}{' '}
                        <span className="text-primary-600 dark:text-primary-400">{content.intro.highlight}</span>
                    </h1>
                    <p className="text-lg text-surface-500 dark:text-surface-400 leading-relaxed">
                        {content.intro.subtitle}
                    </p>
                </div>
            </section>

            <section className="section">
                <div className="container-wide grid md:grid-cols-2 gap-6 max-w-5xl">
                    <div className="card p-7">
                        <Rocket className="w-8 h-8 text-primary-500 mb-4" />
                        <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">
                            Our mission
                        </h2>
                        <p className="text-surface-500 leading-relaxed">
                            Deliver project-based STEM learning that goes beyond passive video, blending recorded
                            lessons and live classes in one unified model, and sending learners away with proof of
                            competence rather than a watch history.
                        </p>
                    </div>

                    <div className="card p-7">
                        <Users className="w-8 h-8 text-accent-500 mb-4" />
                        <h2 className="text-xl font-semibold text-surface-900 dark:text-white mb-2">
                            Who we build for
                        </h2>
                        <p className="text-surface-500 leading-relaxed">
                            Secondary and early-university students exploring AI, robotics, and programming — plus
                            self-taught adults and career-switchers who want structured, certificate-backed
                            upskilling.
                        </p>
                    </div>
                </div>
            </section>

            <section className="section pt-0">
                <div className="container-wide max-w-5xl">
                    <h2 className="text-2xl font-semibold text-surface-900 dark:text-white text-center mb-10">
                        What we value
                    </h2>

                    <div className="grid sm:grid-cols-2 gap-6">
                        {values.map((value, i) => (
                            <motion.div
                                key={value.title}
                                initial={{ opacity: 0, y: 15 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08 }}
                                className="card p-6"
                            >
                                <value.icon className="w-6 h-6 text-primary-500 mb-3" />
                                <h3 className="font-semibold text-surface-900 dark:text-white mb-1.5">
                                    {value.title}
                                </h3>
                                <p className="text-sm text-surface-500 leading-relaxed">{value.body}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section pt-0">
                <div className="container-wide max-w-3xl">
                    <h2 className="text-2xl font-semibold text-surface-900 dark:text-white text-center mb-10">
                        Where we're heading
                    </h2>

                    <ol className="relative border-l border-surface-200 dark:border-surface-700 ml-3 space-y-8">
                        {roadmap.map((step) => (
                            <li key={step.phase} className="pl-6">
                                <span className="absolute -left-[7px] w-3.5 h-3.5 rounded-full bg-primary-500 ring-4 ring-surface-50 dark:ring-surface-950" />
                                <div className="text-xs font-semibold uppercase tracking-wider text-primary-500 mb-1">
                                    {step.phase}
                                </div>
                                <h3 className="font-semibold text-surface-900 dark:text-white">{step.title}</h3>
                                <p className="text-sm text-surface-500 mt-1 leading-relaxed">{step.body}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>
        </MarketingLayout>
    );
}
