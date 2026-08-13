import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { Course, Enrollment, PageProps } from '@/types';

type EnrollmentRow = Enrollment & { course?: Course; completed_lessons_count: number };

interface Props extends PageProps {
    enrollments: EnrollmentRow[];
}

export default function DashboardCourses({ enrollments }: Props) {
    return (
        <DashboardLayout header="My Courses">
            <Head title="My Courses — Gmora STEM" />

            {enrollments.length === 0 ? (
                <div className="card p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-8 h-8 text-primary-500" />
                    </div>
                    <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-1.5">
                        You're not enrolled in anything yet
                    </h2>
                    <p className="text-surface-500 mb-6">Find a course and start building.</p>
                    <Link href={route('courses.index')} className="btn-primary">
                        Browse courses
                    </Link>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {enrollments.map((enrollment, i) => {
                        const total = enrollment.course?.total_lessons ?? 0;
                        const done = enrollment.completed_lessons_count;
                        const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
                        const complete = enrollment.status === 'completed';

                        return (
                            <motion.div
                                key={enrollment.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(i * 0.06, 0.3) }}
                                className="card overflow-hidden flex flex-col"
                            >
                                <div className="aspect-video bg-gradient-to-br from-primary-600 via-violet-600 to-accent-500 flex items-center justify-center">
                                    {enrollment.course?.thumbnail_url ? (
                                        <img
                                            src={enrollment.course.thumbnail_url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <BookOpen className="w-9 h-9 text-white/80" />
                                    )}
                                </div>

                                <div className="p-5 flex flex-col flex-1">
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <span className="badge-primary">{enrollment.course?.category}</span>
                                        {complete && (
                                            <span className="badge-accent">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Completed
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="font-semibold font-display text-surface-900 dark:text-white leading-snug">
                                        {enrollment.course?.title}
                                    </h3>

                                    <div className="flex items-center gap-3 mt-2 text-xs text-surface-500">
                                        <span className="inline-flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {Math.round((enrollment.course?.duration_minutes ?? 0) / 60)}h
                                        </span>
                                        <span>
                                            {done} / {total} lessons
                                        </span>
                                    </div>

                                    <div className="mt-4">
                                        <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-[width] duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="text-xs text-surface-500 mt-1.5">{percentage}% complete</div>
                                    </div>

                                    {enrollment.course?.slug && (
                                        <Link
                                            href={route('learn.show', enrollment.course.slug)}
                                            className="btn-primary w-full mt-5"
                                        >
                                            <PlayCircle className="w-4 h-4" />
                                            {percentage > 0 ? 'Continue' : 'Start course'}
                                        </Link>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </DashboardLayout>
    );
}
