import { FormEventHandler, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { CheckCircle2, Lock } from 'lucide-react';
import PrimaryButton from '@/Components/PrimaryButton';
import { AssignmentQuestion } from '@/types';

type QuestionView = Pick<AssignmentQuestion, 'id' | 'type' | 'body' | 'points' | 'options'>;

type Props = {
    assignment: {
        id: string;
        title: string;
        description?: string | null;
        max_marks: number;
        is_required?: boolean;
        questions: QuestionView[];
        submission?: {
            id: string;
            status: string;
            answers?: Record<string, unknown> | null;
            marks_awarded?: number | null;
            feedback?: string | null;
        } | null;
    };
};

export default function AssignmentAttemptPanel({ assignment }: Props) {
    const locked = assignment.submission?.status === 'graded';
    const questions = assignment.questions ?? [];
    const [answers, setAnswers] = useState<Record<string, unknown>>(() => {
        const existing = assignment.submission?.answers ?? {};
        const init: Record<string, unknown> = {};
        for (const q of questions) {
            init[q.id] = existing[q.id] ?? (q.type === 'mcq' ? [] : '');
        }
        return init;
    });

    const form = useForm({
        type: 'answers' as const,
        answers,
        notes: '',
    });

    const setAnswer = (id: string, value: unknown) => {
        const next = { ...answers, [id]: value };
        setAnswers(next);
        form.setData('answers', next);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.setData('answers', answers);
        form.post(route('assignments.submit', assignment.id), {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['currentAssignment', 'curriculum', 'modules'] });
            },
        });
    };

    if (questions.length === 0) {
        return (
            <div className="card p-6 flex flex-col items-center justify-center min-h-[16rem] text-center">
                <p className="text-surface-500 text-sm mb-4">
                    This assignment has no questions yet. Open it from your Assignments page to submit a file or link.
                </p>
                <a href={route('assignments.show', assignment.id)} className="btn-primary">
                    Open assignment
                </a>
            </div>
        );
    }

    return (
        <div className="card p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[min(60dvh,32rem)]">
            {assignment.submission && (
                <div className="rounded-lg bg-accent-50 dark:bg-accent-900/20 px-3 py-2 text-sm text-accent-800 dark:text-accent-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Submitted
                    {assignment.submission.marks_awarded != null && (
                        <span className="ml-auto font-semibold">
                            {assignment.submission.marks_awarded}/{assignment.max_marks}
                        </span>
                    )}
                </div>
            )}

            {locked ? (
                <p className="inline-flex items-center gap-2 text-sm text-surface-500">
                    <Lock className="w-4 h-4" /> Graded — answers are locked.
                </p>
            ) : (
                <form onSubmit={submit} className="space-y-6">
                    {questions.map((q, index) => (
                        <fieldset key={q.id} className="space-y-2">
                            <legend className="text-sm font-semibold text-surface-900 dark:text-white">
                                Q{index + 1}. {q.body}
                                <span className="ml-2 text-xs font-normal text-surface-400">{q.points} pts</span>
                            </legend>

                            {q.type === 'mcq' && (
                                <div className="space-y-1.5">
                                    {(q.options ?? []).map((opt) => {
                                        const idx = opt.index ?? 0;
                                        const selected = Array.isArray(answers[q.id])
                                            ? (answers[q.id] as number[]).includes(idx)
                                            : false;
                                        return (
                                            <label
                                                key={idx}
                                                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                                                    selected
                                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40'
                                                        : 'border-surface-200 dark:border-surface-700'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`q-${q.id}`}
                                                    checked={selected}
                                                    onChange={() => setAnswer(q.id, [idx])}
                                                    className="text-primary-600"
                                                />
                                                {opt.text}
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {(q.type === 'short_answer' || q.type === 'normal') && (
                                <textarea
                                    className="block w-full rounded-md border-surface-300 dark:border-surface-700 dark:bg-surface-900 text-sm"
                                    rows={q.type === 'normal' ? 4 : 2}
                                    value={String(answers[q.id] ?? '')}
                                    onChange={(e) => setAnswer(q.id, e.target.value)}
                                    required
                                    placeholder={q.type === 'short_answer' ? 'Your answer' : 'Write your response…'}
                                />
                            )}
                        </fieldset>
                    ))}

                    <PrimaryButton disabled={form.processing}>
                        {assignment.submission ? 'Resubmit answers' : 'Submit answers'}
                    </PrimaryButton>
                </form>
            )}
        </div>
    );
}
