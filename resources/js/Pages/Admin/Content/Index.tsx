import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Eye, EyeOff, Plus, RotateCcw, Trash2 } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

type FieldDef = { label: string; type: 'text' | 'textarea' };
type RepeatItem = Record<string, string>;
type BlockContent = { items?: RepeatItem[] } & Record<string, string | RepeatItem[] | undefined>;

interface Section {
    key: string;
    page: string;
    label: string;
    fields: Record<string, FieldDef> | null;
    repeat: Record<string, FieldDef> | null;
    content: BlockContent;
    is_published: boolean;
    is_customised: boolean;
    updated_at: string | null;
}

interface Props extends PageProps {
    sections: Section[];
    pages: string[];
}

function SectionEditor({ section }: { section: Section }) {
    // Inertia's form types reject `unknown`, so the block shape is explicit:
    // plain string fields, plus an optional list of string-keyed items.
    const form = useForm<{ content: BlockContent; is_published: boolean }>({
        content: section.content,
        is_published: section.is_published,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.patch(route('admin.content.update', section.key), { preserveScroll: true });
    };

    const items = form.data.content.items ?? [];

    // Narrowing helper: a block holds either text fields or a list, never both.
    const textValue = (key: string): string => {
        const value = form.data.content[key];

        return typeof value === 'string' ? value : '';
    };

    const setItems = (next: RepeatItem[]) =>
        form.setData('content', { ...form.data.content, items: next });

    // Captured once so TypeScript keeps the narrowing inside the callbacks.
    const repeat = section.repeat;

    return (
        <form onSubmit={submit} className="card p-6">
            <div className="flex items-start gap-3 mb-5">
                <div className="flex-1">
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white">{section.label}</h2>
                    <p className="text-xs text-surface-400 mt-0.5">
                        <code>{section.key}</code>
                        {section.is_customised
                            ? ` · edited ${new Date(section.updated_at!).toLocaleDateString()}`
                            : ' · showing default copy'}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => form.setData('is_published', !form.data.is_published)}
                    className={`badge ${
                        form.data.is_published
                            ? 'bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-300'
                            : 'bg-surface-100 text-surface-500 dark:bg-surface-800'
                    }`}
                >
                    {form.data.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {form.data.is_published ? 'Live' : 'Hidden'}
                </button>
            </div>

            {/* Single-value fields */}
            {section.fields && (
                <div className="space-y-4">
                    {Object.entries(section.fields).map(([key, field]) => (
                        <div key={key}>
                            <label htmlFor={`${section.key}-${key}`} className="block text-sm font-medium mb-1.5">
                                {field.label}
                            </label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    id={`${section.key}-${key}`}
                                    rows={3}
                                    value={textValue(key)}
                                    onChange={(e) =>
                                        form.setData('content', { ...form.data.content, [key]: e.target.value })
                                    }
                                    className="input"
                                />
                            ) : (
                                <input
                                    id={`${section.key}-${key}`}
                                    value={textValue(key)}
                                    onChange={(e) =>
                                        form.setData('content', { ...form.data.content, [key]: e.target.value })
                                    }
                                    className="input"
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Repeatable list */}
            {repeat && (
                <div className="space-y-3">
                    {items.map((item, index) => (
                        <div key={index} className="flex items-end gap-3">
                            {Object.entries(repeat).map(([key, field]) => (
                                <div key={key} className="flex-1">
                                    <label
                                        htmlFor={`${section.key}-${index}-${key}`}
                                        className="block text-xs font-medium mb-1"
                                    >
                                        {field.label}
                                    </label>
                                    <input
                                        id={`${section.key}-${index}-${key}`}
                                        value={item[key] ?? ''}
                                        onChange={(e) => {
                                            const next = [...items];
                                            next[index] = { ...next[index], [key]: e.target.value };
                                            setItems(next);
                                        }}
                                        className="input"
                                    />
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={() => setItems(items.filter((_, i) => i !== index))}
                                className="btn-icon hover:text-red-500 mb-0.5"
                                aria-label={`Remove item ${index + 1}`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={() =>
                            setItems([
                                ...items,
                                Object.fromEntries(Object.keys(repeat).map((k) => [k, ''])) as RepeatItem,
                            ])
                        }
                        className="btn-secondary py-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add item
                    </button>
                </div>
            )}

            <div className="flex items-center gap-3 mt-6 pt-5 border-t border-surface-100 dark:border-surface-800">
                <button type="submit" disabled={form.processing} className="btn-primary">
                    {form.processing ? 'Saving…' : 'Save section'}
                </button>

                {section.is_customised && (
                    <button
                        type="button"
                        onClick={() =>
                            router.delete(route('admin.content.destroy', section.key), { preserveScroll: true })
                        }
                        className="btn-ghost"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset to default
                    </button>
                )}
            </div>
        </form>
    );
}

export default function ContentIndex({ sections, pages }: Props) {
    const [page, setPage] = useState(pages[0] ?? 'home');

    return (
        <DashboardLayout header="Website copy">
            <Head title="Website copy — Admin" />

            <div className="inline-flex p-1 rounded-full bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 mb-6">
                {pages.map((name) => (
                    <button
                        key={name}
                        onClick={() => setPage(name)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                            page === name
                                ? 'bg-white dark:bg-surface-800 text-surface-900 dark:text-white shadow-card'
                                : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
                        }`}
                    >
                        {name}
                    </button>
                ))}
            </div>

            <p className="text-sm text-surface-500 mb-5">
                Edits go live immediately. Hiding a section falls back to the copy the site ships with, so a page is
                never left blank.
            </p>

            <div className="space-y-5 max-w-3xl">
                {sections
                    .filter((section) => section.page === page)
                    .map((section) => (
                        <SectionEditor key={section.key} section={section} />
                    ))}
            </div>
        </DashboardLayout>
    );
}
