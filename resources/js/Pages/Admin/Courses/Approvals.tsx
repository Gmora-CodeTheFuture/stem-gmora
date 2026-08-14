import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, ClipboardList, Clock, Eye, X, XCircle } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

interface Check {
    label: string;
    passed: boolean;
    detail: string;
    manual?: boolean;
}

interface PendingCourse {
    id: string;
    title: string;
    slug: string;
    subtitle?: string;
    category: string;
    difficulty: string;
    price: number | string;
    currency: string;
    total_lessons: number;
    submitted_at: string | null;
    instructor: { id: string; full_name: string; email: string } | null;
    readiness: { checks: Check[]; blocking: number };
}

interface Props extends PageProps {
    pending: PendingCourse[];
    counts: { pending: number; published: number; draft: number };
    recentlyReviewed: Array<{
        id: string;
        title: string;
        status: string;
        reviewed_at: string | null;
        reviewer?: string;
        instructor?: string;
    }>;
}

function when(iso: string | null): string {
    return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown';
}

export default function Approvals({ pending, counts, recentlyReviewed }: Props) {
    const [rejecting, setRejecting] = useState<string | null>(null);
    const form = useForm({ review_notes: '' });

    const reject = (courseId: string): FormEventHandler => (e) => {
        e.preventDefault();
        form.patch(route('admin.approvals.reject', courseId), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setRejecting(null);
            },
        });
    };

    return (
        <DashboardLayout header="Course approvals">
            <Head title="Approvals — Admin" />

            <div className="flex items-center gap-6 mb-6 text-sm">
                <span className="text-surface-500">
                    <span className="font-semibold text-surface-900 dark:text-white">{counts.pending}</span> awaiting
                    review
                </span>
                <span className="text-surface-500">
                    <span className="font-semibold text-surface-900 dark:text-white">{counts.published}</span>{' '}
                    published
                </span>
                <span className="text-surface-500">
                    <span className="font-semibold text-surface-900 dark:text-white">{counts.draft}</span> draft
                </span>
            </div>

            {pending.length === 0 ? (
                <div className="card p-12 text-center">
                    <ClipboardList className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1.5">
                        Nothing waiting
                    </h2>
                    <p className="text-sm text-surface-500">
                        Courses submitted by instructors land here for review.
                    </p>
                </div>
            ) : (
                <div className="space-y-5">
                    {pending.map((course) => (
                        <article key={course.id} className="card p-6">
                            <div className="flex items-start gap-4 flex-wrap mb-5">
                                <div className="flex-1 min-w-[220px]">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="badge-muted">{course.category}</span>
                                        <span className="badge-muted capitalize">{course.difficulty}</span>
                                    </div>
                                    <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                                        {course.title}
                                    </h2>
                                    <p className="text-sm text-surface-500 mt-1">
                                        {course.instructor?.full_name} · submitted {when(course.submitted_at)}
                                    </p>
                                </div>

                                <Link
                                    href={route('admin.courses.show', course.id)}
                                    className="btn-secondary py-2"
                                >
                                    <Eye className="w-4 h-4" />
                                    Inspect
                                </Link>
                            </div>

                            {/* Reviewer checklist */}
                            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 mb-5">
                                {course.readiness.checks.map((check) => (
                                    <li key={check.label} className="flex items-start gap-2.5">
                                        {check.manual ? (
                                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                        ) : check.passed ? (
                                            <CheckCircle2 className="w-4 h-4 text-accent-500 shrink-0 mt-0.5" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                        )}

                                        <span className="min-w-0">
                                            <span className="block text-sm text-surface-900 dark:text-white">
                                                {check.label}
                                                {check.manual && (
                                                    <span className="text-xs text-amber-600 dark:text-amber-400">
                                                        {' '}
                                                        · manual
                                                    </span>
                                                )}
                                            </span>
                                            <span className="block text-xs text-surface-400">{check.detail}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            {course.readiness.blocking > 0 && (
                                <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-4">
                                    <XCircle className="w-4 h-4" />
                                    {course.readiness.blocking} check
                                    {course.readiness.blocking === 1 ? '' : 's'} must pass before publishing.
                                </p>
                            )}

                            <div className="flex items-center gap-3 pt-4 border-t border-surface-100 dark:border-surface-800">
                                <button
                                    onClick={() =>
                                        router.patch(
                                            route('admin.approvals.approve', course.id),
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                    disabled={course.readiness.blocking > 0}
                                    className="btn-primary"
                                >
                                    <Check className="w-4 h-4" />
                                    Approve and publish
                                </button>

                                <button
                                    onClick={() => setRejecting(rejecting === course.id ? null : course.id)}
                                    className="btn-secondary"
                                >
                                    <X className="w-4 h-4" />
                                    Request changes
                                </button>
                            </div>

                            {rejecting === course.id && (
                                <form onSubmit={reject(course.id)} className="mt-4">
                                    <label htmlFor={`notes-${course.id}`} className="block text-sm font-medium mb-1.5">
                                        What needs to change?
                                    </label>
                                    <textarea
                                        id={`notes-${course.id}`}
                                        rows={4}
                                        value={form.data.review_notes}
                                        onChange={(e) => form.setData('review_notes', e.target.value)}
                                        placeholder="Be specific — this goes straight to the instructor."
                                        className="input"
                                        required
                                        autoFocus
                                    />
                                    {form.errors.review_notes && (
                                        <p className="text-xs text-red-500 mt-1">{form.errors.review_notes}</p>
                                    )}

                                    <button type="submit" disabled={form.processing} className="btn-primary mt-3">
                                        Send back to instructor
                                    </button>
                                </form>
                            )}
                        </article>
                    ))}
                </div>
            )}

            {recentlyReviewed.length > 0 && (
                <div className="card p-6 mt-6">
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-4">
                        Recently reviewed
                    </h2>

                    <ul className="divide-y divide-surface-100 dark:divide-surface-800">
                        {recentlyReviewed.map((course) => (
                            <li key={course.id} className="py-3 flex items-center gap-3">
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm text-surface-900 dark:text-white truncate">
                                        {course.title}
                                    </span>
                                    <span className="block text-xs text-surface-400">
                                        {course.instructor} · reviewed by {course.reviewer} ·{' '}
                                        <Clock className="w-3 h-3 inline" /> {when(course.reviewed_at)}
                                    </span>
                                </span>
                                <span className={course.status === 'published' ? 'badge-accent' : 'badge-muted'}>
                                    {course.status === 'published' ? 'Published' : 'Changes requested'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </DashboardLayout>
    );
}
