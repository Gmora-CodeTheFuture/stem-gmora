import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Clock, Search, Tag } from 'lucide-react';
import MarketingLayout from '@/Layouts/MarketingLayout';
import { Paginated } from '@/types';

interface PostCard {
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    category?: string;
    tags: string[];
    cover_image_url?: string;
    published_at: string | null;
    reading_minutes: number;
    author_name?: string;
}

interface Props {
    posts: Paginated<PostCard>;
    categories: string[];
    filters: { search: string; category: string; tag: string };
}

function when(iso: string | null): string {
    return iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '';
}

export default function BlogIndex({ posts, categories, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = (patch: Record<string, string>) =>
        router.get(route('blog.index'), { ...filters, search, ...patch }, { preserveState: true, replace: true });

    return (
        <MarketingLayout>
            <Head title="Blog — Gmora STEM" />

            <section className="pt-28 md:pt-36 pb-12 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800">
                <div className="container-wide text-center max-w-2xl">
                    <h1 className="text-3xl md:text-5xl font-semibold text-surface-900 dark:text-white mb-4">
                        The Gmora <span className="text-primary-600 dark:text-primary-400">blog</span>
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400">
                        Teaching notes, project write-ups, and what we're learning while building the platform.
                    </p>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            apply({});
                        }}
                        className="relative max-w-md mx-auto mt-8"
                    >
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search articles…"
                            aria-label="Search articles"
                            className="input pl-11 rounded-full"
                        />
                    </form>
                </div>
            </section>

            <section className="section pt-10">
                <div className="container-wide">
                    {(categories.length > 0 || filters.tag) && (
                        <div className="flex items-center gap-2 flex-wrap mb-8">
                            <button
                                onClick={() => apply({ category: '', tag: '' })}
                                className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors ${
                                    !filters.category && !filters.tag
                                        ? 'bg-primary-600 border-primary-600 text-white'
                                        : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-primary-400'
                                }`}
                            >
                                All
                            </button>

                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => apply({ category, tag: '' })}
                                    className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors ${
                                        filters.category === category
                                            ? 'bg-primary-600 border-primary-600 text-white'
                                            : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-primary-400'
                                    }`}
                                >
                                    {category}
                                </button>
                            ))}

                            {filters.tag && (
                                <span className="badge-primary">
                                    <Tag className="w-3 h-3" />
                                    {filters.tag}
                                </span>
                            )}
                        </div>
                    )}

                    {posts.data.length === 0 ? (
                        <div className="card p-12 text-center">
                            <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1.5">
                                Nothing published yet
                            </h2>
                            <p className="text-sm text-surface-500">Check back soon.</p>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {posts.data.map((post) => (
                                <Link
                                    key={post.id}
                                    href={route('blog.show', post.slug)}
                                    className="card-interactive block overflow-hidden h-full"
                                >
                                    <div className="aspect-video bg-surface-100 dark:bg-surface-800">
                                        {post.cover_image_url && (
                                            <img
                                                src={post.cover_image_url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>

                                    <div className="p-5">
                                        {post.category && <span className="badge-muted">{post.category}</span>}

                                        <h2 className="font-semibold text-surface-900 dark:text-white leading-snug mt-2.5">
                                            {post.title}
                                        </h2>

                                        {post.excerpt && (
                                            <p className="text-sm text-surface-500 mt-1.5 line-clamp-2">
                                                {post.excerpt}
                                            </p>
                                        )}

                                        <p className="flex items-center gap-3 text-xs text-surface-400 mt-4">
                                            <span>{when(post.published_at)}</span>
                                            <span className="inline-flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {post.reading_minutes} min read
                                            </span>
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {posts.last_page > 1 && (
                        <nav className="flex justify-center gap-1 mt-10" aria-label="Pagination">
                            {posts.links.map((link, i) => (
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
                </div>
            </section>
        </MarketingLayout>
    );
}
