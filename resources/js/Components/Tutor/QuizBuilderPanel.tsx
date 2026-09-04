import { FormEventHandler, useState } from 'react';
import { router } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import { AuthorQuestion, Quiz } from '@/types';

const QUESTION_TYPES = [
    { value: 'mcq', label: 'Multiple choice' },
    { value: 'true_false', label: 'True / False' },
    { value: 'fill_blank', label: 'Fill in the blank' },
    { value: 'ordering', label: 'Ordering' },
    { value: 'essay', label: 'Essay' },
    { value: 'code', label: 'Code' },
] as const;

type OptionDraft = { text: string; is_correct: boolean };

export default function QuizBuilderPanel({ quiz }: { quiz: Quiz }) {
    const [settings, setSettings] = useState({
        title: quiz.title,
        description: quiz.description ?? '',
        time_limit_seconds: quiz.time_limit_seconds ?? 600,
        max_attempts: quiz.max_attempts,
        passing_score: quiz.passing_score,
        shuffle_questions: quiz.shuffle_questions,
        is_published: quiz.is_published,
    });

    const [question, setQuestion] = useState({
        type: 'mcq' as string,
        body: '',
        points: 1,
        explanation: '',
        fillAnswer: '',
        options: [
            { text: '', is_correct: true },
            { text: '', is_correct: false },
        ] as OptionDraft[],
    });

    const saveSettings: FormEventHandler = (e) => {
        e.preventDefault();
        router.patch(`/tutor/quizzes/${quiz.id}`, settings, { preserveScroll: true });
    };

    const addOption = () =>
        setQuestion((q) => ({
            ...q,
            options: [...q.options, { text: '', is_correct: false }],
        }));

    const addQuestion: FormEventHandler = (e) => {
        e.preventDefault();

        const payload: Record<string, unknown> = {
            type: question.type,
            body: question.body,
            points: question.points,
            explanation: question.explanation || null,
        };

        if (question.type === 'mcq' || question.type === 'true_false' || question.type === 'ordering') {
            payload.options = question.options.map((o) => ({
                text: o.text,
                is_correct: o.is_correct,
            }));
        }

        if (question.type === 'fill_blank') {
            payload.correct_answer = question.fillAnswer;
            payload.options = [];
        }

        if (question.type === 'essay' || question.type === 'code') {
            payload.options = [];
            payload.correct_answer = null;
        }

        router.post(`/tutor/quizzes/${quiz.id}/questions`, payload, {
            preserveScroll: true,
            onSuccess: () =>
                setQuestion({
                    type: 'mcq',
                    body: '',
                    points: 1,
                    explanation: '',
                    fillAnswer: '',
                    options: [
                        { text: '', is_correct: true },
                        { text: '', is_correct: false },
                    ],
                }),
        });
    };

    const removeQuestion = (id: string) => {
        if (confirm('Delete this question?')) {
            router.delete(`/tutor/questions/${id}`, { preserveScroll: true });
        }
    };

    const needsOptions = ['mcq', 'true_false', 'ordering'].includes(question.type);

    return (
        <div className="space-y-4 p-3 rounded-lg bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
            <form onSubmit={saveSettings} className="space-y-3">
                <h5 className="text-sm font-semibold text-surface-900 dark:text-white">Quiz settings</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                        <InputLabel value="Quiz title" />
                        <TextInput className="mt-1 block w-full" value={settings.title} onChange={(e) => setSettings({ ...settings, title: e.target.value })} required />
                    </div>
                    <div>
                        <InputLabel value="Passing score %" />
                        <TextInput type="number" min={0} max={100} className="mt-1 block w-full" value={settings.passing_score} onChange={(e) => setSettings({ ...settings, passing_score: Number(e.target.value) })} />
                    </div>
                    <div>
                        <InputLabel value="Max attempts" />
                        <TextInput type="number" min={1} max={20} className="mt-1 block w-full" value={settings.max_attempts} onChange={(e) => setSettings({ ...settings, max_attempts: Number(e.target.value) })} />
                    </div>
                    <div>
                        <InputLabel value="Time limit (seconds)" />
                        <TextInput type="number" min={0} className="mt-1 block w-full" value={settings.time_limit_seconds} onChange={(e) => setSettings({ ...settings, time_limit_seconds: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="flex flex-col gap-2 justify-end pb-1">
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={settings.shuffle_questions} onChange={(e) => setSettings({ ...settings, shuffle_questions: e.target.checked })} className="rounded text-primary-600" />
                            Shuffle questions
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={settings.is_published} onChange={(e) => setSettings({ ...settings, is_published: e.target.checked })} className="rounded text-primary-600" />
                            Quiz published (required to publish lesson)
                        </label>
                    </div>
                </div>
                <PrimaryButton type="submit">Save quiz settings</PrimaryButton>
            </form>

            <div className="border-t border-surface-200 dark:border-surface-700 pt-3 space-y-2">
                <h5 className="text-sm font-semibold">Questions ({quiz.questions?.length ?? 0})</h5>
                {(quiz.questions ?? []).map((q: AuthorQuestion) => (
                    <div key={q.id} className="flex items-start justify-between gap-2 p-2 rounded-md bg-surface-50 dark:bg-surface-800 text-sm">
                        <div>
                            <span className="text-[10px] uppercase tracking-wide text-surface-500 mr-2">{q.type}</span>
                            <span className="font-medium">{q.body}</span>
                            <span className="text-surface-500 ml-2">({q.points} pts)</span>
                        </div>
                        <button type="button" onClick={() => removeQuestion(q.id)} className="btn-icon text-red-500 shrink-0" aria-label="Delete question">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            <form onSubmit={addQuestion} className="border-t border-surface-200 dark:border-surface-700 pt-3 space-y-3">
                <h5 className="text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Add question</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <InputLabel value="Type" />
                        <select
                            value={question.type}
                            onChange={(e) => {
                                const type = e.target.value;
                                setQuestion({
                                    ...question,
                                    type,
                                    options: type === 'true_false'
                                        ? [{ text: 'True', is_correct: true }, { text: 'False', is_correct: false }]
                                        : [{ text: '', is_correct: true }, { text: '', is_correct: false }],
                                });
                            }}
                            className="mt-1 block w-full border-surface-300 dark:border-surface-700 dark:bg-surface-900 rounded-md"
                        >
                            {QUESTION_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <InputLabel value="Points" />
                        <TextInput type="number" min={1} className="mt-1 block w-full" value={question.points} onChange={(e) => setQuestion({ ...question, points: Number(e.target.value) })} />
                    </div>
                </div>
                <div>
                    <InputLabel value="Question" />
                    <textarea className="mt-1 block w-full rounded-md border-surface-300 dark:border-surface-700 dark:bg-surface-900 text-sm" rows={2} value={question.body} onChange={(e) => setQuestion({ ...question, body: e.target.value })} required />
                </div>

                {needsOptions && (
                    <div className="space-y-2">
                        <InputLabel value={question.type === 'ordering' ? 'Items (correct order top to bottom)' : 'Options'} />
                        {question.options.map((opt, index) => (
                            <div key={index} className="flex items-center gap-2">
                                {question.type !== 'ordering' && (
                                    <input
                                        type="checkbox"
                                        checked={opt.is_correct}
                                        onChange={(e) => {
                                            const options = [...question.options];
                                            options[index] = { ...opt, is_correct: e.target.checked };
                                            setQuestion({ ...question, options });
                                        }}
                                        title="Correct"
                                        className="rounded text-primary-600"
                                    />
                                )}
                                <TextInput
                                    className="block w-full"
                                    value={opt.text}
                                    onChange={(e) => {
                                        const options = [...question.options];
                                        options[index] = { ...opt, text: e.target.value };
                                        setQuestion({ ...question, options });
                                    }}
                                    required
                                    placeholder={`Option ${index + 1}`}
                                />
                            </div>
                        ))}
                        {question.type !== 'true_false' && (
                            <button type="button" onClick={addOption} className="text-xs font-medium text-primary-600">+ Add option</button>
                        )}
                    </div>
                )}

                {question.type === 'fill_blank' && (
                    <div>
                        <InputLabel value="Correct answer" />
                        <TextInput className="mt-1 block w-full" value={question.fillAnswer} onChange={(e) => setQuestion({ ...question, fillAnswer: e.target.value })} required />
                    </div>
                )}

                {(question.type === 'essay' || question.type === 'code') && (
                    <p className="text-xs text-surface-500">Manual grading — the instructor awards marks after submission.</p>
                )}

                <PrimaryButton type="submit">Add question</PrimaryButton>
            </form>
        </div>
    );
}
