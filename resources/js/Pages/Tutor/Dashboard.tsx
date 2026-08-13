import { Head, Link } from '@inertiajs/react';
import { BookOpen, Users, CreditCard, Award, Star } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

interface TutorCourse {
    id: string;
    title: string;
    slug: string;
    status: string;
    category: string;
    thumbnail_url?: string;
    enrollments_count: number;
    total_lessons: number;
    created_at: string;
}

interface Props extends PageProps {
    stats: {
        total_courses: number;
        published_courses: number;
        total_students: number;
        total_revenue: number;
        total_certificates: number;
        average_rating: number;
    };
    courses: TutorCourse[];
}

const statusColors: Record<string, string> = {
    published: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    draft: 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400',
    pending_review: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    archived: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export default function TutorDashboard({ stats, courses }: Props) {
    const tiles = [
        { label: 'My Courses', value: `${stats.published_courses} / ${stats.total_courses}`, caption: 'published', icon: BookOpen, color: 'text-blue-500' },
        { label: 'Students', value: stats.total_students, icon: Users, color: 'text-violet-500' },
        { label: 'Revenue', value: `$${stats.total_revenue.toLocaleString()}`, icon: CreditCard, color: 'text-emerald-500' },
        { label: 'Certificates', value: stats.total_certificates, icon: Award, color: 'text-amber-500' },
        { label: 'Avg Rating', value: stats.average_rating || '—', icon: Star, color: 'text-yellow-500' },
    ];

    return (
        <DashboardLayout>
            <Head title="Tutor Dashboard — Gmora STEM" />

            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">Teaching Dashboard</h1>
                <p className="text-surface-500 mt-1">Manage your courses and track your students.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
                {tiles.map((tile) => (
                    <div key={tile.label} className="card p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <tile.icon className={`w-5 h-5 ${tile.color}`} />
                            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">{tile.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-surface-900 dark:text-white">{tile.value}</p>
                        {tile.caption && <p className="text-xs text-surface-400 mt-1">{tile.caption}</p>}
                    </div>
                ))}
            </div>

            {/* Courses List */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Your Courses</h2>
                <Link href="/tutor/courses/create" className="btn-primary text-sm">+ New Course</Link>
            </div>

            <div className="grid gap-4">
                {courses.map((course) => (
                    <div key={course.id} className="card p-5 flex items-center gap-5 hover:ring-1 hover:ring-primary-300 dark:hover:ring-primary-700 transition-all">
                        <div className="w-16 h-12 rounded-lg bg-surface-200 dark:bg-surface-800 overflow-hidden shrink-0">
                            {course.thumbnail_url ? (
                                <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-5 h-5 text-surface-400" /></div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-surface-900 dark:text-white truncate">{course.title}</h3>
                            <p className="text-xs text-surface-500 mt-0.5">{course.category} · {course.total_lessons} lessons · {course.enrollments_count} students</p>
                        </div>
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${statusColors[course.status]}`}>{course.status}</span>
                        <div className="flex items-center gap-2 shrink-0">
                            <Link href={`/tutor/courses/${course.id}/edit`} className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">Edit</Link>
                            <Link href={`/tutor/courses/${course.id}/students`} className="text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">Students</Link>
                        </div>
                    </div>
                ))}
                {courses.length === 0 && (
                    <div className="card p-12 text-center">
                        <BookOpen className="w-10 h-10 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                        <p className="text-surface-500 mb-4">You haven't created any courses yet.</p>
                        <Link href="/tutor/courses/create" className="btn-primary">Create your first course</Link>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
