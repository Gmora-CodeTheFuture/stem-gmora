import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, Download, FileUp, Github, Link2, Lock } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

type SubmissionType = 'file' | 'repo' | 'link';

interface Props extends PageProps {
    assignment: {
        id: string;
        title: string;
        description?: string;
        deadline_at: string | null;
        max_marks: number;
        rubric?: { criteria?: Array<{ name: string; max_marks: number; description: string }> } | null;
        course?: { id: string; title: string; slug: string };
        is_overdue: boolean;
    };
    submission: {
        id: string;
        type: SubmissionType;
        file_url?: string | null;
        repo_url?: string | null;
        link_url?: string | null;
        notes?: string | null;
        status: 'pending' | 'graded' | 'returned';
        marks_awarded: number | null;
        feedback: string | null;
        graded_at: string | null;
        created_at: string;
    } | null;
}

const options: Array<{ value: SubmissionType; label: string; icon: typeof FileUp }> = [
    { value: 'file', label: 'Upload a file', icon: FileUp },
    { value: 'repo', label: 'GitHub repository', icon: Github },
    { value: 'link', label: 'External link', icon: Link2 },
];

export default function AssignmentDetail({ assignment, submission }: Props) {
    const locked = submission?.status === 'graded';
    const [type, setType] = useState<SubmissionType>(submission?.type ?? 'file');

    const form = useForm<{
        type: SubmissionType;
        file: File | null;
        repo_url: string;
        link_url: string;
        notes: string;
    }>({
        type: submission?.type ?? 'file',
        file: null,
        repo_url: submission?.repo_url ?? '',
        link_url: submission?.link_url ?? '',
        notes: submission?.notes ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('assignments.submit', assignment.id), { forceFormData: true });
    };

    const choose = (value: SubmissionType) => {
        setType(value);
        form.setData('type', value);
    };

    return (
        <DashboardLayout header={assignment.title}>
            <Head title={`${assignment.title} — Gmora STEM`} />

            <Link
                href={route('dashboard.assignments')}
                className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Assignments
            </Link>

            <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
                <div className="space-y-6">
                    <div className="card p-7">
                        <div className="text-xs uppercase tracking-wider text-primary-500 font-semibold mb-1.5">
                            {assignment.course?.title}
                        </div>
                        <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">
                            {assignment.title}
                        </h1>

                        {assignment.deadline_at && (
                            <p
                                className={`inline-flex items-center gap-1.5 text-sm mt-2 ${
                                    assignment.is_overdue ? 'text-red-500' : 'text-surface-500'
                                }`}
                            >
                                <Clock className="w-4 h-4" />
                                Due{' '}
                                {new Date(assignment.deadline_at).toLocaleString(undefined, {
                                    dateStyle: 'full',
                                    timeStyle: 'short',
                                })}
                            </p>
                        )}

                        {assignment.description && (
                            <p className="text-surface-600 dark:text-surface-300 leading-relaxed whitespace-pre-line mt-5">
                                {assignment.description}
                            </p>
                        )}
                    </div>

                    {/* Submission form */}
                    <div className="card p-7">
                        <h2 className="font-semibold text-surface-900 dark:text-white mb-1">
                            {submission ? 'Update your submission' : 'Submit your work'}
                        </h2>

                        {locked ? (
                            <p className="inline-flex items-center gap-2 text-sm text-surface-500 mt-3">
                                <Lock className="w-4 h-4" />
                                This submission has been graded and can no longer be changed.
                            </p>
                        ) : (
                            <form onSubmit={submit} className="mt-5 space-y-5">
                                <div className="grid sm:grid-cols-3 gap-3">
                                    {options.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => choose(option.value)}
                                            className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-sm transition-colors ${
                                                type === option.value
                                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300'
                                                    : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-primary-300'
                                            }`}
                                        >
                                            <option.icon className="w-4 h-4 shrink-0" />
                                            {option.label}
                                        </button>
                                    ))}
                                </div>

                                {type === 'file' && (
                                    <div>
                                        <label htmlFor="file" className="block text-sm font-medium mb-1.5">
                                            File
                                        </label>
                                        <input
                                            id="file"
                                            type="file"
                                            onChange={(e) => form.setData('file', e.target.files?.[0] ?? null)}
                                            className="input"
                                        />
                                        <p className="text-xs text-surface-400 mt-1.5">
                                            PDF, ZIP, images, documents, or notebooks — up to 20 MB.
                                        </p>
                                        {form.errors.file && (
                                            <p className="text-sm text-red-500 mt-1.5">{form.errors.file}</p>
                                        )}
                                    </div>
                                )}

                                {type === 'repo' && (
                                    <div>
                                        <label htmlFor="repo_url" className="block text-sm font-medium mb-1.5">
                                            Repository URL
                                        </label>
                                        <input
                                            id="repo_url"
                                            type="url"
                                            value={form.data.repo_url}
                                            onChange={(e) => form.setData('repo_url', e.target.value)}
                                            placeholder="https://github.com/you/project"
                                            className="input"
                                        />
                                        {form.errors.repo_url && (
                                            <p className="text-sm text-red-500 mt-1.5">{form.errors.repo_url}</p>
                                        )}
                                    </div>
                                )}

                                {type === 'link' && (
                                    <div>
                                        <label htmlFor="link_url" className="block text-sm font-medium mb-1.5">
                                            Link
                                        </label>
                                        <input
                                            id="link_url"
                                            type="url"
                                            value={form.data.link_url}
                                            onChange={(e) => form.setData('link_url', e.target.value)}
                                            placeholder="https://…"
                                            className="input"
                                        />
                                        {form.errors.link_url && (
                                            <p className="text-sm text-red-500 mt-1.5">{form.errors.link_url}</p>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="notes" className="block text-sm font-medium mb-1.5">
                                        Notes for your instructor <span className="text-surface-400">(optional)</span>
                                    </label>
                                    <textarea
                                        id="notes"
                                        rows={4}
                                        value={form.data.notes}
                                        onChange={(e) => form.setData('notes', e.target.value)}
                                        className="input"
                                    />
                                </div>

                                <button type="submit" disabled={form.processing} className="btn-primary">
                                    {form.processing ? 'Submitting…' : submission ? 'Resubmit' : 'Submit'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <aside className="space-y-6">
                    {submission && (
                        <div className="card p-6">
                            <h2 className="font-semibold text-surface-900 dark:text-white mb-3">Your submission</h2>

                            <p className="text-sm text-surface-500">
                                Sent{' '}
                                {new Date(submission.created_at).toLocaleString(undefined, {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                })}
                            </p>

                            {submission.type === 'file' && submission.file_url && (
                                <a
                                    href={route('submissions.download', submission.id)}
                                    className="btn-secondary w-full mt-4 text-sm py-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Download your file
                                </a>
                            )}

                            {submission.repo_url && (
                                <a
                                    href={submission.repo_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block text-sm text-primary-600 hover:text-primary-500 mt-3 break-all"
                                >
                                    {submission.repo_url}
                                </a>
                            )}

                            {submission.link_url && (
                                <a
                                    href={submission.link_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block text-sm text-primary-600 hover:text-primary-500 mt-3 break-all"
                                >
                                    {submission.link_url}
                                </a>
                            )}

                            {submission.status === 'graded' && (
                                <div className="mt-5 pt-5 border-t border-surface-100 dark:border-surface-800">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-accent-500" />
                                        <span className="text-xl font-semibold text-surface-900 dark:text-white">
                                            {submission.marks_awarded}
                                            <span className="text-sm text-surface-400 font-normal">
                                                {' '}
                                                / {assignment.max_marks}
                                            </span>
                                        </span>
                                    </div>

                                    {submission.feedback && (
                                        <p className="text-sm text-surface-600 dark:text-surface-300 mt-3 leading-relaxed whitespace-pre-line">
                                            {submission.feedback}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {assignment.rubric?.criteria && (
                        <div className="card p-6">
                            <h2 className="font-semibold text-surface-900 dark:text-white mb-4">
                                How this is marked
                            </h2>
                            <ul className="space-y-4">
                                {assignment.rubric.criteria.map((criterion) => (
                                    <li key={criterion.name}>
                                        <div className="flex items-baseline justify-between gap-3">
                                            <span className="text-sm font-medium text-surface-900 dark:text-white">
                                                {criterion.name}
                                            </span>
                                            <span className="text-xs text-surface-400 shrink-0">
                                                {criterion.max_marks} marks
                                            </span>
                                        </div>
                                        <p className="text-xs text-surface-500 mt-1 leading-relaxed">
                                            {criterion.description}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </aside>
            </div>
        </DashboardLayout>
    );
}
