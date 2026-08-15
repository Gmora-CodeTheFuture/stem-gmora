import { Head, Link } from '@inertiajs/react';
import MarketingLayout from '@/Layouts/MarketingLayout';
import { motion } from 'framer-motion';
import {
    Award, BookOpen, Users, ArrowRight, Check, Sparkles,
    FlaskConical, Cpu, Wrench, Sigma, PlayCircle, Mail, MapPin,
} from 'lucide-react';

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' },
    }),
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

interface HomeContent {
    hero: { badge: string; title: string; highlight: string; subtitle: string; primary_cta: string; secondary_cta: string };
    stem: { title: string; body: string; science: string; technology: string; engineering: string; maths: string };
    vision: { title: string; body: string; point_one: string; point_two: string; point_three: string };
    contact: { email: string; support_email: string; location: string };
    cta: { title: string; subtitle: string; button: string };
}

interface Props {
    content: HomeContent;
    figures: { courses: number; lessons: number; learners: number; certificates: number };
}

export default function Welcome({ content, figures }: Props) {
    // Every figure is counted from the database, so an empty platform says so
    // rather than claiming numbers it does not have.
    const stats = [
        { value: figures.courses, label: figures.courses === 1 ? 'Course' : 'Courses', icon: BookOpen },
        { value: figures.lessons, label: figures.lessons === 1 ? 'Lesson' : 'Lessons', icon: PlayCircle },
        { value: figures.learners, label: figures.learners === 1 ? 'Learner' : 'Learners', icon: Users },
        { value: figures.certificates, label: 'Certificates issued', icon: Award },
    ];

    const disciplines = [
        { letter: 'S', name: 'Science', body: content.stem.science, icon: FlaskConical },
        { letter: 'T', name: 'Technology', body: content.stem.technology, icon: Cpu },
        { letter: 'E', name: 'Engineering', body: content.stem.engineering, icon: Wrench },
        { letter: 'M', name: 'Mathematics', body: content.stem.maths, icon: Sigma },
    ];

    const commitments = [content.vision.point_one, content.vision.point_two, content.vision.point_three];

    return (
        <MarketingLayout nav>
            <Head title="Gmora STEM — learn science, technology, engineering and maths" />

            {/* ── Hero ──────────────────────────────────────────── */}
            <section className="pt-24 pb-20 bg-white dark:bg-surface-950">
                <div className="max-w-[1440px] mx-auto px-6">
                    <div className="max-w-3xl mx-auto text-center">
                        <motion.span
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-100 dark:bg-surface-900 text-xs font-bold tracking-wide uppercase text-surface-700 dark:text-surface-300"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-[#1E3A8A]" />
                            {content.hero.badge}
                        </motion.span>

                        <motion.h1
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-5xl md:text-6xl font-bold tracking-tight text-surface-900 dark:text-white mt-8 text-balance"
                        >
                            {content.hero.title}{' '}
                            <span className="text-[#1E3A8A] dark:text-primary-400">{content.hero.highlight}</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg text-surface-600 dark:text-surface-400 mt-6 leading-relaxed"
                        >
                            {content.hero.subtitle}
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-wrap items-center justify-center gap-3 mt-10"
                        >
                            <Link
                                href="/register"
                                className="px-7 py-3 rounded-full bg-surface-900 dark:bg-white text-white dark:text-surface-900 font-bold hover:opacity-90 transition-opacity"
                            >
                                {content.hero.primary_cta}
                            </Link>
                            <Link
                                href="/courses"
                                className="px-7 py-3 rounded-full border border-surface-300 dark:border-surface-700 font-bold text-surface-900 dark:text-white hover:bg-surface-50 dark:hover:bg-surface-900 transition-colors"
                            >
                                {content.hero.secondary_cta}
                            </Link>
                        </motion.div>

                        <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-surface-500 text-sm font-medium">
                            <span className="flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-surface-900 dark:text-surface-300" /> Free courses stay free
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-surface-900 dark:text-surface-300" /> Verifiable certificates
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-surface-900 dark:text-surface-300" /> Project-based from day one
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Figures ───────────────────────────────────────── */}
            <section className="bg-surface-50 dark:bg-surface-900 border-y border-surface-200 dark:border-surface-800 py-12">
                <div className="max-w-[1440px] mx-auto px-6">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-50px' }}
                        variants={stagger}
                        className="grid grid-cols-2 md:grid-cols-4 gap-8"
                    >
                        {stats.map((stat, i) => (
                            <motion.div key={stat.label} custom={i} variants={fadeInUp} className="text-center">
                                <stat.icon className="w-6 h-6 text-[#1E3A8A] mx-auto mb-3" />
                                <div className="text-3xl font-bold text-surface-900 dark:text-white mb-1 tabular-nums">
                                    {stat.value}
                                </div>
                                <div className="text-xs font-bold text-surface-500 uppercase tracking-widest">
                                    {stat.label}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── What STEM is ──────────────────────────────────── */}
            <section id="stem" className="py-20 bg-white dark:bg-surface-950 scroll-mt-16">
                <div className="max-w-[1440px] mx-auto px-6">
                    <div className="max-w-3xl">
                        <h2 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-white mb-5 text-balance">
                            {content.stem.title}
                        </h2>
                        <p className="text-lg text-surface-600 dark:text-surface-400 leading-relaxed">
                            {content.stem.body}
                        </p>
                    </div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-50px' }}
                        variants={stagger}
                        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12"
                    >
                        {disciplines.map((d, i) => (
                            <motion.div
                                key={d.name}
                                custom={i}
                                variants={fadeInUp}
                                className="p-7 rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-950"
                            >
                                <div className="flex items-baseline gap-3 mb-4">
                                    <span className="text-4xl font-bold text-[#1E3A8A] dark:text-primary-400 leading-none">
                                        {d.letter}
                                    </span>
                                    <d.icon className="w-5 h-5 text-surface-400" />
                                </div>
                                <h3 className="text-base font-bold text-surface-900 dark:text-white mb-2">{d.name}</h3>
                                <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">{d.body}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── Vision ────────────────────────────────────────── */}
            <section
                id="vision"
                className="py-20 bg-surface-50 dark:bg-surface-900 border-y border-surface-200 dark:border-surface-800 scroll-mt-16"
            >
                <div className="max-w-[1440px] mx-auto px-6 grid lg:grid-cols-2 gap-14 items-start">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-white mb-5 text-balance">
                            {content.vision.title}
                        </h2>
                        <p className="text-lg text-surface-600 dark:text-surface-400 leading-relaxed">
                            {content.vision.body}
                        </p>
                    </div>

                    <ul className="space-y-5">
                        {commitments.map((point, i) => (
                            <li
                                key={i}
                                className="flex gap-4 p-6 rounded-2xl bg-white dark:bg-surface-950 border border-surface-200 dark:border-surface-800"
                            >
                                <span className="w-8 h-8 shrink-0 rounded-full bg-[#1E3A8A] text-white text-sm font-bold flex items-center justify-center tabular-nums">
                                    {i + 1}
                                </span>
                                <p className="text-surface-700 dark:text-surface-300 leading-relaxed">{point}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* ── Closing ───────────────────────────────────────── */}
            <section className="py-24 bg-white dark:bg-surface-950">
                <div className="max-w-[1440px] mx-auto px-6">
                    <div className="bg-surface-900 dark:bg-surface-800 rounded-3xl p-12 md:p-20 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2 blur-2xl" />

                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 text-balance">
                                {content.cta.title}
                            </h2>
                            <p className="text-surface-300 text-lg max-w-2xl mx-auto mb-10 font-medium">
                                {content.cta.subtitle}
                            </p>
                            <Link
                                href="/register"
                                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-surface-900 font-bold hover:bg-surface-100 transition-colors"
                            >
                                {content.cta.button}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 text-sm text-surface-500">
                        <a href={`mailto:${content.contact.email}`} className="flex items-center gap-2 hover:text-surface-900 dark:hover:text-white">
                            <Mail className="w-4 h-4" />
                            {content.contact.email}
                        </a>
                        <a href={`mailto:${content.contact.support_email}`} className="flex items-center gap-2 hover:text-surface-900 dark:hover:text-white">
                            <Mail className="w-4 h-4" />
                            {content.contact.support_email}
                        </a>
                        <span className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {content.contact.location}
                        </span>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
