import { Head, Link } from '@inertiajs/react';
import MarketingLayout from '@/Layouts/MarketingLayout';
import { motion } from 'framer-motion';
import {
    Cpu, Rocket, Brain, Shield, Code, Zap, Award,
    BookOpen, Users, ArrowRight, Play, Check, Sparkles,
    GraduationCap, Clock, BarChart3, Globe
} from 'lucide-react';

const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    }),
};

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
};

export default function Welcome() {
    const stats = [
        { label: 'Active Students', value: '2,500+', icon: Users },
        { label: 'Expert Courses', value: '50+', icon: BookOpen },
        { label: 'Certificates Issued', value: '1,200+', icon: Award },
        { label: 'Countries', value: '15+', icon: Globe },
    ];

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
            <section className="relative bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800">
                <div className="relative container-wide py-24 md:py-32">
                    <div className="max-w-4xl mx-auto text-center">
                        {/* Badge */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 text-sm font-medium mb-8">
                                <Sparkles className="w-4 h-4" />
                                Now with AI-Powered Learning
                            </span>
                        </motion.div>

                        {/* Heading */}
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="text-4xl md:text-5xl lg:text-6xl font-semibold text-surface-900 dark:text-white leading-[1.1] mb-6"
                        >
                            Master the Future with{' '}
                            <span className="text-primary-600 dark:text-primary-400">STEM Education</span>
                        </motion.h1>

                        {/* Subtitle */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-lg text-surface-500 dark:text-surface-400 max-w-2xl mx-auto mb-10 leading-relaxed"
                        >
                            From AI fundamentals to robotics and cybersecurity — learn from expert instructors,
                            earn verified certificates, and join a global community of innovators.
                        </motion.p>

                        {/* CTAs */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="flex flex-col sm:flex-row items-center justify-center gap-4"
                        >
                            <Link href="/register" className="btn-primary px-6 py-3">
                                <Rocket className="w-5 h-5" />
                                Start Learning for Free
                            </Link>
                            <Link href="/courses" className="btn-secondary px-6 py-3">
                                <BookOpen className="w-5 h-5" />
                                Browse Courses
                            </Link>
                        </motion.div>

                        {/* Trust indicators */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                            className="flex flex-wrap items-center justify-center gap-6 mt-10 text-surface-500 text-sm"
                        >
                            <span className="flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-accent-500" /> No credit card required
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-accent-500" /> Free preview lessons
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-accent-500" /> Certificate on completion
                            </span>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── Stats Bar ─────────────────────────────────────── */}
            <section className="relative z-10 py-12 md:py-16">
                <div className="container-wide">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-50px' }}
                        variants={staggerContainer}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
                    >
                        {stats.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                custom={i}
                                variants={fadeInUp}
                                className="card p-5 md:p-6 text-center"
                            >
                                <stat.icon className="w-6 h-6 text-primary-500 mx-auto mb-2" />
                                <div className="text-2xl md:text-3xl font-semibold text-surface-900 dark:text-white">
                                    {stat.value}
                                </div>
                                <div className="text-sm text-surface-500 mt-1">{stat.label}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── Categories ────────────────────────────────────── */}
            <section className="section">
                <div className="container-wide">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-80px' }}
                        variants={staggerContainer}
                        className="text-center mb-12 md:mb-16"
                    >
                        <motion.h2 variants={fadeInUp} custom={0} className="text-3xl md:text-4xl font-semibold text-surface-900 dark:text-white mb-4">
                            Explore STEM Categories
                        </motion.h2>
                        <motion.p variants={fadeInUp} custom={1} className="text-surface-500 dark:text-surface-400 max-w-2xl mx-auto text-lg">
                            Dive into cutting-edge disciplines designed for the innovators of tomorrow
                        </motion.p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-50px' }}
                        variants={staggerContainer}
                        className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
                    >
                        {categories.map((cat, i) => (
                            <motion.div key={cat.name} custom={i} variants={fadeInUp}>
                                <Link href="/courses" className="card-interactive p-6 md:p-8 flex flex-col items-center text-center group">
                                    <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950 flex items-center justify-center mb-4">
                                        <cat.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    <h3 className="text-base md:text-lg font-semibold text-surface-900 dark:text-white mb-1">{cat.name}</h3>
                                    <p className="text-sm text-surface-500">{cat.count} courses</p>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── Features ──────────────────────────────────────── */}
            <section className="section bg-surface-100/50 dark:bg-surface-900/50">
                <div className="container-wide">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-80px' }}
                        variants={staggerContainer}
                        className="text-center mb-12 md:mb-16"
                    >
                        <motion.h2 variants={fadeInUp} custom={0} className="text-3xl md:text-4xl font-semibold text-surface-900 dark:text-white mb-4">
                            Everything You Need to Succeed
                        </motion.h2>
                        <motion.p variants={fadeInUp} custom={1} className="text-surface-500 dark:text-surface-400 max-w-2xl mx-auto text-lg">
                            A complete learning ecosystem built for serious STEM students
                        </motion.p>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-50px' }}
                        variants={staggerContainer}
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {features.map((feature, i) => (
                            <motion.div
                                key={feature.title}
                                custom={i}
                                variants={fadeInUp}
                                className="card p-6 md:p-8 group hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-300"
                            >
                                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center mb-5 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors duration-300">
                                    <feature.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">{feature.title}</h3>
                                <p className="text-surface-500 dark:text-surface-400 leading-relaxed text-sm">{feature.description}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── CTA Section ───────────────────────────────────── */}
            <section className="section">
                <div className="container-wide">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="relative overflow-hidden rounded-3xl bg-primary-600 p-12 md:p-16 text-center"
                    >

                        <div className="relative">
                            <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
                                Ready to Start Your STEM Journey?
                            </h2>
                            <p className="text-primary-100 text-lg max-w-2xl mx-auto mb-8">
                                Join thousands of students mastering AI, robotics, programming, and more.
                                Your first course is just a click away.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link
                                    href="/register"
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-primary-700 font-medium text-sm hover:bg-primary-50 transition-colors"
                                >
                                    <GraduationCap className="w-5 h-5" />
                                    Create Free Account
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        </MarketingLayout>
    );
}
