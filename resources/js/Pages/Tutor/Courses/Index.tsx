import { Head, Link } from '@inertiajs/react';
import { BookOpen } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps, Paginated, Course } from '@/types';

interface Props extends PageProps {
    courses: Paginated<Course & { enrollments_count: number }>;
}

const statusColors: Record<string, string> = {
    published: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    draft: 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400',
    pending_review: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    archived: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export default function TutorCoursesIndex({ courses }: Props) {
    return (
        <DashboardLayout>
            <Head title="My Courses — Tutor" />

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">My Courses</h1>
                <Link href="/tutor/courses/create" className="btn-primary text-sm">+ New Course</Link>
            </div>

            <div className="card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-800 text-left">
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Course</th>
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
                                <td className="px-6 py-4">
                                    <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${statusColors[course.status]}`}>{course.status}</span>
                                </td>
                                <td className="px-6 py-4 text-surface-600 dark:text-surface-400">{course.enrollments_count}</td>
                                <td className="px-6 py-4 text-surface-600 dark:text-surface-400">{course.total_lessons}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <Link href={`/tutor/courses/${course.id}/edit`} className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">Edit</Link>
                                        <Link href={`/tutor/courses/${course.id}/students`} className="text-sm text-surface-500 hover:text-surface-700">Students</Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </DashboardLayout>
    );
}
