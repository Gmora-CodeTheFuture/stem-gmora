import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, HelpCircle, RefreshCw, Target, XCircle } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

interface AttemptSummary {
    id: string;
    score: number | null;
    points_earned: number;
    points_possible: number;
    status: 'in_progress' | 'submitted' | 'graded';
    submitted_at: string | null;
    passed: boolean;
}

interface Props extends PageProps {
    quiz: {
        id: string;
        title: string;
        description?: string;
        time_limit_seconds: number | null;
        max_attempts: number;
        passing_score: number;
        question_count: number;
        total_points: number;
        course: { id: string; title: string; slug: string };
    };
    attempts: AttemptSummary[];
    attemptsRemaining: number;
    activeAttemptId: string | null;
}

export default function QuizShow({ quiz, attempts, attemptsRemaining, activeAttemptId }: Props) {
    const [starting, setStarting] = useState(false);

    const start = () => {
        setStarting(true);
        router.post(route('quiz.start', quiz.id), {}, { onFinish: () => setStarting(false) });
    };

    const best = attempts.reduce<AttemptSummary | null>(
        (top, attempt) => (top === null || Number(attempt.score) > Number(top.score) ? attempt : top),
        null,
    );

    return (
        <DashboardLayout header={quiz.title}>
            <Head title={`${quiz.title} — Gmora STEM`} />

            <Link
                href={route('learn.show', quiz.course.slug)}
                className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                {quiz.course.title}
            </Link>

            <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
                <div className="card p-7">
                    <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center mb-4">
                        <HelpCircle className="w-6 h-6 text-primary-500" />
                    </div>

                    <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">{quiz.title}</h1>
                    {quiz.description && <p className="text-surface-500 mt-2 leading-relaxed">{quiz.description}</p>}

                    <dl className="grid sm:grid-cols-3 gap-4 mt-7 pt-7 border-t border-surface-100 dark:border-surface-800">
                        <div>
                            <dt className="text-xs uppercase tracking-wider text-surface-400 font-semibold">Questions</dt>
                            <dd className="text-lg font-semibold text-surface-900 dark:text-white mt-1">
                                {quiz.question_count}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs uppercase tracking-wider text-surface-400 font-semibold">Time limit</dt>
                            <dd className="text-lg font-semibold text-surface-900 dark:text-white mt-1">
                                {quiz.time_limit_seconds
                                    ? `${Math.round(quiz.time_limit_seconds / 60)} min`
                                    : 'Untimed'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs uppercase tracking-wider text-surface-400 font-semibold">To pass</dt>
                            <dd className="text-lg font-semibold text-surface-900 dark:text-white mt-1">
                                {quiz.passing_score}%
                            </dd>
                        </div>
                    </dl>

                    <div className="mt-7">
                        {activeAttemptId ? (
                            <Link href={route('quiz.attempt', activeAttemptId)} className="btn-primary">
                                <RefreshCw className="w-4 h-4" />
                                Resume attempt
                            </Link>
                        ) : attemptsRemaining > 0 ? (
                            <button onClick={start} disabled={starting} className="btn-primary">
                                <Target className="w-4 h-4" />
                                {starting ? 'Starting…' : attempts.length > 0 ? 'Try again' : 'Start quiz'}
                            </button>
                        ) : (
                            <p className="text-sm text-surface-500">
                                You've used all {quiz.max_attempts} attempts for this quiz.
                            </p>
                        )}

                        {attemptsRemaining > 0 && !activeAttemptId && (
                            <p className="text-xs text-surface-400 mt-3">
                                {attemptsRemaining} of {quiz.max_attempts} attempt
                                {quiz.max_attempts === 1 ? '' : 's'} remaining.
                                {quiz.time_limit_seconds
                                    ? ' The timer starts as soon as you begin.'
                                    : ''}
                            </p>
                        )}
                    </div>
                </div>

                <aside className="card p-6">
                    <h2 className="font-semibold text-surface-900 dark:text-white mb-4">Your attempts</h2>

                    {attempts.length === 0 ? (
                        <p className="text-sm text-surface-500">No attempts yet.</p>
                    ) : (
                        <>
                            {best && (
                                <div className="mb-4 pb-4 border-b border-surface-100 dark:border-surface-800">
                                    <div className="text-xs uppercase tracking-wider text-surface-400 font-semibold">
                                        Best score
                                    </div>
                                    <div className="text-2xl font-semibold text-surface-900 dark:text-white mt-1">
                                        {Number(best.score ?? 0).toFixed(0)}%
                                    </div>
                                </div>
                            )}

                            <ul className="space-y-3">
                                {attempts.map((attempt, index) => (
                                    <li key={attempt.id} className="flex items-center gap-2.5 text-sm">
                                        {attempt.status === 'in_progress' ? (
                                            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                                        ) : attempt.passed ? (
                                            <CheckCircle2 className="w-4 h-4 text-accent-500 shrink-0" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                                        )}

                                        <span className="text-surface-600 dark:text-surface-300">
                                            Attempt {index + 1}
                                        </span>

                                        <span className="ml-auto text-surface-500">
                                            {attempt.status === 'in_progress'
                                                ? 'In progress'
                                                : `${Number(attempt.score ?? 0).toFixed(0)}%`}
                                        </span>

                                        {attempt.status !== 'in_progress' && (
                                            <Link
                                                href={route('quiz.result', attempt.id)}
                                                className="text-primary-600 hover:text-primary-500 text-xs"
                                            >
                                                View
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </aside>
            </div>
        </DashboardLayout>
    );
}
