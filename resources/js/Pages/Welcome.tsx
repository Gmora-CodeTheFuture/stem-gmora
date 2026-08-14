import { Head, Link } from '@inertiajs/react';
import MarketingLayout from '@/Layouts/MarketingLayout';
import { motion } from 'framer-motion';
import {
    Cpu, Rocket, Brain, Shield, Code, Zap, Award,
    BookOpen, Users, ArrowRight, Play, Check, Sparkles,
    GraduationCap, Clock, BarChart3, Globe
} from 'lucide-react';

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
    }),
};

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
};

interface HomeContent {
    hero: { badge: string; title: string; highlight: string; subtitle: string; primary_cta: string; secondary_cta: string };
    stats: { items: Array<{ value: string; label: string }> };
    cta: { title: string; subtitle: string; button: string };
}

export default function Welcome({ content }: { content: HomeContent }) {
    // Copy is editable in the admin CMS; icons stay in code.
    const statIcons = [Users, BookOpen, Award, Globe];
    const stats = (content.stats?.items ?? []).map((item, i) => ({
        label: item.label,
        value: item.value,
        icon: statIcons[i % statIcons.length],
    }));

    const categories = [
        { name: 'Artificial Intelligence', icon: Brain, count: 12 },
        { name: 'Programming', icon: Code, count: 18 },
        { name: 'Robotics', icon: Cpu, count: 8 },
        { name: 'Cybersecurity', icon: Shield, count: 6 },
        { name: 'Data Science', icon: BarChart3, count: 10 },
        { name: 'Electronics', icon: Zap, count: 7 },
    ];

    const features = [
        {
            icon: BookOpen,
            title: 'Structured Learning Paths',
            description: 'Follow expertly designed curriculum paths from beginner to advanced, with hands-on projects at every stage.',
        },
        {
            icon: Play,
            title: 'HD Video Lessons',
            description: 'Learn from high-quality video content with secure streaming, progress tracking, and resume-from-where-you-left-off.',
        },
        {
            icon: Sparkles,
            title: 'AI Learning Companion',
            description: 'Get personalized help from our AI tutor — ask questions, generate practice quizzes, and receive adaptive study plans.',
        },
        {
            icon: Award,
            title: 'Verified Certificates',
            description: 'Earn industry-recognized certificates with QR verification. Share directly on LinkedIn to showcase your skills.',
        },
        {
            icon: Users,
            title: 'Community & Forums',
            description: 'Join a thriving community of learners. Discuss topics, share projects, and collaborate with peers worldwide.',
        },
        {
            icon: Clock,
            title: 'Live Classes & Mentoring',
            description: 'Attend scheduled live sessions with instructors via Zoom. Get real-time mentoring and Q&A support.',
        },
    ];

    return (
        <MarketingLayout>
            <Head title="Gmora STEM — Future-Ready STEM Education" />

            {/* ── Hero Section ──────────────────────────────────── */}
            <section className="relative bg-white dark:bg-surface-950 border-b border-surface-200 dark:border-surface-800">
                <div className="max-w-[1440px] mx-auto px-6 py-20 md:py-32">
                    <div className="max-w-4xl mx-auto text-center">
                        {/* Badge */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-100 dark:bg-surface-900 text-surface-900 dark:text-surface-100 text-xs font-bold uppercase tracking-wider mb-8 border border-surface-200 dark:border-surface-800">
                                <Sparkles className="w-3.5 h-3.5 text-[#1E3A8A]" />
                                Now with AI-Powered Learning
                            </span>
                        </motion.div>

                        {/* Heading */}
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-5xl md:text-6xl lg:text-7xl font-bold text-surface-900 dark:text-white leading-[1.05] tracking-tight mb-6"
                        >
                            Master the Future with <br className="hidden md:block"/>
                            <span className="text-[#1E3A8A]">STEM Education</span>
                        </motion.h1>

                        {/* Subtitle */}
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-lg text-surface-600 dark:text-surface-400 max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
                        >
                            {content.hero.subtitle}
                        </motion.p>

                        {/* CTAs */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="flex flex-col sm:flex-row items-center justify-center gap-4"
                        >
                            <Link href="/register" className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-surface-900 text-white font-bold hover:bg-surface-800 transition-colors">
                                <Rocket className="w-5 h-5" />
                                {content.hero.primary_cta}
                            </Link>
                            <Link href="/courses" className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-surface-900 font-bold border border-surface-300 hover:bg-surface-50 transition-colors">
                                <BookOpen className="w-5 h-5" />
                                {content.hero.secondary_cta}
                            </Link>
                        </motion.div>

                        {/* Trust indicators */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                            className="flex flex-wrap items-center justify-center gap-6 mt-12 text-surface-500 text-sm font-medium"
                        >
                            <span className="flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-surface-900 dark:text-surface-300" /> No credit card required
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-surface-900 dark:text-surface-300" /> Free preview lessons
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-surface-900 dark:text-surface-300" /> Certificate on completion
                            </span>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── Stats Bar ─────────────────────────────────────── */}
            <section className="bg-surface-50 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 py-12">
                <div className="max-w-[1440px] mx-auto px-6">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-50px' }}
                        variants={staggerContainer}
                        className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-surface-200 dark:divide-surface-800"
                    >
                        {stats.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                custom={i}
                                variants={fadeInUp}
                                className={`text-center ${i !== 0 ? 'pl-8' : ''}`}
                            >
                                <stat.icon className="w-6 h-6 text-[#1E3A8A] mx-auto mb-3" />
                                <div className="text-3xl font-bold text-surface-900 dark:text-white mb-1">
                                    {stat.value}
                                </div>
                                <div className="text-xs font-bold text-surface-500 uppercase tracking-widest">{stat.label}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── Categories ────────────────────────────────────── */}
            <section className="py-20 bg-white dark:bg-surface-950">
                <div className="max-w-[1440px] mx-auto px-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
                        <div>
                            <h2 className="text-3xl font-bold text-surface-900 dark:text-white mb-2">
                                Explore STEM Categories
                            </h2>
                            <p className="text-surface-600 dark:text-surface-400 font-medium">
                                Dive into cutting-edge disciplines designed for the innovators of tomorrow.
                            </p>
                        </div>
                        <Link href="/courses" className="hidden md:flex items-center gap-2 text-sm font-bold text-[#1E3A8A] hover:underline">
                            View all categories <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {categories.map((cat, i) => (
                            <Link key={cat.name} href="/courses" className="group p-6 rounded-2xl border border-surface-200 hover:border-surface-900 dark:border-surface-800 dark:hover:border-surface-400 transition-colors flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-900 flex items-center justify-center mb-4 group-hover:bg-surface-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-surface-900 transition-colors">
                                    <cat.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-bold text-surface-900 dark:text-white mb-1">{cat.name}</h3>
                                <p className="text-xs text-surface-500 font-medium">{cat.count} courses</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ──────────────────────────────────────── */}
            <section className="py-20 bg-surface-50 dark:bg-surface-900 border-y border-surface-200 dark:border-surface-800">
                <div className="max-w-[1440px] mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-surface-900 dark:text-white mb-4">
                            Everything You Need to Succeed
                        </h2>
                        <p className="text-surface-600 dark:text-surface-400 max-w-2xl mx-auto font-medium">
                            A complete learning ecosystem built for serious STEM students.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, i) => (
                            <div key={feature.title} className="p-8 bg-white dark:bg-surface-950 rounded-2xl border border-surface-200 dark:border-surface-800 hover:shadow-lg transition-shadow">
                                <div className="w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-900 flex items-center justify-center mb-6">
                                    <feature.icon className="w-6 h-6 text-surface-900 dark:text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-surface-900 dark:text-white mb-3">{feature.title}</h3>
                                <p className="text-surface-600 dark:text-surface-400 font-medium leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA Section ───────────────────────────────────── */}
            <section className="py-24 bg-white dark:bg-surface-950">
                <div className="max-w-[1440px] mx-auto px-6">
                    <div className="bg-surface-900 dark:bg-surface-800 rounded-3xl p-12 md:p-20 text-center relative overflow-hidden">
                        
                        {/* Decorative circles to keep it Kaggle-esque but interesting */}
                        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl"></div>
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2 blur-2xl"></div>

                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                                {content.cta.title}
                            </h2>
                            <p className="text-surface-300 text-lg max-w-2xl mx-auto mb-10 font-medium">
                                {content.cta.subtitle}
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link
                                    href="/register"
                                    className="flex items-center gap-2 px-8 py-4 rounded-full bg-white text-surface-900 font-bold hover:bg-surface-100 transition-colors"
                                >
                                    <GraduationCap className="w-5 h-5" />
                                    {content.cta.button}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
