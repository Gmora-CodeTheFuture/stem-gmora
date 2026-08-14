import { Head, Link } from '@inertiajs/react';
import { BookOpen } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

interface Props extends PageProps {
    course: { id: string; title: string; slug: string };
    instructor: string | null;
}

/**
 * Shown when an enrolled student opens a course that has no published lessons —
 * the instructor is still drafting, or pulled a module back. Their enrollment is
 * intact, so this explains the wait instead of failing.
 */
export default function LearnEmpty({ course, instructor }: Props) {
    return (
        <DashboardLayout header={course.title}>
            <Head title={`${course.title} — Gmora STEM`} />

            <div className="card p-12 text-center max-w-xl mx-auto">
                <BookOpen className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />

                <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1.5">
                    No lessons published yet
                </h2>

                <p className="text-sm text-surface-500">
                    {instructor
                        ? `${instructor} is still preparing this course.`
                        : 'The instructor is still preparing this course.'}{' '}
                    You're enrolled — the lessons will appear here as soon as they're published.
                </p>

                <div className="flex items-center justify-center gap-3 mt-6">
                    <Link href={route('dashboard.courses')} className="btn-primary">
                        My courses
                    </Link>
                    <Link href={route('support.index')} className="btn-ghost">
                        Ask support
                    </Link>
                </div>
            </div>
        </DashboardLayout>
    );
}
