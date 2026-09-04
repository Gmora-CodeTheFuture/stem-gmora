import { Head, useForm, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Plus, Tag, Trash2, Edit } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import { PageProps } from '@/types';

interface PromoCodeRow {
    id: string;
    code: string;
    type: string;
    value: number;
    currency: string;
    course_id: string | null;
    course_title?: string | null;
    max_uses: number | null;
    current_uses: number;
    valid_from: string | null;
    valid_until: string | null;
    is_active: boolean;
}

interface Props extends PageProps {
    promoCodes: PromoCodeRow[];
    courses: Array<{ id: string; title: string }>;
}

export default function PromoCodesIndex({ promoCodes, courses }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data, setData, post, patch, reset, processing, errors, transform } = useForm({
        code: '',
        type: 'percentage',
        value: 10 as number,
        currency: 'USD',
        course_id: '' as string | null,
        max_uses: '' as string | number | null,
        valid_from: '' as string | null,
        valid_until: '' as string | null,
        is_active: true,
    });

    transform((form) => ({
        ...form,
        course_id: form.course_id || null,
        max_uses: form.max_uses === '' || form.max_uses === null ? null : Number(form.max_uses),
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
    }));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (editingId) {
            patch(`/admin/promo-codes/${editingId}`, {
                onSuccess: () => { reset(); setEditingId(null); setShowForm(false); },
            });
        } else {
            post('/admin/promo-codes', {
                onSuccess: () => { reset(); setShowForm(false); },
            });
        }
    };

    const startEdit = (row: PromoCodeRow) => {
        setData({
            code: row.code,
            type: row.type,
            value: row.value,
            currency: row.currency,
            course_id: row.course_id || '',
            max_uses: row.max_uses ?? '',
            valid_from: row.valid_from || '',
            valid_until: row.valid_until || '',
            is_active: row.is_active,
        });
        setEditingId(row.id);
        setShowForm(true);
    };

    return (
        <DashboardLayout>
            <Head title="Promo codes — Admin" />

            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">Promo codes</h1>
                <button
                    type="button"
                    onClick={() => { reset(); setEditingId(null); setShowForm((open) => !open); }}
                    className="btn-primary text-sm flex items-center gap-1"
                >
                    <Plus className="w-4 h-4" /> New code
                </button>
            </div>

            {showForm && (
                <div className="card p-6 mb-6">
                    <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
                        {editingId ? 'Edit promo code' : 'New promo code'}
                    </h2>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="code" value="Code" />
                                <TextInput
                                    id="code"
                                    className="mt-1 block w-full uppercase"
                                    value={data.code}
                                    onChange={(e) => setData('code', e.target.value)}
                                    required
                                />
                                {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
                            </div>
                            <div>
                                <InputLabel htmlFor="type" value="Type" />
                                <select
                                    id="type"
                                    value={data.type}
                                    onChange={(e) => setData('type', e.target.value)}
                                    className="mt-1 block w-full border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 focus:border-primary-500 focus:ring-primary-500 rounded-md shadow-sm"
                                >
                                    <option value="percentage">Percentage</option>
                                    <option value="fixed">Fixed amount</option>
                                </select>
                            </div>
                            <div>
                                <InputLabel htmlFor="value" value="Value" />
                                <TextInput
                                    id="value"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className="mt-1 block w-full"
                                    value={data.value}
                                    onChange={(e) => setData('value', Number(e.target.value))}
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel htmlFor="currency" value="Currency" />
                                <TextInput
                                    id="currency"
                                    className="mt-1 block w-full uppercase"
                                    value={data.currency}
                                    onChange={(e) => setData('currency', e.target.value)}
                                    maxLength={3}
                                    required
                                />
                            </div>
                            <div>
                                <InputLabel htmlFor="course_id" value="Course (optional)" />
                                <select
                                    id="course_id"
                                    value={data.course_id || ''}
                                    onChange={(e) => setData('course_id', e.target.value)}
                                    className="mt-1 block w-full border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 focus:border-primary-500 focus:ring-primary-500 rounded-md shadow-sm"
                                >
                                    <option value="">All courses</option>
                                    {courses.map((course) => (
                                        <option key={course.id} value={course.id}>{course.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel htmlFor="max_uses" value="Max uses (optional)" />
                                <TextInput
                                    id="max_uses"
                                    type="number"
                                    min={1}
                                    className="mt-1 block w-full"
                                    value={data.max_uses ?? ''}
                                    onChange={(e) => setData('max_uses', e.target.value)}
                                />
                            </div>
                            <div>
                                <InputLabel htmlFor="valid_from" value="Valid from" />
                                <TextInput
                                    id="valid_from"
                                    type="datetime-local"
                                    className="mt-1 block w-full"
                                    value={data.valid_from || ''}
                                    onChange={(e) => setData('valid_from', e.target.value)}
                                />
                            </div>
                            <div>
                                <InputLabel htmlFor="valid_until" value="Valid until" />
                                <TextInput
                                    id="valid_until"
                                    type="datetime-local"
                                    className="mt-1 block w-full"
                                    value={data.valid_until || ''}
                                    onChange={(e) => setData('valid_until', e.target.value)}
                                />
                            </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                            />
                            Active
                        </label>

                        <div className="flex items-center gap-3">
                            <PrimaryButton disabled={processing}>{editingId ? 'Update' : 'Create'}</PrimaryButton>
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); reset(); setEditingId(null); }}
                                className="text-sm text-surface-500 hover:text-surface-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card overflow-hidden">
                <table className="table-stack w-full text-sm">
                    <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-800 text-left">
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Code</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Discount</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Scope</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Uses</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                        {promoCodes.map((row) => (
                            <tr key={row.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                <td className="px-6 py-4" data-label="">
                                    <span className="inline-flex items-center gap-1.5 font-mono font-medium text-surface-900 dark:text-white">
                                        <Tag className="w-3.5 h-3.5 text-surface-400" />
                                        {row.code}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-surface-600 dark:text-surface-400" data-label="Discount">
                                    {row.type === 'percentage' ? `${row.value}%` : `${row.currency} ${row.value}`}
                                </td>
                                <td className="px-6 py-4 text-surface-600 dark:text-surface-400" data-label="Scope">
                                    {row.course_title || 'All courses'}
                                </td>
                                <td className="px-6 py-4 text-surface-600 dark:text-surface-400" data-label="Uses">
                                    {row.current_uses}{row.max_uses != null ? ` / ${row.max_uses}` : ''}
                                </td>
                                <td className="px-6 py-4" data-label="Status">
                                    <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${
                                        row.is_active
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-surface-100 dark:bg-surface-800 text-surface-500'
                                    }`}>
                                        {row.is_active ? 'active' : 'inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4" data-actions>
                                    <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => startEdit(row)} className="btn-icon" title="Edit">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (confirm(`Delete promo code "${row.code}"?`)) {
                                                    router.delete(`/admin/promo-codes/${row.id}`);
                                                }
                                            }}
                                            className="btn-icon text-red-500"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {promoCodes.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-surface-500">
                                    No promo codes yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </DashboardLayout>
    );
}
