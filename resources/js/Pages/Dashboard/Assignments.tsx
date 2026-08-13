import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

interface AssignmentRow {
    id: string;
    title: string;
    description?: string;
    deadline_at: string | null;
    max_marks: number;
    course?: { id: string; title: string; slug: string };
    submission?: {
        id: string;
        status: 'pending' | 'graded' | 'returned';
        marks_awarded: number | null;
        created_at: string;
    } | null;
    is_overdue: boolean;
}

interface Props extends PageProps {
    assignments: AssignmentRow[];
}

function statusBadge(row: AssignmentRow) {
    if (row.submission?.status === 'graded') {
        return (
            <span className="badge-accent">
                <CheckCircle2 className="w-3 h-3" />
                {row.submission.marks_awarded}/{row.max_marks}
            </span>
        );
    }

    if (row.submission?.status === 'returned') {
        return <span className="badge-muted">Returned for changes</span>;
    }

    if (row.submission) {
        return <span className="badge-primary">Submitted</span>;
    }

    if (row.is_overdue) {
        return (
            <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                <AlertTriangle className="w-3 h-3" />
                Overdue
            </span>
        );
    }

    return <span className="badge bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300">Not started</span>;
}

export default function Assignments({ assignments }: Props) {
    return (
        <DashboardLayout header="Assignments">
            <Head title="Assignments — Gmora STEM" />

            {assignments.length === 0 ? (
                <div className="card p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center mx-auto mb-4">
                        <ClipboardCheck className="w-8 h-8 text-primary-500" />
                    </div>
                    <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-1.5">
                        Nothing due right now
                    </h2>
                    <p className="text-surface-500">Assignments from your enrolled courses show up here.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {assignments.map((assignment) => (
                        <Link
                            key={assignment.id}
                            href={route('assignments.show', assignment.id)}
                            className="card-interactive block p-5"
                        >
                            <div className="flex items-start gap-4 flex-wrap">
                                <div className="flex-1 min-w-[220px]">
                                    <div className="text-xs uppercase tracking-wider text-primary-500 font-semibold mb-1">
                                        {assignment.course?.title}
                                    </div>
                                    <h2 className="font-semibold text-surface-900 dark:text-white">
                                        {assignment.title}
                                    </h2>

                                    {assignment.deadline_at && (
                                        <p className="inline-flex items-center gap-1.5 text-sm text-surface-500 mt-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            Due{' '}
                                            {new Date(assignment.deadline_at).toLocaleString(undefined, {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            })}
                                        </p>
                                    )}
                                </div>

                                <div className="shrink-0">{statusBadge(assignment)}</div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
