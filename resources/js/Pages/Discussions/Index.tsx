import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { CheckCircle2, MessageSquare, Pin, Plus, Search, X } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { Paginated, PageProps } from '@/types';

interface Thread {
    id: string;
    title: string;
    excerpt: string;
    is_pinned: boolean;
    is_solved: boolean;
    replies_count: number;
    last_activity_at: string | null;
    created_at: string;
    author: { id: string; full_name: string } | null;
    lesson: { id: string; title: string } | null;
}

interface Props extends PageProps {
    course: { id: string; title: string; slug: string };
    discussions: Paginated<Thread>;
    lessons: Array<{ id: string; title: string }>;
    filters: { filter: string; lesson: string; search: string };
    canModerate: boolean;
}

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'unanswered', label: 'Unanswered' },
    { key: 'solved', label: 'Solved' },
    { key: 'mine', label: 'Mine' },
];

function relative(iso: string | null): string {
    if (!iso) return '';

    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;

    return `${Math.round(minutes / 1440)}d ago`;
}

export default function DiscussionsIndex({ course, discussions, lessons, filters, canModerate }: Props) {
    const [composing, setComposing] = useState(false);
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = (patch: Record<string, string>) =>
        router.get(route('discussions.index', course.slug), { ...filters, search, ...patch }, {
            preserveState: true,
            replace: true,
        });

    const form = useForm({ title: '', body: '', lesson_id: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('discussions.store', course.slug), {
            onSuccess: () => {
                form.reset();
                setComposing(false);
            },
        });
    };

    return (
        <DashboardLayout header={`${course.title} — discussions`}>
            <Head title={`Discussions — ${course.title}`} />

            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
                <div className="inline-flex p-1 rounded-full bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 self-start">
                    {FILTERS.map((item) => (
                        <button
                            key={item.key}
                            onClick={() => apply({ filter: item.key })}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                filters.filter === item.key
                                    ? 'bg-white dark:bg-surface-800 text-surface-900 dark:text-white shadow-card'
                                    : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        apply({});
                    }}
                    className="relative flex-1 max-w-sm"
                >
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search discussions…"
                        aria-label="Search discussions"
                        className="input pl-11 rounded-full"
                    />
                </form>

                <select
                    value={filters.lesson ?? ''}
                    onChange={(e) => apply({ lesson: e.target.value })}
                    aria-label="Filter by lesson"
                    className="input rounded-full max-w-[220px]"
                >
                    <option value="">All lessons</option>
                    {lessons.map((lesson) => (
                        <option key={lesson.id} value={lesson.id}>
                            {lesson.title}
                        </option>
                    ))}
                </select>

                <button onClick={() => setComposing((open) => !open)} className="btn-primary lg:ml-auto">
                    <Plus className="w-4 h-4" />
                    Ask a question
                </button>
            </div>

            {composing && (
                <form onSubmit={submit} className="card p-6 mb-5 space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium mb-1.5">
                            Question
                        </label>
                        <input
                            id="title"
                            value={form.data.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                            placeholder="What are you stuck on?"
                            className="input"
                            required
                        />
                        {form.errors.title && <p className="text-xs text-red-500 mt-1">{form.errors.title}</p>}
                    </div>

                    <div>
                        <label htmlFor="body" className="block text-sm font-medium mb-1.5">
                            Details
                        </label>
                        <textarea
                            id="body"
                            rows={5}
                            value={form.data.body}
                            onChange={(e) => form.setData('body', e.target.value)}
                            placeholder="Include what you tried and what happened."
                            className="input"
                            required
                        />
                        {form.errors.body && <p className="text-xs text-red-500 mt-1">{form.errors.body}</p>}
                    </div>

                    <div>
                        <label htmlFor="lesson_id" className="block text-sm font-medium mb-1.5">
                            Related lesson <span className="text-surface-400">(optional)</span>
                        </label>
                        <select
                            id="lesson_id"
                            value={form.data.lesson_id}
                            onChange={(e) => form.setData('lesson_id', e.target.value)}
                            className="input max-w-md"
                        >
                            <option value="">Not about a specific lesson</option>
                            {lessons.map((lesson) => (
                                <option key={lesson.id} value={lesson.id}>
                                    {lesson.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-3">
                        <button type="submit" disabled={form.processing} className="btn-primary">
                            {form.processing ? 'Posting…' : 'Post question'}
                        </button>
                        <button type="button" onClick={() => setComposing(false)} className="btn-ghost">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {discussions.data.length === 0 ? (
                <div className="card p-12 text-center">
                    <MessageSquare className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1.5">
                        Nothing here yet
                    </h2>
                    <p className="text-sm text-surface-500">
                        Be the first to ask — your classmates probably have the same question.
                    </p>
                </div>
            ) : (
                <div className="card divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden">
                    {discussions.data.map((thread) => (
                        <Link
                            key={thread.id}
                            href={route('discussions.show', thread.id)}
                            className="flex items-start gap-4 p-5 hover:bg-surface-50 dark:hover:bg-surface-800/60 transition-colors"
                        >
                            <span
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    thread.is_solved
                                        ? 'bg-accent-50 dark:bg-accent-950 text-accent-600 dark:text-accent-400'
                                        : 'bg-surface-100 dark:bg-surface-800 text-surface-500'
                                }`}
                            >
                                {thread.is_solved ? (
                                    <CheckCircle2 className="w-[18px] h-[18px]" />
                                ) : (
                                    <MessageSquare className="w-[18px] h-[18px]" />
                                )}
                            </span>

                            <span className="flex-1 min-w-0">
                                <span className="flex items-center gap-2 flex-wrap">
                                    {thread.is_pinned && (
                                        <span className="badge-primary">
                                            <Pin className="w-3 h-3" />
                                            Pinned
                                        </span>
                                    )}
                                    <span className="text-sm font-semibold text-surface-900 dark:text-white">
                                        {thread.title}
                                    </span>
                                    {thread.lesson && <span className="badge-muted">{thread.lesson.title}</span>}
                                </span>

                                <span className="block text-sm text-surface-500 mt-1 line-clamp-2">
                                    {thread.excerpt}
                                </span>

                                <span className="block text-xs text-surface-400 mt-2">
                                    {thread.author?.full_name} · {relative(thread.last_activity_at)}
                                </span>
                            </span>

                            <span className="text-sm text-surface-400 shrink-0">
                                {thread.replies_count} {thread.replies_count === 1 ? 'reply' : 'replies'}
                            </span>
                        </Link>
                    ))}
                </div>
            )}

            {discussions.last_page > 1 && (
                <nav className="flex justify-center gap-1 mt-6" aria-label="Pagination">
                    {discussions.links.map((link, i) => (
                        <Link
                            key={i}
                            href={link.url ?? '#'}
                            preserveScroll
                            className={`px-3.5 py-2 rounded-lg text-sm ${
                                link.active
                                    ? 'bg-primary-600 text-white'
                                    : link.url
                                      ? 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
                                      : 'text-surface-300 pointer-events-none'
                            }`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </nav>
            )}

            {canModerate && (
                <p className="flex items-center gap-2 text-xs text-surface-400 mt-4">
                    <X className="w-3 h-3" />
                    You can pin, mark solved, and remove posts on this board.
                </p>
            )}
        </DashboardLayout>
    );
}
