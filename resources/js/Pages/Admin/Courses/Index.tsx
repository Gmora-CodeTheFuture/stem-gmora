import { Head, Link, router } from '@inertiajs/react';
import { Search, Edit, Trash2, Eye, CheckCircle, XCircle } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps, Paginated, Course } from '@/types';
import { useState } from 'react';

interface Props extends PageProps {
    courses: Paginated<Course & { enrollments_count: number; instructor?: { full_name: string } }>;
    categories: string[];
    instructors: Array<{ id: string; full_name: string }>;
    filters: { search?: string; status?: string; category?: string; instructor?: string };
}

const statusColors: Record<string, string> = {
    published: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    draft: 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400',
    pending_review: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    archived: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export default function CoursesIndex({ courses, categories, instructors, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    const applyFilters = (overrides: Record<string, string>) => {
        router.get('/admin/courses', { search, ...overrides }, { preserveState: true, replace: true });
    };

    return (
        <DashboardLayout>
            <Head title="Courses — Admin" />

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">All Courses</h1>
                <Link href="/admin/courses/create" className="btn-primary text-sm">+ New Course</Link>
            </div>

            {/* Filters */}
            <div className="card p-4 mb-6 flex flex-wrap items-center gap-3">
                <form onSubmit={(e) => { e.preventDefault(); applyFilters({}); }} className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-surface-400" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search courses..." className="flex-1 bg-transparent border-0 text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:ring-0 focus:outline-none" />
                </form>
                <select value={filters.status || ''} onChange={(e) => applyFilters({ status: e.target.value })}
                    className="text-sm border border-surface-200 dark:border-surface-700 dark:bg-surface-800 rounded-lg px-3 py-1.5 text-surface-700 dark:text-surface-300">
                    <option value="">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                </select>
                <select value={filters.category || ''} onChange={(e) => applyFilters({ category: e.target.value })}
                    className="text-sm border border-surface-200 dark:border-surface-700 dark:bg-surface-800 rounded-lg px-3 py-1.5 text-surface-700 dark:text-surface-300">
                    <option value="">All categories</option>
                    {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-800 text-left">
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Course</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Instructor</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Students</th>
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
                                <td className="px-6 py-4 text-surface-600 dark:text-surface-400">{course.instructor?.full_name || '—'}</td>
                                <td className="px-6 py-4">
                                    <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${statusColors[course.status] || ''}`}>{course.status}</span>
                                </td>
                                <td className="px-6 py-4 text-surface-600 dark:text-surface-400">{course.enrollments_count}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1">
                                        <Link href={`/admin/courses/${course.id}/edit`} className="btn-icon" title="Edit"><Edit className="w-4 h-4" /></Link>
                                        {course.status !== 'published' ? (
                                            <button onClick={() => router.patch(`/admin/courses/${course.id}/status`, { status: 'published' })}
                                                className="btn-icon text-emerald-500" title="Publish">
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button onClick={() => router.patch(`/admin/courses/${course.id}/status`, { status: 'draft' })}
                                                className="btn-icon text-amber-500" title="Unpublish">
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button onClick={() => { if (confirm(`Delete "${course.title}"?`)) router.delete(`/admin/courses/${course.id}`); }}
                                            className="btn-icon text-red-500 hover:text-red-700" title="Delete">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {courses.last_page > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    {courses.links.map((link, i) => (
                        <Link key={i} href={link.url || '#'}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${link.active ? 'bg-primary-600 text-white' : link.url ? 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800' : 'text-surface-300 cursor-not-allowed'}`}
                            dangerouslySetInnerHTML={{ __html: link.label }} />
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
