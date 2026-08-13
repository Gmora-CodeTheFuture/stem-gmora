import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Award, BookOpen, Edit, Users } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { Course, Enrollment, Module, PageProps, User } from '@/types';

interface AdminCourse extends Course {
    instructor?: User;
    modules?: Module[];
    enrollments?: Array<Enrollment & { user?: User }>;
    enrollments_count: number;
    certificates_count: number;
}

interface Props extends PageProps {
    course: AdminCourse;
}

const STATUSES = ['draft', 'pending_review', 'published', 'archived'] as const;

export default function CourseShow({ course }: Props) {
    const setStatus = (status: string) =>
        router.patch(route('admin.courses.status', course.id), { status }, { preserveScroll: true });

    const lessonCount = course.modules?.reduce((sum, m) => sum + (m.lessons?.length ?? 0), 0) ?? 0;

    return (
        <DashboardLayout>
            <Head title={`${course.title} — Admin`} />

            <Link
                href={route('admin.courses.index')}
                className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                All courses
            </Link>

            <div className="card p-6 mb-5">
                <div className="flex items-start gap-4 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="badge-muted">{course.category}</span>
                            <span className="badge-primary capitalize">{course.status.replace('_', ' ')}</span>
                        </div>
                        <h1 className="text-xl font-semibold text-surface-900 dark:text-white">{course.title}</h1>
                        <p className="text-sm text-surface-500 mt-1">
                            {course.subtitle} · by {course.instructor?.full_name ?? 'Unassigned'}
                        </p>
                    </div>

                    <Link href={route('admin.courses.edit', course.id)} className="btn-secondary py-2">
                        <Edit className="w-4 h-4" />
                        Edit
                    </Link>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-surface-100 dark:border-surface-800">
                    <div>
                        <dt className="text-xs text-surface-400 inline-flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" /> Enrollments
                        </dt>
                        <dd className="text-lg font-semibold text-surface-900 dark:text-white">
                            {course.enrollments_count}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-surface-400 inline-flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" /> Lessons (published)
                        </dt>
                        <dd className="text-lg font-semibold text-surface-900 dark:text-white">
                            {course.total_lessons}
                            <span className="text-sm font-normal text-surface-400"> of {lessonCount}</span>
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-surface-400 inline-flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5" /> Certificates
                        </dt>
                        <dd className="text-lg font-semibold text-surface-900 dark:text-white">
                            {course.certificates_count}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-surface-400">Price</dt>
                        <dd className="text-lg font-semibold text-surface-900 dark:text-white">
                            {Number(course.price) > 0 ? `${course.currency} ${course.price}` : 'Free'}
                        </dd>
                    </div>
                </dl>

                <div className="flex items-center gap-2 mt-6 pt-6 border-t border-surface-100 dark:border-surface-800 flex-wrap">
                    <span className="text-sm text-surface-500 mr-1">Set status:</span>
                    {STATUSES.map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatus(status)}
                            disabled={course.status === status}
                            className={`px-3 py-1.5 rounded-full text-sm border capitalize transition-colors ${
                                course.status === status
                                    ? 'bg-primary-600 border-primary-600 text-white cursor-default'
                                    : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-primary-400'
                            }`}
                        >
                            {status.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-5 items-start">
                <div className="card p-6">
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-4">Curriculum</h2>

                    {course.modules?.length ? (
                        <ol className="space-y-4">
                            {course.modules.map((module, index) => (
                                <li key={module.id}>
                                    <p className="text-sm font-medium text-surface-900 dark:text-white">
                                        {index + 1}. {module.title}
                                        {!module.is_published && (
                                            <span className="badge-muted ml-2">draft</span>
                                        )}
                                    </p>
                                    <ul className="mt-1.5 ml-4 space-y-1">
                                        {module.lessons?.map((lesson) => (
                                            <li key={lesson.id} className="text-sm text-surface-500 flex items-center gap-2">
                                                <span className="flex-1 truncate">{lesson.title}</span>
                                                <span className="text-xs text-surface-400 capitalize">{lesson.type}</span>
                                                {!lesson.is_published && <span className="badge-muted">draft</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="text-sm text-surface-500">No modules yet.</p>
                    )}
                </div>

                <div className="card p-6">
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-4">
                        Recent enrollments
                    </h2>

                    {course.enrollments?.length ? (
                        <ul className="divide-y divide-surface-100 dark:divide-surface-800">
                            {course.enrollments.map((enrollment) => (
                                <li key={enrollment.id} className="py-3 flex items-center gap-3">
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm text-surface-900 dark:text-white truncate">
                                            {enrollment.user?.full_name}
                                        </span>
                                        <span className="block text-xs text-surface-400 truncate">
                                            {enrollment.user?.email}
                                        </span>
                                    </span>
                                    <span className="badge-muted capitalize">{enrollment.status}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-surface-500">Nobody has enrolled yet.</p>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
