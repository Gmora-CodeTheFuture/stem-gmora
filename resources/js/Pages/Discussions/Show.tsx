import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { ArrowLeft, BadgeCheck, CheckCircle2, Pin, Reply, Trash2 } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

interface ReplyNode {
    id: string;
    body: string;
    created_at: string;
    is_instructor_answer: boolean;
    is_accepted: boolean;
    author: { id?: string; full_name?: string; role?: string };
    children?: ReplyNode[];
}

interface Props extends PageProps {
    discussion: {
        id: string;
        title: string;
        body: string;
        is_pinned: boolean;
        is_solved: boolean;
        solved_reply_id: string | null;
        replies_count: number;
        created_at: string;
        author: { id: string; full_name: string } | null;
        lesson: { id: string; title: string } | null;
        course: { id: string; title: string; slug: string } | null;
    };
    replies: ReplyNode[];
    canModerate: boolean;
    isAuthor: boolean;
}

function when(iso: string): string {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function DiscussionShow({ discussion, replies, canModerate, isAuthor }: Props) {
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    const form = useForm({ body: '', parent_id: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('discussions.reply', discussion.id), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setReplyingTo(null);
            },
        });
    };

    const accept = (replyId: string) =>
        router.patch(
            route('discussions.solve', discussion.id),
            { reply_id: discussion.solved_reply_id === replyId ? null : replyId },
            { preserveScroll: true },
        );

    const renderReply = (reply: ReplyNode, nested = false) => (
        <div key={reply.id} className={nested ? 'ml-6 sm:ml-12 mt-3' : ''}>
            <article
                className={`card p-5 ${
                    reply.is_accepted ? 'ring-1 ring-accent-500 border-accent-200 dark:border-accent-900' : ''
                }`}
            >
                <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="w-8 h-8 rounded-full bg-primary-600 text-white text-xs font-medium flex items-center justify-center shrink-0">
                        {reply.author?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </span>
                    <span className="text-sm font-medium text-surface-900 dark:text-white">
                        {reply.author?.full_name}
                    </span>

                    {reply.is_instructor_answer && (
                        <span className="badge-primary">
                            <BadgeCheck className="w-3 h-3" />
                            {reply.author?.role ?? 'Instructor'}
                        </span>
                    )}
                    {reply.is_accepted && (
                        <span className="badge-accent">
                            <CheckCircle2 className="w-3 h-3" />
                            Accepted answer
                        </span>
                    )}

                    <span className="text-xs text-surface-400 ml-auto">{when(reply.created_at)}</span>
                </div>

                <p className="text-sm text-surface-700 dark:text-surface-200 whitespace-pre-line leading-relaxed">
                    {reply.body}
                </p>

                <div className="flex items-center gap-3 mt-4">
                    {!nested && (
                        <button
                            onClick={() => {
                                setReplyingTo(reply.id);
                                form.setData('parent_id', reply.id);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs text-surface-500 hover:text-primary-600 transition-colors"
                        >
                            <Reply className="w-3.5 h-3.5" />
                            Reply
                        </button>
                    )}

                    {(isAuthor || canModerate) && (
                        <button
                            onClick={() => accept(reply.id)}
                            className="inline-flex items-center gap-1.5 text-xs text-surface-500 hover:text-accent-600 transition-colors"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {reply.is_accepted ? 'Unmark answer' : 'Mark as answer'}
                        </button>
                    )}

                    {canModerate && (
                        <button
                            onClick={() =>
                                router.delete(route('discussions.reply.destroy', reply.id), {
                                    preserveScroll: true,
                                })
                            }
                            className="inline-flex items-center gap-1.5 text-xs text-surface-400 hover:text-red-500 transition-colors ml-auto"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                        </button>
                    )}
                </div>
            </article>

            {reply.children?.map((child) => renderReply(child, true))}

            {replyingTo === reply.id && (
                <form onSubmit={submit} className="ml-6 sm:ml-12 mt-3 card p-4">
                    <textarea
                        rows={3}
                        value={form.data.body}
                        onChange={(e) => form.setData('body', e.target.value)}
                        placeholder={`Reply to ${reply.author?.full_name}…`}
                        className="input"
                        required
                        autoFocus
                    />
                    <div className="flex items-center gap-2 mt-3">
                        <button type="submit" disabled={form.processing} className="btn-primary py-2">
                            Post reply
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setReplyingTo(null);
                                form.setData('parent_id', '');
                            }}
                            className="btn-ghost py-2"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </div>
    );

    return (
        <DashboardLayout header={discussion.title}>
            <Head title={`${discussion.title} — discussion`} />

            {discussion.course && (
                <Link
                    href={route('discussions.index', discussion.course.slug)}
                    className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    All discussions
                </Link>
            )}

            {/* The question */}
            <article className="card p-6 mb-5">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                    {discussion.is_pinned && (
                        <span className="badge-primary">
                            <Pin className="w-3 h-3" />
                            Pinned
                        </span>
                    )}
                    {discussion.is_solved && (
                        <span className="badge-accent">
                            <CheckCircle2 className="w-3 h-3" />
                            Solved
                        </span>
                    )}
                    {discussion.lesson && <span className="badge-muted">{discussion.lesson.title}</span>}

                    {canModerate && (
                        <button
                            onClick={() =>
                                router.patch(route('discussions.pin', discussion.id), {}, { preserveScroll: true })
                            }
                            className="ml-auto inline-flex items-center gap-1.5 text-xs text-surface-500 hover:text-primary-600"
                        >
                            <Pin className="w-3.5 h-3.5" />
                            {discussion.is_pinned ? 'Unpin' : 'Pin'}
                        </button>
                    )}
                </div>

                <h1 className="text-xl font-semibold text-surface-900 dark:text-white">{discussion.title}</h1>
                <p className="text-xs text-surface-400 mt-1">
                    {discussion.author?.full_name} · {when(discussion.created_at)}
                </p>

                <p className="text-sm text-surface-700 dark:text-surface-200 whitespace-pre-line leading-relaxed mt-4">
                    {discussion.body}
                </p>

                {(isAuthor || canModerate) && (
                    <button
                        onClick={() =>
                            router.delete(route('discussions.destroy', discussion.id))
                        }
                        className="inline-flex items-center gap-1.5 text-xs text-surface-400 hover:text-red-500 transition-colors mt-5"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete question
                    </button>
                )}
            </article>

            <h2 className="text-sm font-semibold text-surface-900 dark:text-white mb-3">
                {discussion.replies_count} {discussion.replies_count === 1 ? 'reply' : 'replies'}
            </h2>

            <div className="space-y-3">{replies.map((reply) => renderReply(reply))}</div>

            {/* New top-level reply */}
            <form
                onSubmit={(e) => {
                    form.setData('parent_id', '');
                    submit(e);
                }}
                className="card p-5 mt-5"
            >
                <label htmlFor="body" className="block text-sm font-medium mb-2">
                    Your reply
                </label>
                <textarea
                    id="body"
                    rows={4}
                    value={replyingTo === null ? form.data.body : ''}
                    onChange={(e) => {
                        setReplyingTo(null);
                        form.setData('body', e.target.value);
                    }}
                    placeholder="Share what you know…"
                    className="input"
                    required
                />
                {form.errors.body && <p className="text-xs text-red-500 mt-1">{form.errors.body}</p>}

                <button type="submit" disabled={form.processing} className="btn-primary mt-3">
                    {form.processing ? 'Posting…' : 'Post reply'}
                </button>
            </form>
        </DashboardLayout>
    );
}
