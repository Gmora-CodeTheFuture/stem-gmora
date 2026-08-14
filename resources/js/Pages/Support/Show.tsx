import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { ArrowLeft, BadgeCheck, CheckCircle2 } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

interface Message {
    id: string;
    body: string;
    from_staff: boolean;
    author?: string;
    created_at: string;
}

interface Props extends PageProps {
    ticket: {
        id: string;
        reference: string;
        subject: string;
        category: string;
        priority: string;
        status: string;
        created_at: string;
        is_closed: boolean;
        assignee?: string | null;
        course?: string | null;
        is_staff_view: boolean;
    };
    messages: Message[];
}

const STATUS_STYLE: Record<string, string> = {
    open: 'badge-primary',
    pending: 'badge bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    resolved: 'badge-accent',
    closed: 'badge-muted',
};

function when(iso: string): string {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SupportShow({ ticket, messages }: Props) {
    const form = useForm({ body: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('support.reply', ticket.id), {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <DashboardLayout header={ticket.subject}>
            <Head title={`${ticket.reference} — support`} />

            <Link
                href={route('support.index')}
                className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                All tickets
            </Link>

            <div className="card p-5 mb-5 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-mono text-surface-400">{ticket.reference}</span>
                <span className={STATUS_STYLE[ticket.status] ?? 'badge-muted'}>{ticket.status}</span>
                <span className="badge-muted capitalize">{ticket.category}</span>
                {ticket.course && <span className="badge-muted">{ticket.course}</span>}

                <span className="text-xs text-surface-400 ml-auto">
                    {ticket.assignee ? `Handled by ${ticket.assignee}` : 'Not yet assigned'} · opened{' '}
                    {when(ticket.created_at)}
                </span>
            </div>

            <div className="space-y-3 mb-5">
                {messages.map((message) => (
                    <article
                        key={message.id}
                        className={`card p-5 ${
                            message.from_staff ? 'border-primary-200 dark:border-primary-900' : ''
                        }`}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <span
                                className={`w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center shrink-0 ${
                                    message.from_staff
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300'
                                }`}
                            >
                                {message.author?.charAt(0)?.toUpperCase() ?? '?'}
                            </span>

                            <span className="text-sm font-medium text-surface-900 dark:text-white">
                                {message.author}
                            </span>

                            {message.from_staff && (
                                <span className="badge-primary">
                                    <BadgeCheck className="w-3 h-3" />
                                    Gmora support
                                </span>
                            )}

                            <span className="text-xs text-surface-400 ml-auto">{when(message.created_at)}</span>
                        </div>

                        <p className="text-sm text-surface-700 dark:text-surface-200 whitespace-pre-line leading-relaxed">
                            {message.body}
                        </p>
                    </article>
                ))}
            </div>

            {ticket.is_closed ? (
                <div className="card p-5 text-center">
                    <p className="text-sm text-surface-500">
                        This ticket is {ticket.status}. Replying reopens it.
                    </p>
                    <form onSubmit={submit} className="mt-4 text-left">
                        <textarea
                            rows={3}
                            value={form.data.body}
                            onChange={(e) => form.setData('body', e.target.value)}
                            placeholder="Add another message…"
                            className="input"
                            required
                        />
                        <button type="submit" disabled={form.processing} className="btn-secondary mt-3">
                            Reopen with a reply
                        </button>
                    </form>
                </div>
            ) : (
                <form onSubmit={submit} className="card p-5">
                    <label htmlFor="body" className="block text-sm font-medium mb-2">
                        Reply
                    </label>
                    <textarea
                        id="body"
                        rows={4}
                        value={form.data.body}
                        onChange={(e) => form.setData('body', e.target.value)}
                        className="input"
                        required
                    />
                    {form.errors.body && <p className="text-xs text-red-500 mt-1">{form.errors.body}</p>}

                    <div className="flex items-center gap-3 mt-3">
                        <button type="submit" disabled={form.processing} className="btn-primary">
                            {form.processing ? 'Sending…' : 'Send reply'}
                        </button>

                        {!ticket.is_staff_view && (
                            <button
                                type="button"
                                onClick={() =>
                                    router.patch(route('support.close', ticket.id), {}, { preserveScroll: true })
                                }
                                className="btn-ghost"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                This is sorted, close it
                            </button>
                        )}
                    </div>
                </form>
            )}
        </DashboardLayout>
    );
}
