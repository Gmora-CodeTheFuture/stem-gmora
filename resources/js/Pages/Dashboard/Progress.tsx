import { Head, Link } from '@inertiajs/react';
import {
    Award, BookOpen, ClipboardCheck, Flame, GraduationCap,
    PlayCircle, Shield, Zap,
} from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { Certificate, Course, PageProps } from '@/types';

interface ProgressProps extends PageProps {
    stats: {
        courses: number;
        lessons_completed: number;
        certificates: number;
        submissions: number;
        hours_learned: number;
        progress_percentage: number;
        level: number;
        xp: number;
        xp_to_next_level: number;
    };
    streak: { current: number; longest: number };
    badges: Array<{ id: string; name: string; description: string; earned_at: string }>;
    activity: Array<{ date: string; count: number }>;
    enrollments: Array<{
        id: string;
        course?: Course;
        status: string;
        completed_lessons_count: number;
        percentage: number;
    }>;
    certificates: Array<Certificate & { course?: Course }>;
}

/** GitHub-style 0–4 intensity from a day's count relative to the busiest day. */
function activityLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
    if (count <= 0) {
        return 0;
    }
    if (max <= 1) {
        return 1;
    }
    const ratio = count / max;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
}

const ACTIVITY_LEVEL_CLASS = [
    'bg-surface-100 dark:bg-surface-800',
    'bg-primary-200 dark:bg-primary-900',
    'bg-primary-400 dark:bg-primary-700',
    'bg-primary-500 dark:bg-primary-600',
    'bg-primary-700 dark:bg-primary-400',
] as const;

type ActivityDay = { date: string; count: number; pad?: boolean };

function contributionCells(activity: Array<{ date: string; count: number }>): ActivityDay[] {
    if (activity.length === 0) {
        return [];
    }

    const first = new Date(`${activity[0].date}T12:00:00`);
    const weekday = first.getDay();
    const pads: ActivityDay[] = Array.from({ length: weekday }, (_, i) => {
        const d = new Date(first);
        d.setDate(d.getDate() - (weekday - i));
        return { date: d.toISOString().slice(0, 10), count: 0, pad: true };
    });

    return [...pads, ...activity.map((day) => ({ ...day, pad: false }))];
}

export default function Progress({
    stats, streak, activity, enrollments, certificates, badges,
}: ProgressProps) {
    const tiles = [
        { label: 'Courses', value: stats.courses, caption: 'enrolled', icon: BookOpen },
        { label: 'Lessons', value: stats.lessons_completed, caption: 'completed', icon: GraduationCap },
        { label: 'Assignments', value: stats.submissions, caption: 'submitted', icon: ClipboardCheck },
        { label: 'Certificates', value: stats.certificates, caption: 'earned', icon: Award },
        { label: 'Hours', value: stats.hours_learned, caption: 'of content watched', icon: PlayCircle },
    ];

    const busiest = Math.max(...activity.map((day) => day.count), 1);
    const cells = contributionCells(activity);

    return (
        <DashboardLayout>
            <Head title="My Progress — Gmora STEM" />

            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 sm:gap-8 mb-10">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-semibold text-surface-900 dark:text-white mb-1.5">
                        My Progress
                    </h1>
                    <p className="text-surface-600 dark:text-surface-400 text-sm sm:text-base">
                        Level, streak, activity, and how each course is going.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-6 w-full sm:w-auto sm:flex sm:flex-wrap sm:items-start sm:gap-8 xl:gap-10">
                    <div className="min-w-0 flex flex-col items-center text-center sm:items-start sm:text-left">
                        <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-3">
                            Level
                        </p>
                        <div className="flex items-baseline gap-2">
                            <Shield className="w-5 h-5 text-indigo-500 shrink-0" />
                            <span className="text-3xl font-semibold text-surface-900 dark:text-white leading-none">
                                {stats.level}
                            </span>
                        </div>
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-2 leading-snug">
                            {stats.xp} XP · {stats.xp_to_next_level} to level {stats.level + 1}
                        </p>
                    </div>

                    <div className="min-w-0 flex flex-col items-center text-center sm:items-start sm:text-left">
                        <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-3">
                            Learning streak
                        </p>
                        <div className="flex items-baseline gap-2">
                            <Flame className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0" />
                            <span className="text-3xl font-semibold text-surface-900 dark:text-white leading-none">
                                {streak.current}
                            </span>
                            <span className="text-sm text-surface-600 dark:text-surface-400">
                                day{streak.current === 1 ? '' : 's'}
                            </span>
                        </div>
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-2">
                            Longest: {streak.longest} days
                        </p>
                    </div>

                    <div className="min-w-0 flex flex-col items-center text-center sm:items-start sm:text-left">
                        <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-3">
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

                    <div className="min-w-0 flex flex-col items-center text-center sm:items-start sm:text-left">
                        <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-3">
                            Last 4 weeks
                        </p>
                        <div
                            className="grid grid-rows-7 grid-flow-col gap-1"
                            role="img"
                            aria-label="Lessons completed over the last four weeks"
                        >
                            {cells.map((day) => {
                                const level = day.pad ? 0 : activityLevel(day.count, busiest);
                                const label = day.pad
                                    ? undefined
                                    : `${day.count} lesson${day.count === 1 ? '' : 's'} on ${day.date}`;

                                return (
                                    <span
                                        key={`${day.pad ? 'pad-' : ''}${day.date}`}
                                        title={label}
                                        aria-label={label}
                                        className={`w-3 h-3 rounded-sm ${
                                            day.pad
                                                ? 'bg-transparent'
                                                : ACTIVITY_LEVEL_CLASS[level]
                                        }`}
                                    />
                                );
                            })}
                        </div>
                        <div className="mt-2 flex items-center justify-center sm:justify-start gap-1 text-[10px] text-surface-500 dark:text-surface-400">
                            <span>Less</span>
                            {ACTIVITY_LEVEL_CLASS.map((cls, level) => (
                                <span key={level} className={`w-2.5 h-2.5 rounded-sm ${cls}`} aria-hidden />
                            ))}
                            <span>More</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-surface-200 dark:bg-surface-800 rounded-3xl overflow-hidden border border-surface-200 dark:border-surface-800 mb-10">
                {tiles.map((tile) => (
                    <div key={tile.label} className="bg-white dark:bg-surface-900 p-5">
                        <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400 mb-3">
                            <tile.icon className="w-4 h-4" />
                            <span className="text-sm font-medium">{tile.label}</span>
                        </div>
                        <p className="text-2xl font-semibold text-surface-900 dark:text-white leading-none">
                            {tile.value}
                        </p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1.5">{tile.caption}</p>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-10 mb-10">
                <section>
                    <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
                        Course progress
                    </h2>
                    {enrollments.length === 0 ? (
                        <div className="card p-8 text-center">
                            <BookOpen className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                            <p className="text-sm text-surface-600 dark:text-surface-400 mb-5">
                                Enroll in a course to track progress here.
                            </p>
                            <Link href={route('dashboard.courses')} className="btn-primary">
                                Find a course
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {enrollments.map((enrollment) => (
                                <Link
                                    key={enrollment.id}
                                    href={
                                        enrollment.course?.slug
                                            ? route('learn.show', enrollment.course.slug)
                                            : '#'
                                    }
                                    className="block p-4 rounded-2xl border border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-900 transition-colors"
                                >
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">
                                            {enrollment.course?.title}
                                        </p>
                                        <span className="text-sm font-medium text-surface-700 dark:text-surface-300 shrink-0">
                                            {enrollment.percentage}%
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-primary-600"
                                            style={{ width: `${enrollment.percentage}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-surface-600 dark:text-surface-400 mt-2">
                                        {enrollment.completed_lessons_count} of{' '}
                                        {enrollment.course?.total_lessons ?? 0} lessons completed
                                    </p>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                <div className="space-y-10">
                    <section>
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
                            Badges earned
                        </h2>
                        {badges.length === 0 ? (
                            <p className="text-sm text-surface-600 dark:text-surface-400">
                                Keep learning to unlock badges.
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {badges.map((badge) => (
                                    <li
                                        key={badge.id}
                                        className="flex items-start gap-3 p-3 rounded-2xl border border-surface-200 dark:border-surface-800"
                                    >
                                        <span className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950 flex items-center justify-center shrink-0">
                                            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold text-surface-900 dark:text-white">
                                                {badge.name}
                                            </span>
                                            <span className="block text-xs text-surface-600 dark:text-surface-400 mt-0.5">
                                                {badge.description}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section>
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                                Recent certificates
                            </h2>
                            <Link
                                href={route('dashboard.certificates')}
                                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                            >
                                View all
                            </Link>
                        </div>
                        {certificates.length === 0 ? (
                            <p className="text-sm text-surface-600 dark:text-surface-400">
                                Complete a course to earn your first certificate.
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {certificates.map((certificate) => (
                                    <li
                                        key={certificate.id}
                                        className="flex items-center gap-3 p-3 rounded-2xl border border-surface-200 dark:border-surface-800"
                                    >
                                        <span className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-950 flex items-center justify-center shrink-0">
                                            <Award className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold text-surface-900 dark:text-white truncate">
                                                {certificate.course?.title ?? 'Certificate'}
                                            </span>
                                            {certificate.issued_at && (
                                                <span className="block text-xs text-surface-600 dark:text-surface-400 mt-0.5">
                                                    Issued {new Date(certificate.issued_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </DashboardLayout>
    );
}
