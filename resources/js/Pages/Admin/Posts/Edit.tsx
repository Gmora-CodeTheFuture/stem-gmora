import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { ArrowLeft, Eye, X } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

interface EditablePost {
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    body: string;
    cover_image_url?: string;
    category?: string;
    tags: string[];
    status: 'draft' | 'published';
    published_at?: string | null;
    preview_html: string;
}

interface Props extends PageProps {
    post: EditablePost | null;
}

export default function PostEdit({ post }: Props) {
    const [tagDraft, setTagDraft] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    const form = useForm({
        title: post?.title ?? '',
        excerpt: post?.excerpt ?? '',
        body: post?.body ?? '',
        cover_image_url: post?.cover_image_url ?? '',
        category: post?.category ?? '',
        tags: post?.tags ?? [],
        status: post?.status ?? 'draft',
        published_at: post?.published_at ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (post) {
            form.patch(route('admin.posts.update', post.id), { preserveScroll: true });
        } else {
            form.post(route('admin.posts.store'));
        }
    };

    const addTag = () => {
        const tag = tagDraft.trim();

        if (tag && !form.data.tags.includes(tag) && form.data.tags.length < 10) {
            form.setData('tags', [...form.data.tags, tag]);
        }

        setTagDraft('');
    };

    return (
        <DashboardLayout header={post ? 'Edit post' : 'New post'}>
            <Head title={post ? `Edit — ${post.title}` : 'New post'} />

            <Link
                href={route('admin.posts.index')}
                className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                All posts
            </Link>

            <form onSubmit={submit} className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
                <div className="card p-6 space-y-5">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium mb-1.5">
                            Title
                        </label>
                        <input
                            id="title"
                            value={form.data.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                            className="input"
                            required
                        />
                        {form.errors.title && <p className="text-xs text-red-500 mt-1">{form.errors.title}</p>}
                    </div>

                    <div>
                        <label htmlFor="excerpt" className="block text-sm font-medium mb-1.5">
                            Excerpt <span className="text-surface-400">— shown on the blog index</span>
                        </label>
                        <textarea
                            id="excerpt"
                            rows={2}
                            value={form.data.excerpt}
                            onChange={(e) => form.setData('excerpt', e.target.value)}
                            className="input"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label htmlFor="body" className="block text-sm font-medium">
                                Body <span className="text-surface-400">— markdown</span>
                            </label>
                            {post && (
                                <button
                                    type="button"
                                    onClick={() => setShowPreview((open) => !open)}
                                    className="inline-flex items-center gap-1.5 text-xs text-surface-500 hover:text-primary-600"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    {showPreview ? 'Hide preview' : 'Preview last save'}
                                </button>
                            )}
                        </div>

                        <textarea
                            id="body"
                            rows={18}
                            value={form.data.body}
                            onChange={(e) => form.setData('body', e.target.value)}
                            className="input font-mono text-sm"
                            required
                        />
                        {form.errors.body && <p className="text-xs text-red-500 mt-1">{form.errors.body}</p>}

                        {showPreview && post && (
                            <div
                                className="prose-gmora mt-5 p-5 rounded-2xl bg-surface-50 dark:bg-surface-800/50"
                                dangerouslySetInnerHTML={{ __html: post.preview_html }}
                            />
                        )}
                    </div>
                </div>

                <aside className="card p-6 space-y-5 lg:sticky lg:top-6">
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium mb-1.5">
                            Status
                        </label>
                        <select
                            id="status"
                            value={form.data.status}
                            onChange={(e) => form.setData('status', e.target.value as 'draft' | 'published')}
                            className="input"
                        >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                        <p className="text-xs text-surface-400 mt-1.5">
                            Drafts are invisible on the public blog.
                        </p>
                    </div>

                    {form.data.status === 'published' && (
                        <div>
                            <label htmlFor="published_at" className="block text-sm font-medium mb-1.5">
                                Publish date <span className="text-surface-400">(optional)</span>
                            </label>
                            <input
                                id="published_at"
                                type="datetime-local"
                                value={form.data.published_at ?? ''}
                                onChange={(e) => form.setData('published_at', e.target.value)}
                                className="input"
                            />
                            <p className="text-xs text-surface-400 mt-1.5">
                                A future date keeps it hidden until then.
                            </p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="category" className="block text-sm font-medium mb-1.5">
                            Category
                        </label>
                        <input
                            id="category"
                            value={form.data.category}
                            onChange={(e) => form.setData('category', e.target.value)}
                            placeholder="Teaching notes"
                            className="input"
                        />
                    </div>

                    <div>
                        <label htmlFor="tag" className="block text-sm font-medium mb-1.5">
                            Tags
                        </label>
                        <div className="flex gap-2">
                            <input
                                id="tag"
                                value={tagDraft}
                                onChange={(e) => setTagDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addTag();
                                    }
                                }}
                                placeholder="Add a tag"
                                className="input"
                            />
                            <button type="button" onClick={addTag} className="btn-secondary py-2 px-4 shrink-0">
                                Add
                            </button>
                        </div>

                        {form.data.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {form.data.tags.map((tag) => (
                                    <span key={tag} className="badge-muted">
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                form.setData('tags', form.data.tags.filter((t) => t !== tag))
                                            }
                                            aria-label={`Remove ${tag}`}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label htmlFor="cover_image_url" className="block text-sm font-medium mb-1.5">
                            Cover image URL
                        </label>
                        <input
                            id="cover_image_url"
                            type="url"
                            value={form.data.cover_image_url}
                            onChange={(e) => form.setData('cover_image_url', e.target.value)}
                            placeholder="https://…"
                            className="input"
                        />
                        {form.errors.cover_image_url && (
                            <p className="text-xs text-red-500 mt-1">{form.errors.cover_image_url}</p>
                        )}
                    </div>

                    <button type="submit" disabled={form.processing} className="btn-primary w-full">
                        {form.processing ? 'Saving…' : post ? 'Save post' : 'Create post'}
                    </button>
                </aside>
            </form>
        </DashboardLayout>
    );
}
