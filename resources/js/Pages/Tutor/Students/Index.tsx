import { Head, Link, router } from '@inertiajs/react';
import { Search, Mail, BookOpen } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps, Paginated } from '@/types';
import { useState } from 'react';

interface Student {
    id: string;
    full_name: string;
    email: string;
    enrolled_at: string;
    status: string;
    progress: number;
    course_title: string;
    course_id: string;
}

interface Props extends PageProps {
    students: Paginated<Student>;
    courses: Array<{ id: string; title: string }>;
    filters: { search?: string; course?: string };
}

export default function TutorStudentsIndex({ students, courses, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    const applyFilters = (overrides: Record<string, string>) => {
        router.get('/tutor/students', { search, ...overrides }, { preserveState: true, replace: true });
    };

    return (
        <DashboardLayout>
            <Head title="My Students — Tutor" />

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">My Students</h1>
                <span className="text-sm text-surface-500">{students.total} total enrollments</span>
            </div>

            <div className="card p-4 mb-6 flex flex-wrap items-center gap-3">
                <form onSubmit={(e) => { e.preventDefault(); applyFilters({}); }} className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-surface-400" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by student name..." className="flex-1 bg-transparent border-0 text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:ring-0 focus:outline-none" />
                </form>
                <select value={filters.course || ''} onChange={(e) => applyFilters({ course: e.target.value })}
                    className="text-sm border border-surface-200 dark:border-surface-700 dark:bg-surface-800 rounded-lg px-3 py-1.5 text-surface-700 dark:text-surface-300">
                    <option value="">All my courses</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
            </div>

            <div className="card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-800 text-left">
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Student</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Course</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Progress</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Enrolled</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Contact</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                        {students.data.map((student) => (
                            <tr key={`${student.id}-${student.course_id}`} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-500">
                                            {student.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-surface-900 dark:text-white">{student.full_name}</p>
                                            <p className="text-xs text-surface-500">{student.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-surface-400" />
                                        <span className="text-surface-600 dark:text-surface-400">{student.course_title}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden w-24">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${student.progress}%` }}></div>
                                        </div>
                                        <span className="text-xs text-surface-500">{Math.round(student.progress)}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-surface-500 text-xs">
                                    {new Date(student.enrolled_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    <a href={`mailto:${student.email}`} className="btn-icon" title={`Email ${student.full_name}`}>
                                        <Mail className="w-4 h-4" />
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {students.last_page > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    {students.links.map((link, i) => (
                        <Link key={i} href={link.url || '#'}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${link.active ? 'bg-primary-600 text-white' : link.url ? 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800' : 'text-surface-300 cursor-not-allowed'}`}
                            dangerouslySetInnerHTML={{ __html: link.label }} />
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
