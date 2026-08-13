import { Head, router } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Clock, Save } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps, Question, QuizAnswer } from '@/types';

interface Props extends PageProps {
    quiz: { id: string; title: string; time_limit_seconds: number | null; passing_score: number };
    attempt: {
        id: string;
        answers: Record<string, QuizAnswer>;
        started_at: string;
        deadline: string | null;
    };
    questions: Question[];
}

const AUTOSAVE_MS = 5_000;

function secondsLeft(deadline: string | null): number | null {
    if (!deadline) return null;

    return Math.max(Math.floor((new Date(deadline).getTime() - Date.now()) / 1000), 0);
}

function formatClock(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function QuizAttempt({ quiz, attempt, questions }: Props) {
    const [answers, setAnswers] = useState<Record<string, QuizAnswer>>(attempt.answers ?? {});
    const [index, setIndex] = useState(0);
    const [remaining, setRemaining] = useState<number | null>(secondsLeft(attempt.deadline));
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const dirtyRef = useRef(false);
    const submittedRef = useRef(false);
    const answersRef = useRef(answers);
    answersRef.current = answers;

    const current = questions[index];
    const answeredCount = useMemo(
        () => questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== '').length,
        [answers, questions],
    );

    const setAnswer = (questionId: string, value: QuizAnswer) => {
        dirtyRef.current = true;
        setAnswers((previous) => ({ ...previous, [questionId]: value }));
    };

    const submit = useCallback(() => {
        if (submittedRef.current) return;
        submittedRef.current = true;
        setSubmitting(true);

        router.post(route('quiz.submit', attempt.id), { answers: answersRef.current });
    }, [attempt.id]);

    /* Autosave: keeps answers durable if the tab dies mid-attempt. */
    useEffect(() => {
        const interval = window.setInterval(() => {
            if (!dirtyRef.current || submittedRef.current) return;

            dirtyRef.current = false;
            setSaving(true);

            router.patch(
                route('quiz.save', attempt.id),
                { answers: answersRef.current },
                {
                    preserveScroll: true,
                    preserveState: true,
                    only: [],
                    onFinish: () => setSaving(false),
                },
            );
        }, AUTOSAVE_MS);

        return () => window.clearInterval(interval);
    }, [attempt.id]);

    /* Countdown; hitting zero submits whatever is on screen. */
    useEffect(() => {
        if (attempt.deadline === null) return;

        const interval = window.setInterval(() => {
            const left = secondsLeft(attempt.deadline);
            setRemaining(left);

            if (left !== null && left <= 0) {
                window.clearInterval(interval);
                submit();
            }
        }, 1000);

        return () => window.clearInterval(interval);
    }, [attempt.deadline, submit]);

    const lowOnTime = remaining !== null && remaining <= 60;

    return (
        <DashboardLayout header={quiz.title}>
            <Head title={`${quiz.title} — attempt`} />

            {/* Status bar */}
            <div className="card p-4 mb-5 flex items-center gap-4 flex-wrap">
                <div className="text-sm text-surface-600 dark:text-surface-300">
                    Question <span className="font-semibold">{index + 1}</span> of {questions.length}
                </div>

                <div className="text-sm text-surface-400">{answeredCount} answered</div>

                {saving && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-surface-400">
                        <Save className="w-3.5 h-3.5" />
                        Saving…
                    </span>
                )}

                {remaining !== null && (
                    <div
                        className={`ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-sm font-semibold ${
                            lowOnTime
                                ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400'
                                : 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-200'
                        }`}
                        role="timer"
                        aria-live={lowOnTime ? 'assertive' : 'off'}
                    >
                        <Clock className="w-4 h-4" />
                        {formatClock(remaining)}
                    </div>
                )}
            </div>

            <div className="grid lg:grid-cols-[1fr_220px] gap-5 items-start">
                <div className="card p-7">
                    <div className="text-xs uppercase tracking-wider text-primary-500 font-semibold mb-3">
                        {current.points} point{current.points === 1 ? '' : 's'}
                    </div>

                    <h2 className="text-lg font-semibold text-surface-900 dark:text-white leading-relaxed whitespace-pre-line">
                        {current.body}
                    </h2>

                    <div className="mt-6">
                        <AnswerInput
                            question={current}
                            value={answers[current.id]}
                            onChange={(value) => setAnswer(current.id, value)}
                        />
                    </div>

                    <div className="flex items-center gap-3 mt-8 pt-6 border-t border-surface-100 dark:border-surface-800">
                        <button
                            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                            disabled={index === 0}
                            className="btn-ghost px-4 py-2 text-sm disabled:opacity-40"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </button>

                        {index < questions.length - 1 ? (
                            <button
                                onClick={() => setIndex((i) => Math.min(i + 1, questions.length - 1))}
                                className="btn-secondary px-4 py-2 text-sm"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button onClick={submit} disabled={submitting} className="btn-primary px-5 py-2 text-sm">
                                <Check className="w-4 h-4" />
                                {submitting ? 'Submitting…' : 'Submit quiz'}
                            </button>
                        )}

                        {answeredCount < questions.length && index === questions.length - 1 && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {questions.length - answeredCount} unanswered
                            </span>
                        )}
                    </div>
                </div>

                {/* Question navigator */}
                <aside className="card p-4">
                    <h3 className="text-xs uppercase tracking-wider text-surface-400 font-semibold mb-3">Questions</h3>
                    <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
                        {questions.map((question, i) => {
                            const answered = answers[question.id] !== undefined && answers[question.id] !== '';

                            return (
                                <button
                                    key={question.id}
                                    onClick={() => setIndex(i)}
                                    aria-label={`Go to question ${i + 1}${answered ? ', answered' : ''}`}
                                    className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                                        i === index
                                            ? 'bg-primary-600 text-white'
                                            : answered
                                              ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300'
                                              : 'bg-surface-100 text-surface-500 dark:bg-surface-800'
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>

                    <button onClick={submit} disabled={submitting} className="btn-primary w-full mt-5 text-sm py-2">
                        Submit quiz
                    </button>
                </aside>
            </div>
        </DashboardLayout>
    );
}

function AnswerInput({
    question,
    value,
    onChange,
}: {
    question: Question;
    value: QuizAnswer | undefined;
    onChange: (value: QuizAnswer) => void;
}) {
    if (question.type === 'mcq' || question.type === 'true_false') {
        const selected = Array.isArray(value) ? value : [];

        return (
            <div className="space-y-2.5">
                {question.options.map((option) => {
                    const isSelected = selected.includes(option.index);

                    return (
                        <label
                            key={option.index}
                            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                                isSelected
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40'
                                    : 'border-surface-200 dark:border-surface-700 hover:border-primary-300'
                            }`}
                        >
                            <input
                                type="radio"
                                name={question.id}
                                checked={isSelected}
                                onChange={() => onChange([option.index])}
                                className="mt-0.5 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-surface-800 dark:text-surface-100">{option.text}</span>
                        </label>
                    );
                })}
            </div>
        );
    }

    if (question.type === 'fill_blank') {
        return (
            <input
                type="text"
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Type your answer"
                aria-label="Your answer"
                className="input max-w-md"
            />
        );
    }

    if (question.type === 'ordering') {
        const order = Array.isArray(value) ? value : question.options.map((option) => option.index);

        const move = (position: number, delta: number) => {
            const next = [...order];
            const target = position + delta;
            if (target < 0 || target >= next.length) return;
            [next[position], next[target]] = [next[target], next[position]];
            onChange(next);
        };

        return (
            <ol className="space-y-2">
                {order.map((optionIndex, position) => {
                    const option = question.options.find((o) => o.index === optionIndex);

                    return (
                        <li
                            key={optionIndex}
                            className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 dark:border-surface-700"
                        >
                            <span className="w-6 h-6 rounded-md bg-surface-100 dark:bg-surface-800 text-xs font-semibold flex items-center justify-center shrink-0">
                                {position + 1}
                            </span>
                            <span className="flex-1 text-surface-800 dark:text-surface-100">{option?.text}</span>
                            <button
                                onClick={() => move(position, -1)}
                                aria-label="Move up"
                                className="p-1.5 text-surface-400 hover:text-primary-600"
                            >
                                <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => move(position, 1)}
                                aria-label="Move down"
                                className="p-1.5 text-surface-400 hover:text-primary-600"
                            >
                                <ArrowDown className="w-4 h-4" />
                            </button>
                        </li>
                    );
                })}
            </ol>
        );
    }

    if (question.type === 'matching') {
        const pairs = typeof value === 'object' && !Array.isArray(value) ? value : {};

        return (
            <div className="space-y-3">
                {question.options.map((option) => (
                    <div key={option.index} className="flex items-center gap-3">
                        <span className="flex-1 text-surface-800 dark:text-surface-100">{option.text}</span>
                        <input
                            type="text"
                            value={pairs[String(option.index)] ?? ''}
                            onChange={(e) => onChange({ ...pairs, [String(option.index)]: e.target.value })}
                            aria-label={`Match for ${option.text}`}
                            className="input max-w-xs"
                        />
                    </div>
                ))}
            </div>
        );
    }

    // essay and code — graded by an instructor, never auto-scored.
    return (
        <div>
            <textarea
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange(e.target.value)}
                rows={question.type === 'code' ? 14 : 8}
                aria-label="Your answer"
                className={`input ${question.type === 'code' ? 'font-mono text-sm' : ''}`}
            />
            <p className="text-xs text-surface-400 mt-2">
                This question is marked by your instructor, so your score updates once they review it.
            </p>
        </div>
    );
}
