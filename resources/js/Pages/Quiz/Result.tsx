import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Clock3, RotateCw, XCircle } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { GradedQuestion, PageProps } from '@/types';

interface Props extends PageProps {
    quiz: {
        id: string;
        title: string;
        passing_score: number;
        max_attempts: number;
        course: { id: string; title: string; slug: string };
    };
    attempt: {
        id: string;
        score: number | null;
        points_earned: number;
        points_possible: number;
        status: 'in_progress' | 'submitted' | 'graded';
        submitted_at: string | null;
        passed: boolean;
        awaiting_review: boolean;
    };
    questions: GradedQuestion[];
    attemptsRemaining: number;
}

/** Renders whatever the student actually entered, per question type. */
function describeAnswer(question: GradedQuestion, answer: unknown): string {
    if (answer === undefined || answer === null || answer === '') return 'No answer';

    if (Array.isArray(answer)) {
        return answer
            .map((index) => question.options.find((o) => o.index === Number(index))?.text ?? String(index))
            .join(', ');
    }

    if (typeof answer === 'object') {
        return Object.entries(answer as Record<string, string>)
            .map(([key, value]) => {
                const left = question.options.find((o) => String(o.index) === key)?.text ?? key;

                return `${left} → ${value}`;
            })
            .join('; ');
    }

    return String(answer);
}

export default function QuizResult({ quiz, attempt, questions, attemptsRemaining }: Props) {
    const score = Number(attempt.score ?? 0);

    return (
        <DashboardLayout header={`${quiz.title} — results`}>
            <Head title={`${quiz.title} results — Gmora STEM`} />

            <Link
                href={route('quiz.show', quiz.id)}
                className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to quiz
            </Link>

            {/* Score header */}
            <div className="card p-7 mb-6">
                <div className="flex items-start gap-5 flex-wrap">
                    <div
                        className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center shrink-0 ${
                            attempt.passed
                                ? 'bg-accent-50 dark:bg-accent-950/50'
                                : 'bg-red-50 dark:bg-red-950/40'
                        }`}
                    >
                        <span
                            className={`text-2xl font-bold font-display ${
                                attempt.passed
                                    ? 'text-accent-600 dark:text-accent-400'
                                    : 'text-red-600 dark:text-red-400'
                            }`}
                        >
                            {score.toFixed(0)}%
                        </span>
                    </div>

                    <div className="flex-1 min-w-[220px]">
                        <h1 className="text-xl font-bold font-display text-surface-900 dark:text-white">
                            {attempt.passed ? 'Passed' : 'Not passed yet'}
                        </h1>
                        <p className="text-surface-500 mt-1">
                            {attempt.points_earned} of {attempt.points_possible} points · pass mark{' '}
                            {quiz.passing_score}%
                        </p>

                        {attempt.awaiting_review && (
                            <p className="inline-flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 mt-3">
                                <Clock3 className="w-4 h-4" />
                                Written answers are with your instructor — your score may rise once they're marked.
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {attemptsRemaining > 0 && !attempt.passed && (
                            <Link href={route('quiz.show', quiz.id)} className="btn-primary">
                                <RotateCw className="w-4 h-4" />
                                Try again
                            </Link>
                        )}
                        <Link href={route('learn.show', quiz.course.slug)} className="btn-secondary">
                            Back to course
                        </Link>
                    </div>
                </div>
            </div>

            {/* Per-question breakdown */}
            <div className="space-y-4">
                {questions.map((question, i) => (
                    <div key={question.id} className="card p-6">
                        <div className="flex items-start gap-3">
                            {question.is_correct === null ? (
                                <Clock3 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            ) : question.is_correct ? (
                                <CheckCircle2 className="w-5 h-5 text-accent-500 shrink-0 mt-0.5" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            )}

                            <div className="flex-1 min-w-0">
                                <div className="text-xs uppercase tracking-wider text-surface-400 font-semibold mb-1">
                                    Question {i + 1}
                                </div>
                                <p className="text-surface-900 dark:text-white font-medium leading-relaxed whitespace-pre-line">
                                    {question.body}
                                </p>

                                <dl className="mt-4 space-y-2 text-sm">
                                    <div className="flex gap-2">
                                        <dt className="text-surface-400 shrink-0">Your answer:</dt>
                                        <dd className="text-surface-700 dark:text-surface-200 whitespace-pre-line">
                                            {describeAnswer(question, question.given_answer)}
                                        </dd>
                                    </div>

                                    {question.is_correct === false && question.correct_answer != null && (
                                        <div className="flex gap-2">
                                            <dt className="text-surface-400 shrink-0">Correct answer:</dt>
                                            <dd className="text-accent-600 dark:text-accent-400">
                                                {describeAnswer(question, question.correct_answer)}
                                            </dd>
                                        </div>
                                    )}
                                </dl>

                                {question.explanation && (
                                    <p className="text-sm text-surface-500 mt-3 pt-3 border-t border-surface-100 dark:border-surface-800 leading-relaxed">
                                        {question.explanation}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </DashboardLayout>
    );
}
