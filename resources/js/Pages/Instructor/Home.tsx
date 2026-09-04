import { Head, Link } from '@inertiajs/react';
import { BookOpen, GraduationCap, Users } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { Course, PageProps, User } from '@/types';

interface Props extends PageProps {
    courses: Array<Course & { enrollments_count: number }>;
    students: Array<User & {
        enrollments_count: number;
        stat?: { xp: number; level: number; current_streak: number } | null;
    }>;
    stats: { courses: number; students: number; published_courses: number };
}

export default function InstructorHome({ courses, students, stats }: Props) {
    return (
        <DashboardLayout>
            <Head title="Instructor home — Gmora STEM" />

            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">Teaching home</h1>
                <p className="text-sm text-surface-500 mt-1">
                    Courses and students assigned to you by an admin.
                </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mb-8">
                <div className="card p-5">
                    <p className="text-xs text-surface-400">Assigned courses</p>
                    <p className="text-2xl font-semibold text-surface-900 dark:text-white mt-1">{stats.courses}</p>
                </div>
                <div className="card p-5">
                    <p className="text-xs text-surface-400">Published</p>
                    <p className="text-2xl font-semibold text-surface-900 dark:text-white mt-1">{stats.published_courses}</p>
                </div>
                <div className="card p-5">
                    <p className="text-xs text-surface-400">Assigned students</p>
                    <p className="text-2xl font-semibold text-surface-900 dark:text-white mt-1">{stats.students}</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-5 items-start">
                <section className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                            <BookOpen className="w-4 h-4" /> Your courses
                        </h2>
                        <Link href="/instructor/courses" className="text-sm text-primary-600 hover:underline">
                            View all
                        </Link>
                    </div>
                    {courses.length ? (
                        <ul className="divide-y divide-surface-100 dark:divide-surface-800">
                            {courses.slice(0, 6).map((course) => (
                                <li key={course.id} className="py-3 flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <Link
                                            href={`/tutor/courses/${course.id}/edit`}
                                            className="text-sm font-medium text-surface-900 dark:text-white hover:text-primary-600 truncate block"
                                        >
                                            {course.title}
                                        </Link>
                                        <p className="text-xs text-surface-500 capitalize">
                                            {course.status?.replace('_', ' ')} · {course.enrollments_count} enrolled
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-surface-500">No courses assigned yet.</p>
                    )}
                </section>

                <section className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                            <Users className="w-4 h-4" /> Your students
                        </h2>
                        <Link href="/instructor/students" className="text-sm text-primary-600 hover:underline">
                            View all
                        </Link>
                    </div>
                    {students.length ? (
                        <ul className="divide-y divide-surface-100 dark:divide-surface-800">
                            {students.slice(0, 6).map((student) => (
                                <li key={student.id} className="py-3 flex items-center gap-3">
                                    <span className="w-9 h-9 rounded-full bg-primary-600 text-white text-sm font-medium flex items-center justify-center shrink-0">
                                        {student.full_name?.charAt(0)?.toUpperCase()}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                                            {student.full_name}
                                        </p>
                                        <p className="text-xs text-surface-500 truncate">{student.email}</p>
                                    </div>
                                    <span className="text-xs text-surface-400 inline-flex items-center gap-1">
                                        <GraduationCap className="w-3.5 h-3.5" />
                                        Lv {student.stat?.level ?? 1}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-surface-500">No students assigned yet.</p>
                    )}
                </section>
            </div>
        </DashboardLayout>
    );
}
