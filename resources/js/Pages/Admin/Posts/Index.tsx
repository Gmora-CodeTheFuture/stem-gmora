import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Eye, PenSquare, Plus, Search, Trash2 } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { Paginated, PageProps } from '@/types';

interface PostRow {
    id: string;
    title: string;
    slug: string;
    category?: string;
    status: 'draft' | 'published';
    is_live: boolean;
    published_at: string | null;
    updated_at: string;
    author_name?: string;
}

interface Props extends PageProps {
    posts: Paginated<PostRow>;
    filters: { search?: string; status?: string };
}

export default function PostsIndex({ posts, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = (patch: Record<string, string>) =>
        router.get(route('admin.posts.index'), { ...filters, search, ...patch }, {
            preserveState: true,
            replace: true,
        });

    return (
        <DashboardLayout header="Blog">
            <Head title="Blog — Admin" />

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
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
                        placeholder="Search posts…"
                        aria-label="Search posts"
                        className="input pl-11 rounded-full"
                    />
                </form>

                <select
                    value={filters.status ?? ''}
                    onChange={(e) => apply({ status: e.target.value })}
                    aria-label="Filter by status"
                    className="input rounded-full max-w-[160px]"
                >
                    <option value="">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                </select>

                <Link href={route('admin.posts.create')} className="btn-primary sm:ml-auto">
                    <Plus className="w-4 h-4" />
                    New post
                </Link>
            </div>

            {posts.data.length === 0 ? (
                <div className="card p-12 text-center">
                    <PenSquare className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1.5">No posts yet</h2>
                    <p className="text-sm text-surface-500">Write the first one.</p>
                </div>
            ) : (
                <div className="card divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden">
                    {posts.data.map((post) => (
                        <div key={post.id} className="flex items-center gap-4 p-4">
                            <span className="flex-1 min-w-0">
                                <span className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-surface-900 dark:text-white truncate">
                                        {post.title}
                                    </span>
                                    <span className={post.is_live ? 'badge-accent' : 'badge-muted'}>
                                        {post.is_live ? 'Live' : post.status}
                                    </span>
                                    {post.category && <span className="badge-muted">{post.category}</span>}
                                </span>
                                <span className="block text-xs text-surface-400 mt-0.5">
                                    {post.author_name} · updated{' '}
                                    {new Date(post.updated_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                </span>
                            </span>

                            {post.is_live && (
                                <a
                                    href={route('blog.show', post.slug)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn-icon"
                                    aria-label="View live"
                                >
                                    <Eye className="w-4 h-4" />
                                </a>
                            )}

                            <Link href={route('admin.posts.edit', post.id)} className="btn-secondary py-2">
                                Edit
                            </Link>

                            <button
                                onClick={() => router.delete(route('admin.posts.destroy', post.id))}
                                className="btn-icon hover:text-red-500"
                                aria-label={`Delete ${post.title}`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
