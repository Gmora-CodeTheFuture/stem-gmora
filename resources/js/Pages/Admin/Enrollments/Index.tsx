import { Head, Link, router, useForm } from '@inertiajs/react';
import { Plus, Search, UserPlus } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SystemSelect from '@/Components/SystemSelect';
import { PageProps, Paginated } from '@/types';
import { FormEventHandler, useState } from 'react';

interface Enrollment {
    id: string;
    status: string;
    enrolled_at: string;
    user: { id: string; full_name: string; email: string };
    course: { id: string; title: string; slug: string };
}

interface GrantUser {
    id: string;
    full_name: string;
    email: string;
}

interface GrantCourse {
    id: string;
    title: string;
    price: number;
    currency: string;
}

interface Props extends PageProps {
    enrollments: Paginated<Enrollment>;
    filters: { search?: string; status?: string };
    users: GrantUser[];
    courses: GrantCourse[];
}

const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    completed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    refunded: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    suspended: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export default function EnrollmentsIndex({ enrollments, filters, users, courses }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [showGrant, setShowGrant] = useState(false);

    const grantForm = useForm({
        user_id: '',
        course_id: '',
        record_payment: true as boolean,
    });

    const selectedCourse = courses.find((c) => c.id === grantForm.data.course_id);
    const isPaid = selectedCourse ? Number(selectedCourse.price) > 0 : false;

    const applyFilters = (overrides: Record<string, string>) => {
        router.get('/admin/enrollments', { search, ...overrides }, { preserveState: true, replace: true });
    };

    const submitGrant: FormEventHandler = (e) => {
        e.preventDefault();
        grantForm.post('/admin/enrollments', {
            onSuccess: () => {
                grantForm.reset();
                grantForm.setData('record_payment', true);
                setShowGrant(false);
            },
        });
    };

    return (
        <DashboardLayout>
            <Head title="Enrollments — Admin" />

            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">Enrollments</h1>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-surface-500">{enrollments.total} total</span>
                    <button
                        type="button"
                        onClick={() => setShowGrant((open) => !open)}
                        className="btn-primary text-sm flex items-center gap-1"
                    >
                        <UserPlus className="w-4 h-4" /> Grant access
                    </button>
                </div>
            </div>

            {showGrant && (
                <div className="card p-6 mb-6">
                    <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Grant enrollment
                    </h2>
                    <form onSubmit={submitGrant} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="user_id" value="Student" />
                                <SystemSelect
                                    id="user_id"
                                    value={grantForm.data.user_id || '__none__'}
                                    onValueChange={(v) =>
                                        grantForm.setData('user_id', v === '__none__' ? '' : v)
                                    }
                                    triggerClassName="mt-1 w-full"
                                    options={[
                                        { value: '__none__', label: 'Select user…' },
                                        ...users.map((user) => ({
                                            value: user.id,
                                            label: `${user.full_name} (${user.email})`,
                                        })),
                                    ]}
                                />
                                {grantForm.errors.user_id && (
                                    <p className="text-xs text-red-500 mt-1">{grantForm.errors.user_id}</p>
                                )}
                            </div>
                            <div>
                                <InputLabel htmlFor="course_id" value="Published course" />
                                <SystemSelect
                                    id="course_id"
                                    value={grantForm.data.course_id || '__none__'}
                                    onValueChange={(v) =>
                                        grantForm.setData('course_id', v === '__none__' ? '' : v)
                                    }
                                    triggerClassName="mt-1 w-full"
                                    options={[
                                        { value: '__none__', label: 'Select course…' },
                                        ...courses.map((course) => ({
                                            value: course.id,
                                            label: `${course.title}${
                                                Number(course.price) > 0
                                                    ? ` — ${course.currency} ${course.price}`
                                                    : ' — Free'
                                            }`,
                                        })),
                                    ]}
                                />
                                {grantForm.errors.course_id && (
                                    <p className="text-xs text-red-500 mt-1">{grantForm.errors.course_id}</p>
                                )}
                            </div>
                        </div>

                        {isPaid && (
                            <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                                <input
                                    type="checkbox"
                                    checked={grantForm.data.record_payment}
                                    onChange={(e) => grantForm.setData('record_payment', e.target.checked)}
                                    className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                                />
                                Record completed payment ({selectedCourse?.currency} {selectedCourse?.price})
                            </label>
                        )}

                        <div className="flex items-center gap-3">
                            <PrimaryButton disabled={grantForm.processing}>Grant</PrimaryButton>
                            <button
                                type="button"
                                onClick={() => { setShowGrant(false); grantForm.reset(); }}
                                className="text-sm text-surface-500 hover:text-surface-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card p-4 mb-6 flex flex-wrap items-center gap-3">
                <form onSubmit={(e) => { e.preventDefault(); applyFilters({}); }} className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-surface-400" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search student..." className="flex-1 bg-transparent border-0 text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:ring-0 focus:outline-none" />
                </form>
                <SystemSelect
                    value={filters.status || '__all__'}
                    onValueChange={(status) =>
                        applyFilters({ status: status === '__all__' ? '' : status })
                    }
                    aria-label="Filter by status"
                    triggerClassName="text-sm rounded-lg py-1.5 max-w-[170px]"
                    options={[
                        { value: '__all__', label: 'All statuses' },
                        { value: 'active', label: 'Active' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'refunded', label: 'Refunded' },
                        { value: 'suspended', label: 'Suspended' },
                    ]}
                />
            </div>

            <div className="card overflow-hidden">
                <table className="table-stack w-full text-sm">
                    <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-800 text-left">
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Student</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Course</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Enrolled</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                        {enrollments.data.map((enrollment) => (
                            <tr key={enrollment.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                <td className="px-6 py-4" data-label="">
                                    <p className="font-medium text-surface-900 dark:text-white">{enrollment.user.full_name}</p>
                                    <p className="text-xs text-surface-500">{enrollment.user.email}</p>
                                </td>
                                <td className="px-6 py-4 text-surface-600 dark:text-surface-400" data-label="Course">{enrollment.course.title}</td>
                                <td className="px-6 py-4" data-label="Status">
                                    <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${statusColors[enrollment.status] || ''}`}>
                                        {enrollment.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-surface-500 text-xs" data-label="Enrolled">{new Date(enrollment.enrolled_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4" data-actions>
                                    <SystemSelect
                                        value={enrollment.status}
                                        onValueChange={(status) =>
                                            router.patch(`/admin/enrollments/${enrollment.id}`, { status })
                                        }
                                        aria-label={`Status for ${enrollment.user.full_name}`}
                                        triggerClassName="text-xs rounded-lg py-1 max-w-[140px]"
                                        options={[
                                            { value: 'active', label: 'Active' },
                                            { value: 'completed', label: 'Completed' },
                                            { value: 'refunded', label: 'Refunded' },
                                            { value: 'suspended', label: 'Suspended' },
                                        ]}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {enrollments.last_page > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    {enrollments.links.map((link, i) => (
                        <Link key={i} href={link.url || '#'}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${link.active ? 'bg-primary-600 text-white' : link.url ? 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800' : 'text-surface-300 cursor-not-allowed'}`}
                            dangerouslySetInnerHTML={{ __html: link.label }} />
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
