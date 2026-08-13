import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import {
    AlertTriangle, ClipboardCheck, Download, ExternalLink, FileText, Github, HelpCircle,
} from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

interface SubmissionRow {
    id: string;
    type: 'file' | 'repo' | 'link';
    repo_url?: string | null;
    link_url?: string | null;
    notes?: string | null;
    status: 'pending' | 'returned';
    created_at: string;
    has_file: boolean;
    student?: { id: string; full_name: string; email: string };
    assignment: {
        id: string;
        title: string;
        max_marks: number;
        deadline_at: string | null;
        course?: { id: string; title: string };
    };
    is_late: boolean;
}

interface AttemptRow {
    id: string;
    score: number | null;
    points_earned: number;
    points_possible: number;
    submitted_at: string | null;
    student?: { id: string; full_name: string };
    quiz: { id: string; title: string; passing_score: number; course?: { id: string; title: string } };
    manual_answers: Array<{ id: string; type: string; body: string; points: number; answer: unknown }>;
}

interface Props extends PageProps {
    submissions: SubmissionRow[];
    quizAttempts: AttemptRow[];
}

export default function Grading({ submissions, quizAttempts }: Props) {
    const [tab, setTab] = useState<'assignments' | 'quizzes'>('assignments');

    const tabs = [
        { key: 'assignments' as const, label: 'Assignments', count: submissions.length, icon: ClipboardCheck },
        { key: 'quizzes' as const, label: 'Written answers', count: quizAttempts.length, icon: HelpCircle },
    ];

    return (
        <DashboardLayout header="Grading queue">
            <Head title="Grading — Gmora STEM" />

            <div className="flex items-center gap-2 mb-6">
                {tabs.map((item) => (
                    <button
                        key={item.key}
                        onClick={() => setTab(item.key)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                            tab === item.key
                                ? 'bg-primary-600 text-white'
                                : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
                        }`}
                    >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                        <span
                            className={`px-1.5 py-0.5 rounded-md text-xs ${
                                tab === item.key ? 'bg-white/20' : 'bg-surface-200 dark:bg-surface-700'
                            }`}
                        >
                            {item.count}
                        </span>
                    </button>
                ))}
            </div>

            {tab === 'assignments' ? (
                submissions.length === 0 ? (
                    <EmptyQueue message="No submissions waiting to be marked." />
                ) : (
                    <div className="space-y-4">
                        {submissions.map((submission) => (
                            <SubmissionCard key={submission.id} submission={submission} />
                        ))}
                    </div>
                )
            ) : quizAttempts.length === 0 ? (
                <EmptyQueue message="No written quiz answers waiting for review." />
            ) : (
                <div className="space-y-4">
                    {quizAttempts.map((attempt) => (
                        <AttemptCard key={attempt.id} attempt={attempt} />
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}

function EmptyQueue({ message }: { message: string }) {
    return (
        <div className="card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent-50 dark:bg-accent-950/50 flex items-center justify-center mx-auto mb-4">
                <ClipboardCheck className="w-8 h-8 text-accent-500" />
            </div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-1.5">All caught up</h2>
            <p className="text-surface-500">{message}</p>
        </div>
    );
}

function SubmissionCard({ submission }: { submission: SubmissionRow }) {
    const form = useForm({
        marks_awarded: '',
        feedback: '',
        status: 'graded' as 'graded' | 'returned',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.patch(route('instructor.grade-submission', submission.id), { preserveScroll: true });
    };

    return (
        <div className="card p-6">
            <div className="flex items-start gap-4 flex-wrap mb-5">
                <div className="flex-1 min-w-[220px]">
                    <div className="text-xs uppercase tracking-wider text-primary-500 font-semibold mb-1">
                        {submission.assignment.course?.title}
                    </div>
                    <h2 className="font-semibold text-surface-900 dark:text-white">
                        {submission.assignment.title}
                    </h2>
                    <p className="text-sm text-surface-500 mt-1">
                        {submission.student?.full_name} ·{' '}
                        {new Date(submission.created_at).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                        })}
                    </p>
                </div>

                {submission.is_late && (
                    <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        <AlertTriangle className="w-3 h-3" />
                        Late
                    </span>
                )}
            </div>

            {/* The work itself */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
                {submission.has_file && (
                    <a
                        href={route('submissions.download', submission.id)}
                        className="btn-secondary px-4 py-2 text-sm"
                    >
                        <Download className="w-4 h-4" />
                        Download file
                    </a>
                )}
                {submission.repo_url && (
                    <a
                        href={submission.repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary px-4 py-2 text-sm"
                    >
                        <Github className="w-4 h-4" />
                        Repository
                    </a>
                )}
                {submission.link_url && (
                    <a
                        href={submission.link_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary px-4 py-2 text-sm"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Open link
                    </a>
                )}
            </div>

            {submission.notes && (
                <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 mb-5">
                    <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-surface-400 font-semibold mb-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        Student notes
                    </div>
                    <p className="text-sm text-surface-600 dark:text-surface-300 whitespace-pre-line leading-relaxed">
                        {submission.notes}
                    </p>
                </div>
            )}

            <form
                onSubmit={submit}
                className="grid sm:grid-cols-[120px_1fr_auto] gap-3 items-start pt-5 border-t border-surface-100 dark:border-surface-800"
            >
                <div>
                    <label htmlFor={`marks-${submission.id}`} className="block text-xs font-medium mb-1.5">
                        Marks / {submission.assignment.max_marks}
                    </label>
                    <input
                        id={`marks-${submission.id}`}
                        type="number"
                        min={0}
                        max={submission.assignment.max_marks}
                        required
                        value={form.data.marks_awarded}
                        onChange={(e) => form.setData('marks_awarded', e.target.value)}
                        className="input py-2"
                    />
                    {form.errors.marks_awarded && (
                        <p className="text-xs text-red-500 mt-1">{form.errors.marks_awarded}</p>
                    )}
                </div>

                <div>
                    <label htmlFor={`feedback-${submission.id}`} className="block text-xs font-medium mb-1.5">
                        Feedback
                    </label>
                    <textarea
                        id={`feedback-${submission.id}`}
                        rows={3}
                        value={form.data.feedback}
                        onChange={(e) => form.setData('feedback', e.target.value)}
                        className="input py-2"
                    />
                </div>

                <div className="flex flex-col gap-2 sm:pt-6">
                    <button type="submit" disabled={form.processing} className="btn-primary px-4 py-2 text-sm">
                        Record grade
                    </button>
                    <button
                        type="button"
                        disabled={form.processing}
                        onClick={() =>
                            router.patch(
                                route('instructor.grade-submission', submission.id),
                                { ...form.data, status: 'returned' },
                                { preserveScroll: true },
                            )
                        }
                        className="btn-ghost px-4 py-2 text-sm"
                    >
                        Return for changes
                    </button>
                </div>
            </form>
        </div>
    );
}

function AttemptCard({ attempt }: { attempt: AttemptRow }) {
    const form = useForm({ points_earned: String(attempt.points_earned) });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.patch(route('instructor.grade-attempt', attempt.id), { preserveScroll: true });
    };

    return (
        <div className="card p-6">
            <div className="mb-5">
                <div className="text-xs uppercase tracking-wider text-primary-500 font-semibold mb-1">
                    {attempt.quiz.course?.title}
                </div>
                <h2 className="font-semibold text-surface-900 dark:text-white">{attempt.quiz.title}</h2>
                <p className="text-sm text-surface-500 mt-1">
                    {attempt.student?.full_name} · auto-scored {attempt.points_earned}/{attempt.points_possible}{' '}
                    points
                </p>
            </div>

            <div className="space-y-4 mb-5">
                {attempt.manual_answers.map((question) => (
                    <div key={question.id} className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                        <p className="text-sm font-medium text-surface-900 dark:text-white mb-2">{question.body}</p>
                        <p
                            className={`text-sm text-surface-600 dark:text-surface-300 whitespace-pre-line leading-relaxed ${
                                question.type === 'code' ? 'font-mono' : ''
                            }`}
                        >
                            {typeof question.answer === 'string' && question.answer.trim() !== ''
                                ? question.answer
                                : 'No answer given.'}
                        </p>
                        <div className="text-xs text-surface-400 mt-2">Worth {question.points} points</div>
                    </div>
                ))}
            </div>

            <form
                onSubmit={submit}
                className="flex items-end gap-3 pt-5 border-t border-surface-100 dark:border-surface-800"
            >
                <div className="w-40">
                    <label htmlFor={`points-${attempt.id}`} className="block text-xs font-medium mb-1.5">
                        Total points / {attempt.points_possible}
                    </label>
                    <input
                        id={`points-${attempt.id}`}
                        type="number"
                        min={0}
                        max={attempt.points_possible}
                        required
                        value={form.data.points_earned}
                        onChange={(e) => form.setData('points_earned', e.target.value)}
                        className="input py-2"
                    />
                    {form.errors.points_earned && (
                        <p className="text-xs text-red-500 mt-1">{form.errors.points_earned}</p>
                    )}
                </div>

                <button type="submit" disabled={form.processing} className="btn-primary px-4 py-2 text-sm">
                    Finalise score
                </button>
            </form>
        </div>
    );
}
