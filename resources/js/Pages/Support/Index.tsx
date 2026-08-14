import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { LifeBuoy, MessageSquare, Plus } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

interface Ticket {
    id: string;
    reference: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    messages_count: number;
    last_reply_at: string | null;
    created_at: string;
    is_closed: boolean;
}

interface Props extends PageProps {
    tickets: Ticket[];
    categories: string[];
    courses: Array<{ id: string; title: string }>;
}

const STATUS_STYLE: Record<string, string> = {
    open: 'badge-primary',
    pending: 'badge bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    resolved: 'badge-accent',
    closed: 'badge-muted',
};

function when(iso: string | null): string {
    return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
}

export default function SupportIndex({ tickets, categories, courses }: Props) {
    const [composing, setComposing] = useState(tickets.length === 0);

    const form = useForm({ subject: '', body: '', category: 'general', course_id: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('support.store'));
    };

    return (
        <DashboardLayout header="Support">
            <Head title="Support — Gmora STEM" />

            <div className="flex items-center gap-3 mb-6">
                <p className="text-sm text-surface-500">
                    Questions about your account, a course, or something not working.
                </p>
                <button onClick={() => setComposing((open) => !open)} className="btn-primary ml-auto">
                    <Plus className="w-4 h-4" />
                    New ticket
                </button>
            </div>

            {composing && (
                <form onSubmit={submit} className="card p-6 mb-5 space-y-4">
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium mb-1.5">
                            Subject
                        </label>
                        <input
                            id="subject"
                            value={form.data.subject}
                            onChange={(e) => form.setData('subject', e.target.value)}
                            className="input"
                            required
                        />
                        {form.errors.subject && <p className="text-xs text-red-500 mt-1">{form.errors.subject}</p>}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium mb-1.5">
                                Category
                            </label>
                            <select
                                id="category"
                                value={form.data.category}
                                onChange={(e) => form.setData('category', e.target.value)}
                                className="input capitalize"
                            >
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="course_id" className="block text-sm font-medium mb-1.5">
                                Related course <span className="text-surface-400">(optional)</span>
                            </label>
                            <select
                                id="course_id"
                                value={form.data.course_id}
                                onChange={(e) => form.setData('course_id', e.target.value)}
                                className="input"
                            >
                                <option value="">Not about a course</option>
                                {courses.map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="body" className="block text-sm font-medium mb-1.5">
                            What's happening?
                        </label>
                        <textarea
                            id="body"
                            rows={5}
                            value={form.data.body}
                            onChange={(e) => form.setData('body', e.target.value)}
                            placeholder="Include what you tried and what you saw."
                            className="input"
                            required
                        />
                        {form.errors.body && <p className="text-xs text-red-500 mt-1">{form.errors.body}</p>}
                    </div>

                    <button type="submit" disabled={form.processing} className="btn-primary">
                        {form.processing ? 'Sending…' : 'Raise ticket'}
                    </button>
                </form>
            )}

            {tickets.length === 0 ? (
                !composing && (
                    <div className="card p-12 text-center">
                        <LifeBuoy className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                        <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1.5">
                            No tickets yet
                        </h2>
                        <p className="text-sm text-surface-500">Raise one and we'll pick it up here.</p>
                    </div>
                )
            ) : (
                <div className="card divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden">
                    {tickets.map((ticket) => (
                        <Link
                            key={ticket.id}
                            href={route('support.show', ticket.id)}
                            className="flex items-center gap-4 p-4 hover:bg-surface-50 dark:hover:bg-surface-800/60 transition-colors"
                        >
                            <span className="flex-1 min-w-0">
                                <span className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-mono text-surface-400">{ticket.reference}</span>
                                    <span className="text-sm font-medium text-surface-900 dark:text-white truncate">
                                        {ticket.subject}
                                    </span>
                                    <span className={STATUS_STYLE[ticket.status] ?? 'badge-muted'}>
                                        {ticket.status}
                                    </span>
                                </span>
                                <span className="block text-xs text-surface-400 mt-1">
                                    {ticket.category} · last activity {when(ticket.last_reply_at)}
                                </span>
                            </span>

                            <span className="inline-flex items-center gap-1.5 text-xs text-surface-400 shrink-0">
                                <MessageSquare className="w-3.5 h-3.5" />
                                {ticket.messages_count}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
