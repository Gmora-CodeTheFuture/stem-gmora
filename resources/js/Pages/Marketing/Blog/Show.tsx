import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Clock, Tag } from 'lucide-react';
import MarketingLayout from '@/Layouts/MarketingLayout';

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
    post: PostCard & {
        html: string;
        author: { id?: string; full_name?: string; avatar_url?: string; headline?: string };
    };
    related: PostCard[];
}

function when(iso: string | null): string {
    return iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'long' }) : '';
}

export default function BlogShow({ post, related }: Props) {
    return (
        <MarketingLayout>
            <Head title={`${post.title} — Gmora STEM`}>
                {post.excerpt && <meta name="description" content={post.excerpt} />}
            </Head>

            <article className="pt-28 md:pt-32 pb-16">
                <div className="container-wide max-w-3xl">
                    <Link
                        href={route('blog.index')}
                        className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 transition-colors mb-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        All articles
                    </Link>

                    {post.category && <span className="badge-primary">{post.category}</span>}

                    <h1 className="text-3xl md:text-4xl font-semibold text-surface-900 dark:text-white leading-tight mt-4">
                        {post.title}
                    </h1>

                    <div className="flex items-center gap-3 mt-5 pb-8 border-b border-surface-200 dark:border-surface-800">
                        <span className="w-10 h-10 rounded-full bg-primary-600 text-white text-sm font-medium flex items-center justify-center">
                            {post.author?.full_name?.charAt(0)?.toUpperCase() ?? 'G'}
                        </span>
                        <span>
                            <span className="block text-sm font-medium text-surface-900 dark:text-white">
                                {post.author?.full_name}
                            </span>
                            <span className="block text-xs text-surface-400">
                                {when(post.published_at)} · {post.reading_minutes} min read
                            </span>
                        </span>
                    </div>

                    {post.cover_image_url && (
                        <img
                            src={post.cover_image_url}
                            alt=""
                            className="w-full rounded-3xl mt-8 border border-surface-200 dark:border-surface-800"
                        />
                    )}

                    {/*
                     * Server-rendered markdown with raw HTML stripped, so this
                     * cannot carry script from the editor.
                     */}
                    <div
                        className="prose-gmora mt-8"
                        dangerouslySetInnerHTML={{ __html: post.html }}
                    />

                    {post.tags.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap mt-10 pt-6 border-t border-surface-200 dark:border-surface-800">
                            {post.tags.map((tag) => (
                                <Link
                                    key={tag}
                                    href={route('blog.index', { tag })}
                                    className="badge-muted hover:text-primary-600 transition-colors"
                                >
                                    <Tag className="w-3 h-3" />
                                    {tag}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </article>

            {related.length > 0 && (
                <section className="section pt-0">
                    <div className="container-wide max-w-3xl">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-5">Keep reading</h2>

                        <div className="grid sm:grid-cols-3 gap-5">
                            {related.map((item) => (
                                <Link
                                    key={item.id}
                                    href={route('blog.show', item.slug)}
                                    className="card-interactive p-5 block"
                                >
                                    <h3 className="text-sm font-semibold text-surface-900 dark:text-white leading-snug">
                                        {item.title}
                                    </h3>
                                    <p className="inline-flex items-center gap-1.5 text-xs text-surface-400 mt-2">
                                        <Clock className="w-3 h-3" />
                                        {item.reading_minutes} min read
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </MarketingLayout>
    );
}
