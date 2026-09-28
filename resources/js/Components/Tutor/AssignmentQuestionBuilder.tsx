import { FormEventHandler, useState } from 'react';
import { router } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SystemSelect from '@/Components/SystemSelect';
import { Assignment, AssignmentQuestion } from '@/types';

const QUESTION_TYPES = [
    { value: 'mcq', label: 'Multiple choice' },
    { value: 'short_answer', label: 'Short answer' },
    { value: 'normal', label: 'Normal (open text)' },
] as const;

type OptionDraft = { text: string; is_correct: boolean };

type Props = {
    assignment: Assignment & { questions?: AssignmentQuestion[] };
};

const emptyDraft = () => ({
    type: '' as string,
    body: '',
    points: 1,
    fillAnswer: '',
    options: [
        { text: '', is_correct: true },
        { text: '', is_correct: false },
    ] as OptionDraft[],
});

export default function AssignmentQuestionBuilder({ assignment }: Props) {
    const [question, setQuestion] = useState(emptyDraft);
    const [error, setError] = useState<string | null>(null);

    const addOption = () =>
        setQuestion((q) => ({
            ...q,
            options: [...q.options, { text: '', is_correct: false }],
        }));

    const validateClient = (): string | null => {
        if (!question.type) {
            return 'Choose a question type.';
        }
        if (!question.body.trim()) {
            return 'Enter the question text.';
        }
        if (!question.points || question.points < 1) {
            return 'Points must be at least 1.';
        }
        if (question.type === 'mcq') {
            const filled = question.options.filter((o) => o.text.trim());
            if (filled.length < 2) {
                return 'Add at least two options with text.';
            }
            if (!question.options.some((o) => o.is_correct && o.text.trim())) {
                return 'Mark one correct option.';
            }
        }
        if (question.type === 'short_answer' && !question.fillAnswer.trim()) {
            return 'Enter at least one acceptable answer.';
        }
        return null;
    };

    const addQuestion: FormEventHandler = (e) => {
        e.preventDefault();
        const clientError = validateClient();
        if (clientError) {
            setError(clientError);
            return;
        }
        setError(null);

        const payload: Record<string, unknown> = {
            type: question.type,
            body: question.body.trim(),
            points: question.points,
        };

        if (question.type === 'mcq') {
            payload.options = question.options.map((o) => ({
                text: o.text.trim(),
                is_correct: o.is_correct,
            }));
        }

        if (question.type === 'short_answer') {
            payload.correct_answer = question.fillAnswer.trim();
            payload.options = [];
        }

        if (question.type === 'normal') {
            payload.options = [];
            payload.correct_answer = null;
        }

        router.post(`/tutor/assignments/${assignment.id}/questions`, payload, {
            preserveScroll: true,
            onSuccess: () => setQuestion(emptyDraft()),
            onError: (errors) => {
                const first = Object.values(errors)[0];
                setError(typeof first === 'string' ? first : 'Could not add question.');
            },
        });
    };

    const removeQuestion = (id: string) => {
        if (confirm('Delete this question?')) {
            router.delete(`/tutor/assignment-questions/${id}`, { preserveScroll: true });
        }
    };

    const questions = assignment.questions ?? [];

    return (
        <div className="mt-4 space-y-3 border-t border-surface-200 dark:border-surface-700 pt-4">
            <h4 className="text-sm font-semibold text-surface-900 dark:text-white">Questions</h4>

            <p className="text-xs text-surface-500">
                Add at least one complete question (type, text, points
                {questions.length === 0 ? ', and answers where needed' : ''}
                ) before you can publish.
            </p>

            <ul className="space-y-2">
                {questions.map((q, index) => (
                    <li
                        key={q.id}
                        className="flex items-start justify-between gap-2 rounded-lg bg-surface-50 dark:bg-surface-800/50 px-3 py-2"
                    >
                        <div className="min-w-0">
                            <p className="text-xs text-surface-400">
                                Q{index + 1} · {QUESTION_TYPES.find((t) => t.value === q.type)?.label ?? q.type} · {q.points} pts
                            </p>
                            <p className="text-sm text-surface-800 dark:text-surface-100 truncate">{q.body}</p>
                        </div>
                        <button type="button" className="btn-icon text-red-500 shrink-0" onClick={() => removeQuestion(q.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </li>
                ))}
            </ul>

            <form onSubmit={addQuestion} className="space-y-3 rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <InputLabel value="Type *" />
                        <SystemSelect
                            value={question.type || '__none__'}
                            onValueChange={(type) => {
                                if (type === '__none__') {
                                    return;
                                }
                                setError(null);
                                setQuestion({
                                    ...question,
                                    type,
                                    options:
                                        type === 'mcq'
                                            ? [
                                                  { text: '', is_correct: true },
                                                  { text: '', is_correct: false },
                                              ]
                                            : question.options,
                                });
                            }}
                            options={[
                                { value: '__none__', label: 'Select type…' },
                                ...QUESTION_TYPES,
                            ]}
                            placeholder="Select type…"
                            triggerClassName="mt-1 w-full"
                        />
                    </div>
                    <div>
                        <InputLabel value="Points *" />
                        <TextInput
                            type="number"
                            min={1}
                            className="mt-1 block w-full"
                            value={question.points}
                            onChange={(e) => setQuestion({ ...question, points: Number(e.target.value) })}
                            required
                        />
                    </div>
                </div>

                {question.type && (
                    <>
                        <div>
                            <InputLabel value="Question *" />
                            <textarea
                                className="mt-1 block w-full rounded-md border-surface-300 dark:border-surface-700 dark:bg-surface-900 text-sm"
                                rows={2}
                                value={question.body}
                                onChange={(e) => setQuestion({ ...question, body: e.target.value })}
                                required
                            />
                        </div>

                        {question.type === 'mcq' && (
                            <div className="space-y-2">
                                <InputLabel value="Options * (select the correct answer)" />
                                {question.options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name={`correct-${assignment.id}`}
                                            checked={opt.is_correct}
                                            onChange={() =>
                                                setQuestion({
                                                    ...question,
                                                    options: question.options.map((o, j) => ({
                                                        ...o,
                                                        is_correct: j === i,
                                                    })),
                                                })
                                            }
                                            className="text-primary-600"
                                        />
                                        <TextInput
                                            className="block w-full"
                                            value={opt.text}
                                            onChange={(e) => {
                                                const options = [...question.options];
                                                options[i] = { ...options[i], text: e.target.value };
                                                setQuestion({ ...question, options });
                                            }}
                                            placeholder={`Option ${i + 1}`}
                                            required
                                        />
                                    </div>
                                ))}
                                <button type="button" onClick={addOption} className="text-xs text-primary-600 font-medium flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Add option
                                </button>
                            </div>
                        )}

                        {question.type === 'short_answer' && (
                            <div>
                                <InputLabel value="Acceptable answers * (separate with | )" />
                                <TextInput
                                    className="mt-1 block w-full"
                                    value={question.fillAnswer}
                                    onChange={(e) => setQuestion({ ...question, fillAnswer: e.target.value })}
                                    placeholder="hello | Hello World"
                                    required
                                />
                            </div>
                        )}

                        {question.type === 'normal' && (
                            <p className="text-xs text-surface-500">Students write a free-text answer. You grade it manually.</p>
                        )}
                    </>
                )}

                {error && <p className="text-sm text-red-500">{error}</p>}

                <PrimaryButton type="submit" disabled={!question.type}>
                    <Plus className="w-4 h-4" /> Add question
                </PrimaryButton>
            </form>
        </div>
    );
}
