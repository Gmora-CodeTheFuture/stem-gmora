import { Head, router } from '@inertiajs/react';
import { Award, BookOpen, ClipboardCheck, Info, TrendingUp, UserPlus, Users } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

interface Point {
    date: string;
    count: number;
}

interface Props extends PageProps {
    days: number;
    headline: {
        users: number;
        new_users: number;
        enrollments: number;
        new_enrollments: number;
        active_learners: number;
        certificates: number;
        completion_rate: number;
        published_courses: number;
    };
    signups: Point[];
    enrollments: Point[];
    completions: Point[];
    courses: Array<{
        id: string;
        title: string;
        enrollments: number;
        completed: number;
        certificates: number;
        completion_rate: number;
        average_progress: number;
    }>;
    assessment: {
        quiz_attempts: number;
        quiz_average: number;
        quiz_pass_rate: number;
        submissions: number;
        awaiting_grading: number;
        graded_last_period: number;
    };
    unavailable: { revenue: string };
}

/** A compact column chart — no chart library, no runtime cost. */
function Sparkbars({ points, label }: { points: Point[]; label: string }) {
    const peak = Math.max(...points.map((p) => p.count), 1);

    return (
        <div className="card p-5">
            <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-sm font-medium text-surface-900 dark:text-white">{label}</h3>
                <span className="text-sm text-surface-400">
                    {points.reduce((sum, p) => sum + p.count, 0)} total
                </span>
            </div>

            <div className="flex items-end gap-[3px] h-24">
                {points.map((point) => (
                    <div
                        key={point.date}
                        title={`${point.count} on ${point.date}`}
                        style={{ height: `${Math.max((point.count / peak) * 100, 3)}%` }}
                        className={`flex-1 rounded-sm ${
                            point.count > 0 ? 'bg-primary-500' : 'bg-surface-100 dark:bg-surface-800'
                        }`}
                    />
                ))}
            </div>

            <div className="flex justify-between text-[11px] text-surface-400 mt-2">
                <span>{points[0]?.date}</span>
                <span>{points[points.length - 1]?.date}</span>
            </div>
        </div>
    );
}

export default function Reports({
    days, headline, signups, enrollments, completions, courses, assessment, unavailable,
}: Props) {
    const tiles = [
        { label: 'Learners', value: headline.users, caption: `+${headline.new_users} new`, icon: Users },
        {
            label: 'Enrollments',
            value: headline.enrollments,
            caption: `+${headline.new_enrollments} new`,
            icon: UserPlus,
        },
        {
            label: 'Active learners',
            value: headline.active_learners,
            caption: `studied in ${days} days`,
            icon: TrendingUp,
        },
        {
            label: 'Course completion',
            value: `${headline.completion_rate}%`,
            caption: `${headline.certificates} certificates`,
            icon: Award,
        },
    ];

    return (
        <DashboardLayout header="Reports">
            <Head title="Reports — Admin" />

            <div className="inline-flex p-1 rounded-full bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 mb-6">
                {[7, 30, 90].map((option) => (
                    <button
                        key={option}
                        onClick={() => router.get(route('admin.reports.index'), { days: option })}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            days === option
                                ? 'bg-white dark:bg-surface-800 text-surface-900 dark:text-white shadow-card'
                                : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
                        }`}
                    >
                        {option} days
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-surface-200 dark:bg-surface-800 rounded-3xl overflow-hidden border border-surface-200 dark:border-surface-800 mb-5">
                {tiles.map((tile) => (
                    <div key={tile.label} className="bg-white dark:bg-surface-900 p-5">
                        <div className="flex items-center gap-2 text-surface-500 mb-3">
                            <tile.icon className="w-4 h-4" />
                            <span className="text-xs font-medium">{tile.label}</span>
                        </div>
                        <p className="text-2xl font-semibold text-surface-900 dark:text-white">{tile.value}</p>
                        <p className="text-xs text-surface-400 mt-1">{tile.caption}</p>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-5 mb-5">
                <Sparkbars points={signups} label="Sign-ups" />
                <Sparkbars points={enrollments} label="Enrollments" />
                <Sparkbars points={completions} label="Lessons completed" />
            </div>

            <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
                <div className="card p-6">
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-4">
                        Course performance
                    </h2>

                    {courses.length === 0 ? (
                        <p className="text-sm text-surface-500">No published courses yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-surface-400">
                                        <th className="pb-3 font-medium">Course</th>
                                        <th className="pb-3 font-medium text-right">Enrolled</th>
                                        <th className="pb-3 font-medium text-right">Avg progress</th>
                                        <th className="pb-3 font-medium text-right">Completed</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                                    {courses.map((course) => (
                                        <tr key={course.id}>
                                            <td className="py-3 pr-4 text-surface-900 dark:text-white">
                                                {course.title}
                                            </td>
                                            <td className="py-3 text-right text-surface-600 dark:text-surface-300">
                                                {course.enrollments}
                                            </td>
                                            <td className="py-3 text-right">
                                                <span className="inline-flex items-center gap-2 justify-end">
                                                    <span className="w-16 progress-track">
                                                        <span
                                                            className="progress-fill block"
                                                            style={{ width: `${course.average_progress}%` }}
                                                        />
                                                    </span>
                                                    <span className="text-surface-500 w-9 text-right">
                                                        {course.average_progress}%
                                                    </span>
                                                </span>
                                            </td>
                                            <td className="py-3 text-right text-surface-600 dark:text-surface-300">
                                                {course.completed} ({course.completion_rate}%)
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="space-y-5">
                    <div className="card p-6">
                        <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-4">Assessment</h2>

                        <dl className="space-y-3 text-sm">
                            {[
                                ['Quiz attempts', assessment.quiz_attempts],
                                ['Average score', `${assessment.quiz_average}%`],
                                ['Pass rate', `${assessment.quiz_pass_rate}%`],
                                ['Submissions', assessment.submissions],
                                ['Graded', assessment.graded_last_period],
                            ].map(([label, value]) => (
                                <div key={String(label)} className="flex items-center justify-between">
                                    <dt className="text-surface-500">{label}</dt>
                                    <dd className="font-medium text-surface-900 dark:text-white">{value}</dd>
                                </div>
                            ))}

                            <div className="flex items-center justify-between pt-3 border-t border-surface-100 dark:border-surface-800">
                                <dt className="text-surface-500 inline-flex items-center gap-1.5">
                                    <ClipboardCheck className="w-3.5 h-3.5" />
                                    Awaiting grading
                                </dt>
                                <dd
                                    className={`font-medium ${
                                        assessment.awaiting_grading > 0
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-surface-900 dark:text-white'
                                    }`}
                                >
                                    {assessment.awaiting_grading}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <div className="card p-6">
                        <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-2 inline-flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Catalog
                        </h2>
                        <p className="text-sm text-surface-500">
                            {headline.published_courses} published course
                            {headline.published_courses === 1 ? '' : 's'}.
                        </p>

                        <p className="flex items-start gap-2 text-xs text-surface-400 mt-4 pt-4 border-t border-surface-100 dark:border-surface-800">
                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            {unavailable.revenue}
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
