import { Head, useForm, router } from '@inertiajs/react';
import { Award, Trash2, Plus, Edit } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import { PageProps } from '@/types';
import { useState, FormEventHandler } from 'react';

interface Badge {
    id: string;
    name: string;
    description: string;
    type: string;
    icon_url?: string;
    users_count: number;
}

interface Props extends PageProps {
    badges: Badge[];
}

export default function BadgesIndex({ badges }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { data, setData, post, patch, reset, processing, errors } = useForm({
        name: '',
        description: '',
        type: 'achievement',
        icon_url: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (editingId) {
            patch(`/admin/badges/${editingId}`, { onSuccess: () => { reset(); setEditingId(null); setShowForm(false); } });
        } else {
            post('/admin/badges', { onSuccess: () => { reset(); setShowForm(false); } });
        }
    };

    const startEdit = (badge: Badge) => {
        setData({ name: badge.name, description: badge.description, type: badge.type, icon_url: badge.icon_url || '' });
        setEditingId(badge.id);
        setShowForm(true);
    };

    return (
        <DashboardLayout>
            <Head title="Badges — Admin" />

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">Badges</h1>
                <button onClick={() => { reset(); setEditingId(null); setShowForm(!showForm); }}
                    className="btn-primary text-sm flex items-center gap-1">
                    <Plus className="w-4 h-4" /> New Badge
                </button>
            </div>

            {/* Create/Edit Form */}
            {showForm && (
                <div className="card p-6 mb-6">
                    <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">{editingId ? 'Edit Badge' : 'New Badge'}</h2>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="name" value="Name" />
                                <TextInput id="name" className="mt-1 block w-full" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                            </div>
                            <div>
                                <InputLabel htmlFor="type" value="Type" />
                                <select id="type" value={data.type} onChange={(e) => setData('type', e.target.value)}
                                    className="mt-1 block w-full border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 focus:border-primary-500 focus:ring-primary-500 rounded-md shadow-sm">
                                    <option value="achievement">Achievement</option>
                                    <option value="course_completion">Course Completion</option>
                                    <option value="level_up">Level Up</option>
                                    <option value="streak">Streak</option>
                                    <option value="special">Special</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <InputLabel htmlFor="description" value="Description" />
                            <textarea id="description" className="mt-1 block w-full border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 focus:border-primary-500 focus:ring-primary-500 rounded-md shadow-sm"
                                value={data.description} onChange={(e) => setData('description', e.target.value)} rows={2} required />
                        </div>
                        <div className="flex items-center gap-3">
                            <PrimaryButton disabled={processing}>{editingId ? 'Update' : 'Create'}</PrimaryButton>
                            <button type="button" onClick={() => { setShowForm(false); reset(); setEditingId(null); }}
                                className="text-sm text-surface-500 hover:text-surface-700">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Badge Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {badges.map((badge) => (
                    <div key={badge.id} className="card p-5 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950 flex items-center justify-center shrink-0">
                            <Award className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-surface-900 dark:text-white">{badge.name}</h3>
                            <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{badge.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500 font-medium">{badge.type}</span>
                                <span className="text-xs text-surface-400">{badge.users_count} earned</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <button onClick={() => startEdit(badge)} className="btn-icon" title="Edit"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => { if (confirm(`Delete badge "${badge.name}"?`)) router.delete(`/admin/badges/${badge.id}`); }}
                                className="btn-icon text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
                {badges.length === 0 && (
                    <div className="col-span-full text-center py-12 text-surface-500">No badges yet. Create one to get started.</div>
                )}
            </div>
        </DashboardLayout>
    );
}
