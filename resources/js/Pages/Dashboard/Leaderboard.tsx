import { Head, Link, router } from '@inertiajs/react';
import { Flame, Medal, Trophy, Users } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import SegmentedControl from '@/Components/SegmentedControl';
import SystemSelect from '@/Components/SystemSelect';
import { PageProps } from '@/types';

interface Row {
    rank: number;
    user_id: string | null;
    name: string;
    score: number;
    caption: string;
    is_you: boolean;
}

interface Props extends PageProps {
    board: 'xp' | 'streak' | 'course';
    rows: Row[];
    you: { rank: number; score: number } | null;
    courses: Array<{ id: string; title: string; slug: string }>;
    selectedCourse: string;
}

const BOARDS = [
    { key: 'xp', label: 'Experience', icon: Trophy, unit: 'XP' },
    { key: 'streak', label: 'Streaks', icon: Flame, unit: 'days' },
    { key: 'course', label: 'By course', icon: Users, unit: 'lessons' },
] as const;

const MEDALS = ['text-amber-500', 'text-surface-400', 'text-amber-700'];

export default function Leaderboard({ board, rows, you, courses, selectedCourse }: Props) {
    const active = BOARDS.find((b) => b.key === board) ?? BOARDS[0];

    const go = (patch: Record<string, string>) =>
        router.get(route('dashboard.leaderboard'), { board, course: selectedCourse, ...patch }, {
            preserveState: true,
            replace: true,
        });

    return (
        <DashboardLayout header="Leaderboard">
            <Head title="Leaderboard — Gmora STEM" />

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
                <SegmentedControl
                    className="self-start"
                    aria-label="Leaderboard type"
                    value={board}
                    onChange={(key) => go({ board: key })}
                    items={BOARDS.map((item) => ({
                        key: item.key,
                        label: (
                            <span className="inline-flex items-center gap-1.5">
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </span>
                        ),
                    }))}
                />

                {board === 'course' && courses.length > 0 && (
                    <SystemSelect
                        value={selectedCourse}
                        onValueChange={(course) => go({ course })}
                        aria-label="Choose a course"
                        triggerClassName="rounded-full max-w-xs w-auto"
                        options={courses.map((course) => ({
                            value: course.id,
                            label: course.title,
                        }))}
                    />
                )}

                {you && (
                    <span className="sm:ml-auto text-sm text-surface-500">
                        You're <span className="font-semibold text-surface-900 dark:text-white">#{you.rank}</span> with{' '}
                        {you.score} {active.unit}
                    </span>
                )}
            </div>

            {rows.length === 0 ? (
                <div className="card p-12 text-center">
                    <Trophy className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1.5">
                        Nothing to rank yet
                    </h2>
                    <p className="text-sm text-surface-500">
                        {board === 'course'
                            ? 'Complete a lesson to get this course board going.'
                            : 'Finish a lesson to earn your first XP and appear here.'}
                    </p>
                </div>
            ) : (
                <div className="card divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden">
                    {rows.map((row) => (
                        <div
                            key={`${row.rank}-${row.user_id ?? 'private'}`}
                            className={`flex items-center gap-4 p-4 ${
                                row.is_you ? 'bg-primary-50/60 dark:bg-primary-950/40' : ''
                            }`}
                        >
                            <span className="w-8 text-center shrink-0">
                                {row.rank <= 3 ? (
                                    <Medal className={`w-5 h-5 mx-auto ${MEDALS[row.rank - 1]}`} />
                                ) : (
                                    <span className="text-sm text-surface-400">{row.rank}</span>
                                )}
                            </span>

                            <span className="w-9 h-9 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 text-sm font-medium flex items-center justify-center shrink-0">
                                {row.user_id ? row.name.charAt(0).toUpperCase() : '·'}
                            </span>

                            <span className="flex-1 min-w-0">
                                {row.user_id ? (
                                    <Link
                                        href={route('portfolio.show', row.user_id)}
                                        className="text-sm font-medium text-surface-900 dark:text-white hover:text-primary-600 transition-colors"
                                    >
                                        {row.name}
                                    </Link>
                                ) : (
                                    <span className="text-sm text-surface-500">{row.name}</span>
                                )}
                                {row.is_you && <span className="badge-primary ml-2">You</span>}
                            </span>

                            <span className="text-right shrink-0">
                                <span className="block text-sm font-semibold text-surface-900 dark:text-white">
                                    {row.score} {active.unit}
                                </span>
                                <span className="block text-xs text-surface-400">{row.caption}</span>
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-xs text-surface-400 mt-4">
                Only learners who have made their profile public are named. Everyone else keeps their place as
                “Private learner”.
            </p>
        </DashboardLayout>
    );
}
