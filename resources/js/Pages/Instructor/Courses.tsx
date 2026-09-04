import { Head, Link, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { Course, PageProps, Paginated } from '@/types';

interface Props extends PageProps {
    courses: Paginated<Course & { enrollments_count: number }>;
    filters: { search?: string; status?: string };
}

const STATUSES = ['draft', 'pending_review', 'published', 'archived'];

export default function InstructorCourses({ courses, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = (patch: Record<string, string>) =>
        router.get('/instructor/courses', { ...filters, search, ...patch }, { preserveState: true, replace: true });

    return (
        <DashboardLayout>
            <Head title="My courses — Instructor" />

            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">Assigned courses</h1>
                <p className="text-sm text-surface-500 mt-1">Open a course to edit content or review curriculum.</p>
            </div>

            <div className="flex items-center gap-3 mb-5 flex-wrap">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        apply({});
                    }}
                    className="relative flex-1 min-w-[220px] max-w-sm"
                >
                    <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by title"
                        className="input pl-9"
                    />
                </form>
                <select
                    value={filters.status ?? ''}
                    onChange={(e) => apply({ status: e.target.value })}
                    className="input max-w-[170px]"
                >
                    <option value="">Any status</option>
                    {STATUSES.map((status) => (
                        <option key={status} value={status}>
                            {status.replace('_', ' ')}
                        </option>
                    ))}
                </select>
            </div>

            <div className="card overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-surface-50 dark:bg-surface-800/50 text-left text-surface-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">Course</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Enrolled</th>
                            <th className="px-4 py-3 font-medium" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                        {courses.data.map((course) => (
                            <tr key={course.id}>
                                <td className="px-4 py-3">
                                    <p className="font-medium text-surface-900 dark:text-white">{course.title}</p>
                                    <p className="text-surface-500">{course.category}</p>
                                </td>
                                <td className="px-4 py-3 capitalize">{course.status?.replace('_', ' ')}</td>
                                <td className="px-4 py-3">{course.enrollments_count}</td>
                                <td className="px-4 py-3 text-right">
                                    <Link
                                        href={`/tutor/courses/${course.id}/edit`}
                                        className="text-primary-600 hover:underline"
                                    >
                                        Open
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {courses.data.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-surface-500">
                                    No courses assigned to you yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </DashboardLayout>
    );
}
