import { Head, Link, router, useForm } from '@inertiajs/react';
import { BookOpen, Plus, Search, UserPlus, Users } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { PageProps, Paginated, User } from '@/types';

interface Props extends PageProps {
    instructors: Paginated<User & { courses_count: number; assigned_students_count: number }>;
    filters: { search?: string };
}

export default function InstructorsIndex({ instructors, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [showCreate, setShowCreate] = useState(false);

    const createForm = useForm({
        full_name: '',
        email: '',
        password: '',
        headline: '',
    });

    const applySearch = () => {
        router.get('/admin/instructors', { search }, { preserveState: true, replace: true });
    };

    const submitCreate: FormEventHandler = (e) => {
        e.preventDefault();
        createForm.post('/admin/instructors', {
            onSuccess: () => {
                createForm.reset();
                setShowCreate(false);
            },
        });
    };

    return (
        <DashboardLayout>
            <Head title="Instructors — Admin" />

            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">Instructors</h1>
                <button
                    type="button"
                    onClick={() => setShowCreate((open) => !open)}
                    className="btn-primary text-sm flex items-center gap-1"
                >
                    <UserPlus className="w-4 h-4" /> Create instructor
                </button>
            </div>

            {showCreate && (
                <div className="card p-6 mb-6">
                    <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
                        <Plus className="w-4 h-4" /> New instructor
                    </h2>
                    <form onSubmit={submitCreate} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="full_name" value="Full name" />
                                <TextInput
                                    id="full_name"
                                    className="mt-1 block w-full"
                                    value={createForm.data.full_name}
                                    onChange={(e) => createForm.setData('full_name', e.target.value)}
                                    required
                                />
                                {createForm.errors.full_name && (
                                    <p className="text-xs text-red-500 mt-1">{createForm.errors.full_name}</p>
                                )}
                            </div>
                            <div>
                                <InputLabel htmlFor="email" value="Email" />
                                <TextInput
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    value={createForm.data.email}
                                    onChange={(e) => createForm.setData('email', e.target.value)}
                                    required
                                />
                                {createForm.errors.email && (
                                    <p className="text-xs text-red-500 mt-1">{createForm.errors.email}</p>
                                )}
                            </div>
                            <div>
                                <InputLabel htmlFor="password" value="Temporary password" />
                                <TextInput
                                    id="password"
                                    type="password"
                                    className="mt-1 block w-full"
                                    value={createForm.data.password}
                                    onChange={(e) => createForm.setData('password', e.target.value)}
                                    required
                                    minLength={8}
                                />
                                {createForm.errors.password && (
                                    <p className="text-xs text-red-500 mt-1">{createForm.errors.password}</p>
                                )}
                            </div>
                            <div>
                                <InputLabel htmlFor="headline" value="Headline" />
                                <TextInput
                                    id="headline"
                                    className="mt-1 block w-full"
                                    value={createForm.data.headline}
                                    onChange={(e) => createForm.setData('headline', e.target.value)}
                                    placeholder="e.g. STEM mentor"
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn-primary text-sm" disabled={createForm.processing}>
                            Create instructor
                        </button>
                    </form>
                </div>
            )}

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    applySearch();
                }}
                className="relative max-w-sm mb-5"
            >
                <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search instructors"
                    className="input pl-9"
                />
            </form>

            <div className="card overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-surface-50 dark:bg-surface-800/50 text-left text-surface-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">Instructor</th>
                            <th className="px-4 py-3 font-medium">Courses</th>
                            <th className="px-4 py-3 font-medium">Students</th>
                            <th className="px-4 py-3 font-medium" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                        {instructors.data.map((instructor) => (
                            <tr key={instructor.id}>
                                <td className="px-4 py-3">
                                    <p className="font-medium text-surface-900 dark:text-white">{instructor.full_name}</p>
                                    <p className="text-surface-500">{instructor.email}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1.5">
                                        <BookOpen className="w-3.5 h-3.5 text-surface-400" />
                                        {instructor.courses_count}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5 text-surface-400" />
                                        {instructor.assigned_students_count}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <Link
                                        href={`/admin/users/${instructor.id}`}
                                        className="text-primary-600 hover:underline"
                                    >
                                        View
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {instructors.data.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-surface-500">
                                    No instructors yet. Create one to assign students and courses.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </DashboardLayout>
    );
}
