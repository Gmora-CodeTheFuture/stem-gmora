import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { BookOpen, Search, Trash2 } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps, Paginated, Course, User } from '@/types';

interface Props extends PageProps {
    courses: Paginated<Course & { enrollments_count: number; instructor?: Pick<User, 'id' | 'full_name'> }>;
    categories: string[];
    filters: { search?: string; status?: string; category?: string };
}

const STATUSES = ['draft', 'pending_review', 'published', 'archived'];

const statusColors: Record<string, string> = {
    published: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    draft: 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400',
    pending_review: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    archived: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export default function CoursesIndex({ courses, categories, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = (patch: Record<string, string>) =>
        router.get('/tutor/courses', { ...filters, search, ...patch }, { preserveState: true, replace: true });

    const remove = (course: Course) => {
        if (confirm(`Delete "${course.title}" and everything inside it?`)) {
            router.delete(`/tutor/courses/${course.id}`, { preserveScroll: true });
        }
    };

    return (
        <DashboardLayout>
            <Head title="Courses — Gmora STEM" />

            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">Courses</h1>
                <Link href="/tutor/courses/create" className="btn-primary text-sm">+ New course</Link>
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
                        aria-label="Search courses"
                        className="input pl-9"
                    />
                </form>

                <select
                    value={filters.status ?? ''}
                    onChange={(e) => apply({ status: e.target.value })}
                    aria-label="Filter by status"
                    className="input max-w-[170px]"
                >
                    <option value="">Any status</option>
                    {STATUSES.map((status) => (
                        <option key={status} value={status}>
                            {status.replace('_', ' ')}
                        </option>
                    ))}
                </select>

                <select
                    value={filters.category ?? ''}
                    onChange={(e) => apply({ category: e.target.value })}
                    aria-label="Filter by category"
                    className="input max-w-[180px]"
                >
                    <option value="">Any category</option>
                    {categories.map((category) => (
                        <option key={category} value={category}>
                            {category}
                        </option>
                    ))}
                </select>
            </div>

            {courses.data.length === 0 ? (
                <div className="card p-12 text-center">
                    <BookOpen className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1.5">No courses here</h2>
                    <p className="text-sm text-surface-500">
                        {filters.search || filters.status || filters.category
                            ? 'Nothing matches these filters.'
                            : 'Create the first one to get started.'}
                    </p>
                </div>
            ) : (
                <div className="card overflow-x-auto">
                    <table className="w-full text-sm min-w-[46rem]">
                        <thead>
                            <tr className="border-b border-surface-200 dark:border-surface-800 text-left">
                                <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Course</th>
                                <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Author</th>
                                <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Students</th>
                                <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Lessons</th>
                                <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                            {courses.data.map((course) => (
                                <tr key={course.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-surface-900 dark:text-white">{course.title}</p>
                                        <p className="text-xs text-surface-500">{course.category} · {course.difficulty}</p>
                                    </td>
                                    <td className="px-6 py-4 text-surface-600 dark:text-surface-400">
                                        {course.instructor?.full_name ?? '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[11px] px-2 py-1 rounded-full font-medium capitalize ${statusColors[course.status]}`}>
                                            {course.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-surface-600 dark:text-surface-400">{course.enrollments_count}</td>
                                    <td className="px-6 py-4 text-surface-600 dark:text-surface-400">{course.total_lessons}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Link href={`/tutor/courses/${course.id}/edit`} className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">Edit</Link>
                                            <Link href={`/tutor/courses/${course.id}/students`} className="text-sm text-surface-500 hover:text-surface-700">Students</Link>
                                            <button onClick={() => remove(course)} className="btn-icon text-red-500" title={`Delete ${course.title}`}>
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {courses.last_page > 1 && (
                <nav className="flex justify-center gap-1 mt-6" aria-label="Pagination">
                    {courses.links.map((link, i) => (
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
        </DashboardLayout>
    );
}
