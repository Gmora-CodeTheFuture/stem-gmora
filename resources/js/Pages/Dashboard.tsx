import { Head, Link } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { Certificate, Course, PageProps } from '@/types';
import { motion } from 'framer-motion';
import { Award, BookOpen, Clock, TrendingUp, ArrowRight, Play, Radio } from 'lucide-react';

interface DashboardProps extends PageProps {
    stats: {
        enrolled_courses: number;
        hours_learned: number;
        certificates: number;
        progress_percentage: number;
    };
    enrollments: Array<{
        id: string;
        course?: Course;
        status: string;
        completed_lessons_count: number;
        percentage: number;
    }>;
    resume: {
        lesson_id: string;
        lesson_title?: string;
        course_title?: string;
        course_slug?: string;
        watch_percentage: number;
    } | null;
    nextLive: { id: string; title: string; scheduled_start: string; duration_minutes: number } | null;
    certificates: Array<Certificate & { course?: Course }>;
}

export default function Dashboard({ auth, stats, enrollments, resume, nextLive, certificates }: DashboardProps) {
    const tiles = [
        { label: 'Enrolled Courses', value: `${stats.enrolled_courses}`, icon: BookOpen, color: 'text-primary-600 bg-primary-50 dark:bg-primary-950/50 dark:text-primary-400' },
        { label: 'Hours Learned', value: `${stats.hours_learned}`, icon: Clock, color: 'text-accent-600 bg-accent-50 dark:bg-accent-950/50 dark:text-accent-400' },
        { label: 'Certificates', value: `${stats.certificates}`, icon: Award, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/50 dark:text-violet-400' },
        { label: 'Progress', value: `${stats.progress_percentage}%`, icon: TrendingUp, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400' },
    ];

    return (
        <DashboardLayout header="Dashboard">
            <Head title="Dashboard — Gmora STEM" />

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold font-display text-surface-900 dark:text-white mb-2">
                    Welcome back, {auth?.user?.full_name?.split(' ')[0] || 'Student'} 👋
                </h1>
                <p className="text-surface-500">Continue where you left off or explore new courses.</p>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {tiles.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="card p-5"
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-bold font-display text-surface-900 dark:text-white">{stat.value}</div>
                        <div className="text-sm text-surface-500 mt-0.5">{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
                <div className="space-y-6">
                    {/* Continue learning */}
                    {resume?.course_slug ? (
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="card p-6"
                        >
                            <div className="text-xs font-semibold uppercase tracking-wider text-primary-500 mb-2">
                                Continue learning
                            </div>
                            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                                {resume.lesson_title}
                            </h2>
                            <p className="text-sm text-surface-500 mt-0.5">{resume.course_title}</p>

                            <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden mt-4">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                                    style={{ width: `${Math.round(resume.watch_percentage)}%` }}
                                />
                            </div>

                            <Link
                                href={route('learn.lesson', [resume.course_slug, resume.lesson_id])}
                                className="btn-primary mt-5"
                            >
                                <Play className="w-4 h-4" />
                                Resume lesson
                            </Link>
                        </motion.div>
                    ) : enrollments.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="card p-8 text-center"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center mx-auto mb-4">
                                <Play className="w-8 h-8 text-primary-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">No courses yet</h3>
                            <p className="text-surface-500 mb-6 max-w-md mx-auto">
                                Start your STEM journey by enrolling in your first course. Our AI Fundamentals course
                                is a great place to begin.
                            </p>
                            <Link href={route('courses.index')} className="btn-primary text-sm">
                                <BookOpen className="w-4 h-4" />
                                Browse Courses
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </motion.div>
                    ) : null}

                    {/* Enrolled courses */}
                    {enrollments.length > 0 && (
                        <div className="card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-surface-900 dark:text-white">Your courses</h2>
                                <Link
                                    href={route('dashboard.courses')}
                                    className="text-sm text-primary-600 hover:text-primary-500 inline-flex items-center gap-1"
                                >
                                    View all <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>

                            <ul className="divide-y divide-surface-100 dark:divide-surface-800">
                                {enrollments.slice(0, 4).map((enrollment) => (
                                    <li key={enrollment.id} className="py-3 flex items-center gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-surface-900 dark:text-white truncate">
                                                {enrollment.course?.title}
                                            </div>
                                            <div className="h-1.5 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden mt-2 max-w-xs">
                                                <div
                                                    className="h-full rounded-full bg-primary-500"
                                                    style={{ width: `${enrollment.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-sm text-surface-500 shrink-0">
                                            {enrollment.percentage}%
                                        </span>
                                        {enrollment.course?.slug && (
                                            <Link
                                                href={route('learn.show', enrollment.course.slug)}
                                                className="btn-ghost px-3 py-1.5 text-sm shrink-0"
                                            >
                                                Open
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="card p-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Radio className="w-4 h-4 text-violet-500" />
                            <h2 className="font-semibold text-surface-900 dark:text-white">Next live class</h2>
                        </div>
                        {nextLive ? (
                            <>
                                <div className="font-medium text-surface-900 dark:text-white">{nextLive.title}</div>
                                <p className="text-sm text-surface-500 mt-1">
                                    {new Date(nextLive.scheduled_start).toLocaleString(undefined, {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                    })}{' '}
                                    · {nextLive.duration_minutes} min
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-surface-500">Nothing scheduled right now.</p>
                        )}
                    </div>

                    <div className="card p-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Award className="w-4 h-4 text-accent-500" />
                            <h2 className="font-semibold text-surface-900 dark:text-white">Certificates</h2>
                        </div>
                        {certificates.length > 0 ? (
                            <ul className="space-y-3">
                                {certificates.map((certificate) => (
                                    <li key={certificate.id}>
                                        <Link
                                            href={route('certificate.verify', certificate.certificate_code)}
                                            className="block text-sm"
                                        >
                                            <span className="font-medium text-surface-900 dark:text-white">
                                                {certificate.course?.title}
                                            </span>
                                            <span className="block text-xs text-surface-400 font-mono mt-0.5">
                                                {certificate.certificate_code}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-surface-500">
                                Finish a course to earn your first certificate.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
