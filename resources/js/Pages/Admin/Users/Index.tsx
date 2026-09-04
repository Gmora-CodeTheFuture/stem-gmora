import { Head, Link, router, useForm } from '@inertiajs/react';
import { Search, Edit, Trash2, RotateCcw, Plus, UserPlus } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import { PageProps, Paginated, User, Role } from '@/types';
import { FormEventHandler, useState } from 'react';

interface Props extends PageProps {
    users: Paginated<User & { enrollments_count: number }>;
    roles: Role[];
    filters: { search?: string; role?: string };
}

export default function UsersIndex({ users, roles, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [showCreate, setShowCreate] = useState(false);

    const createForm = useForm({
        full_name: '',
        email: '',
        role_id: roles.find((r) => r.name === 'student')?.id || roles[0]?.id || '',
        password: '',
    });

    const applyFilters = (overrides: Record<string, string>) => {
        router.get('/admin/users', { search, ...overrides }, { preserveState: true, replace: true });
    };

    const submitCreate: FormEventHandler = (e) => {
        e.preventDefault();
        createForm.post('/admin/users', {
            onSuccess: () => {
                createForm.reset();
                setShowCreate(false);
            },
        });
    };

    return (
        <DashboardLayout>
            <Head title="Users — Admin" />

            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">Users</h1>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-surface-500">{users.total} total</span>
                    <button
                        type="button"
                        onClick={() => setShowCreate((open) => !open)}
                        className="btn-primary text-sm flex items-center gap-1"
                    >
                        <UserPlus className="w-4 h-4" /> Create user
                    </button>
                </div>
            </div>

            {showCreate && (
                <div className="card p-6 mb-6">
                    <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
                        <Plus className="w-4 h-4" /> New user
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
                                <InputLabel htmlFor="role_id" value="Role" />
                                <select
                                    id="role_id"
                                    value={createForm.data.role_id}
                                    onChange={(e) => createForm.setData('role_id', e.target.value)}
                                    className="mt-1 block w-full border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 focus:border-primary-500 focus:ring-primary-500 rounded-md shadow-sm"
                                    required
                                >
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id}>{role.display_name}</option>
                                    ))}
                                </select>
                                {createForm.errors.role_id && (
                                    <p className="text-xs text-red-500 mt-1">{createForm.errors.role_id}</p>
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
                        </div>
                        <div className="flex items-center gap-3">
                            <PrimaryButton disabled={createForm.processing}>Create</PrimaryButton>
                            <button
                                type="button"
                                onClick={() => { setShowCreate(false); createForm.reset(); }}
                                className="text-sm text-surface-500 hover:text-surface-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filters */}
            <div className="card p-4 mb-6 flex flex-wrap items-center gap-3">
                <form onSubmit={(e) => { e.preventDefault(); applyFilters({}); }} className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-surface-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="flex-1 bg-transparent border-0 text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:ring-0 focus:outline-none"
                    />
                </form>
                <select
                    value={filters.role || ''}
                    onChange={(e) => applyFilters({ role: e.target.value })}
                    className="w-full sm:w-auto text-sm border border-surface-200 dark:border-surface-700 dark:bg-surface-800 rounded-lg px-3 py-2 pr-8 text-surface-700 dark:text-surface-300"
                >
                    <option value="">All roles</option>
                    {roles.map((role) => (
                        <option key={role.id} value={role.name}>{role.display_name}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <table className="table-stack w-full text-sm">
                    <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-800 text-left">
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Enrollments</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Joined</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                        {users.data.map((user) => (
                            <tr key={user.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                <td className="px-6 py-4" data-label="">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-500">
                                            {user.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <Link
                                                href={`/admin/users/${user.id}`}
                                                className="font-medium text-surface-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                                            >
                                                {user.full_name}
                                            </Link>
                                            <p className="text-xs text-surface-500">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4" data-label="Role">
                                    <span className="text-xs px-2 py-1 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 font-medium">
                                        {user.role?.display_name || user.role?.name}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-surface-600 dark:text-surface-400" data-label="Enrollments">{user.enrollments_count}</td>
                                <td className="px-6 py-4 text-surface-500 text-xs" data-label="Joined">{new Date(user.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4" data-actions>
                                    <div className="flex items-center gap-1">
                                        <Link href={`/admin/users/${user.id}/edit`} className="btn-icon" title="Edit">
                                            <Edit className="w-4 h-4" />
                                        </Link>
                                        <button
                                            onClick={() => { if (confirm(`Delete "${user.full_name}"?`)) router.delete(`/admin/users/${user.id}`); }}
                                            className="btn-icon text-red-500 hover:text-red-700"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => { if (confirm(`Send password reset to ${user.email}?`)) router.post(`/admin/users/${user.id}/reset-password`); }}
                                            className="btn-icon"
                                            title="Reset password"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {users.last_page > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    {users.links.map((link, i) => (
                        <Link
                            key={i}
                            href={link.url || '#'}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                link.active
                                    ? 'bg-primary-600 text-white'
                                    : link.url
                                    ? 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                                    : 'text-surface-300 dark:text-surface-700 cursor-not-allowed'
                            }`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
