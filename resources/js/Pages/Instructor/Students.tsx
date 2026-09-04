import { Head, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps, Paginated, User } from '@/types';

interface Props extends PageProps {
    students: Paginated<User & {
        enrollments_count: number;
        stat?: { xp: number; level: number; current_streak: number } | null;
    }>;
    filters: { search?: string };
}

export default function InstructorStudents({ students, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = () =>
        router.get('/instructor/students', { search }, { preserveState: true, replace: true });

    return (
        <DashboardLayout>
            <Head title="My students — Instructor" />

            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">Assigned students</h1>
                <p className="text-sm text-surface-500 mt-1">
                    Students an admin has placed under your mentoring.
                </p>
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    apply();
                }}
                className="relative max-w-sm mb-5"
            >
                <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search students"
                    className="input pl-9"
                />
            </form>

            <div className="card overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-surface-50 dark:bg-surface-800/50 text-left text-surface-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">Student</th>
                            <th className="px-4 py-3 font-medium">Level</th>
                            <th className="px-4 py-3 font-medium">XP</th>
                            <th className="px-4 py-3 font-medium">Enrollments</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                        {students.data.map((student) => (
                            <tr key={student.id}>
                                <td className="px-4 py-3">
                                    <p className="font-medium text-surface-900 dark:text-white">{student.full_name}</p>
                                    <p className="text-surface-500">{student.email}</p>
                                </td>
                                <td className="px-4 py-3">{student.stat?.level ?? 1}</td>
                                <td className="px-4 py-3">{student.stat?.xp ?? 0}</td>
                                <td className="px-4 py-3">{student.enrollments_count}</td>
                            </tr>
                        ))}
                        {students.data.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-surface-500">
                                    No students assigned to you yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </DashboardLayout>
    );
}
