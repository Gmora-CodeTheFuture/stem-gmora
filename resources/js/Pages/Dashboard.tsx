import { Head, Link } from '@inertiajs/react';
import {
    ArrowUpRight, Award, BookOpen, CalendarClock, ClipboardCheck,
    Flame, GraduationCap, PlayCircle,
} from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { Certificate, Course, PageProps } from '@/types';

interface DashboardProps extends PageProps {
    stats: {
        courses: number;
        lessons_completed: number;
        certificates: number;
        submissions: number;
        hours_learned: number;
        progress_percentage: number;
    };
    streak: { current: number; longest: number };
    activity: Array<{ date: string; count: number }>;
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
        updated_at: string;
    } | null;
    upcoming: Array<{ id: string; title: string; type: string; starts_at: string; course_title?: string }>;
    dueSoon: Array<{ id: string; title: string; deadline_at: string; course_title?: string }>;
    certificates: Array<Certificate & { course?: Course }>;
}

function relative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.round(Math.abs(diff) / 86_400_000);
    const future = diff < 0;

    if (days === 0) return 'today';
    if (days === 1) return future ? 'tomorrow' : 'yesterday';
    if (days < 30) return future ? `in ${days} days` : `${days} days ago`;

    const months = Math.round(days / 30);

    return future ? `in ${months} month${months > 1 ? 's' : ''}` : `${months} month${months > 1 ? 's' : ''} ago`;
}

export default function Dashboard({
    auth, stats, streak, activity, enrollments, resume, upcoming, dueSoon, certificates,
}: DashboardProps) {
    const tiles = [
        { label: 'Courses', value: stats.courses, caption: 'enrolled', icon: BookOpen },
        { label: 'Lessons', value: stats.lessons_completed, caption: 'completed', icon: GraduationCap },
        { label: 'Assignments', value: stats.submissions, caption: 'submitted', icon: ClipboardCheck },
        { label: 'Certificates', value: stats.certificates, caption: 'earned', icon: Award },
        { label: 'Hours', value: stats.hours_learned, caption: 'of content watched', icon: PlayCircle },
    ];

    const busiest = Math.max(...activity.map((day) => day.count), 1);

    return (
        <DashboardLayout>
            <Head title="Home — Gmora STEM" />

            {/* ── Welcome + at-a-glance ──────────────────────── */}
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-8 mb-10">
                <div className="flex-1">
                    <h1 className="text-3xl font-semibold text-surface-900 dark:text-white mb-1.5">
                        Welcome, {auth?.user?.full_name?.split(' ')[0]}
                    </h1>
                    <p className="text-surface-500">Jump back in, or start something new.</p>
                </div>

                <div className="flex items-start gap-8 sm:gap-10">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-3">
                            Learning streak
                        </p>
                        <div className="flex items-baseline gap-2">
                            <Flame className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            <span className="text-3xl font-semibold text-surface-900 dark:text-white leading-none">
                                {streak.current}
                            </span>
                            <span className="text-sm text-surface-500">
                                day{streak.current === 1 ? '' : 's'}
                            </span>
                        </div>
                        <p className="text-xs text-surface-400 mt-2">Longest: {streak.longest} days</p>
                    </div>

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-3">
                            Overall progress
                        </p>
                        <div className="relative w-16 h-16">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
                                <circle cx="50" cy="50" r="45" strokeWidth="8" fill="none" className="stroke-surface-100 dark:stroke-surface-800" />
                                <circle
                                    cx="50" cy="50" r="45" strokeWidth="8" fill="none" strokeLinecap="round"
                                    className="stroke-primary-600"
                                    strokeDasharray={2 * Math.PI * 45}
                                    strokeDashoffset={2 * Math.PI * 45 * (1 - stats.progress_percentage / 100)}
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-surface-900 dark:text-white">
                                {stats.progress_percentage}%
                            </span>
                        </div>
                    </div>

                    <div className="hidden sm:block">
                        <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-3">
                            Last 4 weeks
                        </p>
                        <div className="grid grid-cols-7 grid-flow-row gap-1">
                            {activity.map((day) => (
                                <span
                                    key={day.date}
                                    title={`${day.count} lesson${day.count === 1 ? '' : 's'} on ${day.date}`}
                                    className={`w-3 h-3 rounded-sm ${
                                        day.count === 0
                                            ? 'bg-surface-100 dark:bg-surface-800'
                                            : day.count >= busiest
                                              ? 'bg-primary-600'
                                              : 'bg-primary-300 dark:bg-primary-800'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Stat row ───────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-surface-200 dark:bg-surface-800 rounded-3xl overflow-hidden border border-surface-200 dark:border-surface-800 mb-10">
                {tiles.map((tile) => (
                    <div key={tile.label} className="bg-white dark:bg-surface-900 p-5">
                        <div className="flex items-center gap-2 text-surface-500 mb-3">
                            <tile.icon className="w-4 h-4" />
                            <span className="text-sm font-medium">{tile.label}</span>
                        </div>
                        <p className="text-2xl font-semibold text-surface-900 dark:text-white leading-none">
                            {tile.value}
                        </p>
                        <p className="text-xs text-surface-400 mt-1.5">{tile.caption}</p>
                    </div>
                ))}
            </div>

            {/* ── Next steps ─────────────────────────────────── */}
            <div className="flex items-center gap-2 mb-6">
                <ArrowUpRight className="w-5 h-5 text-surface-900 dark:text-white" />
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Next steps</h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-10">
                {/* Jump back in */}
                <section>
                    <h3 className="text-sm font-semibold text-surface-900 dark:text-white mb-4">Jump back in</h3>

                    {enrollments.length === 0 ? (
                        <div className="card p-8 text-center">
                            <BookOpen className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                            <p className="text-sm text-surface-500 mb-5">
                                You're not enrolled in anything yet.
                            </p>
                            <Link href={route('dashboard.courses')} className="btn-primary">
                                Find a course
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {resume?.course_slug && (
                                <Link
                                    href={route('learn.lesson', [resume.course_slug, resume.lesson_id])}
                                    className="group flex items-center gap-4 p-4 -mx-4 rounded-2xl bg-surface-100/70 dark:bg-surface-900 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                                >
                                    <span className="w-11 h-11 rounded-full bg-primary-50 dark:bg-primary-950 flex items-center justify-center shrink-0">
                                        <PlayCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm font-semibold text-surface-900 dark:text-white truncate">
                                            {resume.course_title}
                                        </span>
                                        <span className="block text-xs text-surface-500 truncate">
                                            {resume.lesson_title} · {relative(resume.updated_at)}
                                        </span>
                                    </span>
                                    <span className="hidden sm:inline text-sm text-primary-600 dark:text-primary-400 font-medium shrink-0">
                                        Resume learning →
                                    </span>
                                </Link>
                            )}

                            {enrollments
                                .filter((enrollment) => enrollment.course?.slug !== resume?.course_slug)
                                .slice(0, 3)
                                .map((enrollment) => (
                                    <Link
                                        key={enrollment.id}
                                        href={
                                            enrollment.course?.slug
                                                ? route('learn.show', enrollment.course.slug)
                                                : '#'
                                        }
                                        className="flex items-center gap-4 p-4 -mx-4 rounded-2xl hover:bg-surface-100 dark:hover:bg-surface-900 transition-colors"
                                    >
                                        <span className="w-11 h-11 rounded-full border border-surface-200 dark:border-surface-700 flex items-center justify-center shrink-0">
                                            <BookOpen className="w-4 h-4 text-surface-400" />
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-semibold text-surface-900 dark:text-white truncate">
                                                {enrollment.course?.title}
                                            </span>
                                            <span className="block text-xs text-surface-500">
                                                {enrollment.completed_lessons_count} of{' '}
                                                {enrollment.course?.total_lessons ?? 0} lessons ·{' '}
                                                {enrollment.percentage}%
                                            </span>
                                        </span>
                                    </Link>
                                ))}
                        </div>
                    )}
                </section>

                {/* More things to do */}
                <section>
                    <h3 className="text-sm font-semibold text-surface-900 dark:text-white mb-4">
                        More things to do
                    </h3>

                    <div className="space-y-6">
                        {dueSoon.length > 0 && (
                            <div className="flex items-start gap-4">
                                <span className="w-10 h-10 rounded-full border border-surface-200 dark:border-surface-700 flex items-center justify-center shrink-0">
                                    <ClipboardCheck className="w-4 h-4 text-surface-500" />
                                </span>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-semibold text-surface-900 dark:text-white">
                                        Assignments waiting
                                    </h4>
                                    <ul className="mt-1.5 space-y-1.5">
                                        {dueSoon.map((assignment) => (
                                            <li key={assignment.id} className="text-sm text-surface-500">
                                                <Link
                                                    href={route('assignments.show', assignment.id)}
                                                    className="text-primary-600 dark:text-primary-400 hover:underline"
                                                >
                                                    {assignment.title}
                                                </Link>{' '}
                                                — due {relative(assignment.deadline_at)}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {upcoming.length > 0 && (
                            <div className="flex items-start gap-4">
                                <span className="w-10 h-10 rounded-full border border-surface-200 dark:border-surface-700 flex items-center justify-center shrink-0">
                                    <CalendarClock className="w-4 h-4 text-surface-500" />
                                </span>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-semibold text-surface-900 dark:text-white">
                                        Coming up
                                    </h4>
                                    <ul className="mt-1.5 space-y-1.5">
                                        {upcoming.map((item) => (
                                            <li key={`${item.type}-${item.id}`} className="text-sm text-surface-500">
                                                {item.title}
                                                {item.course_title ? ` · ${item.course_title}` : ''} —{' '}
                                                {new Date(item.starts_at).toLocaleString(undefined, {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short',
                                                })}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link
                                        href={route('dashboard.calendar')}
                                        className="inline-block text-sm text-primary-600 dark:text-primary-400 hover:underline mt-2"
                                    >
                                        Open calendar
                                    </Link>
                                </div>
                            </div>
                        )}

                        {certificates.length > 0 && (
                            <div className="flex items-start gap-4">
                                <span className="w-10 h-10 rounded-full border border-surface-200 dark:border-surface-700 flex items-center justify-center shrink-0">
                                    <Award className="w-4 h-4 text-surface-500" />
                                </span>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-semibold text-surface-900 dark:text-white">
                                        Your certificates
                                    </h4>
                                    <p className="text-sm text-surface-500 mt-1.5">
                                        You've earned {stats.certificates} certificate
                                        {stats.certificates === 1 ? '' : 's'}.{' '}
                                        <Link
                                            href={route('dashboard.certificates')}
                                            className="text-primary-600 dark:text-primary-400 hover:underline"
                                        >
                                            View them
                                        </Link>
                                        .
                                    </p>
                                </div>
                            </div>
                        )}

                        {dueSoon.length === 0 && upcoming.length === 0 && certificates.length === 0 && (
                            <div className="flex items-start gap-4">
                                <span className="w-10 h-10 rounded-full border border-surface-200 dark:border-surface-700 flex items-center justify-center shrink-0">
                                    <BookOpen className="w-4 h-4 text-surface-500" />
                                </span>
                                <div>
                                    <h4 className="text-sm font-semibold text-surface-900 dark:text-white">
                                        Explore the catalog
                                    </h4>
                                    <p className="text-sm text-surface-500 mt-1.5">
                                        Nothing is due right now.{' '}
                                        <Link
                                            href={route('dashboard.courses', { filter: 'all' })}
                                            className="text-primary-600 dark:text-primary-400 hover:underline"
                                        >
                                            Browse all courses
                                        </Link>{' '}
                                        to pick up something new.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </DashboardLayout>
    );
}
