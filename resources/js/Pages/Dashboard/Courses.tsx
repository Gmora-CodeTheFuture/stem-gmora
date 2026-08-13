import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Clock, PlayCircle, Search, Users, X } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

interface CourseCard {
    id: string;
    title: string;
    slug: string;
    subtitle?: string;
    category: string;
    difficulty: string;
    price: number | string;
    currency: string;
    thumbnail_url?: string | null;
    total_lessons: number;
    duration_minutes: number;
    total_enrollments: number;
    instructor_name?: string;
    is_enrolled: boolean;
    /** Present on enrolled rows only. */
    percentage?: number;
    completed_lessons_count?: number;
    status?: string;
}

interface Props extends PageProps {
    enrolled: CourseCard[];
    catalog: CourseCard[];
    categories: string[];
    filters: { search: string; filter: 'enrolled' | 'all'; category: string };
    counts: { enrolled: number; all: number };
}

export default function DashboardCourses({ enrolled, catalog, categories, filters, counts }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    // Debounced server-side search, so search and filters compose.
    useEffect(() => {
        if (search === (filters.search ?? '')) return;

        const timeout = setTimeout(() => {
            router.get(
                route('dashboard.courses'),
                { ...filters, search: search || undefined },
                { preserveState: true, replace: true },
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [search]);

    const apply = (patch: Partial<Props['filters']>) => {
        router.get(
            route('dashboard.courses'),
            { ...filters, search: search || undefined, ...patch },
            { preserveState: true, replace: true },
        );
    };

    const showing = filters.filter === 'enrolled' ? enrolled : catalog;
    const hasFilters = Boolean(search) || Boolean(filters.category);

    return (
        <DashboardLayout header="Courses">
            <Head title="Courses — Gmora STEM" />

            {/* ── Filter bar ─────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
                <div className="inline-flex p-1 rounded-full bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 self-start shrink-0">
                    {(['enrolled', 'all'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => apply({ filter: tab })}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                filters.filter === tab
                                    ? 'bg-white dark:bg-surface-800 text-surface-900 dark:text-white shadow-card'
                                    : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
                            }`}
                        >
                            {tab === 'enrolled' ? 'My courses' : 'All courses'}
                            <span className="ml-1.5 text-xs text-surface-400">
                                {tab === 'enrolled' ? counts.enrolled : counts.all}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name…"
                        aria-label="Search courses by name"
                        className="input pl-11 rounded-full"
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => apply({ category: filters.category === category ? '' : category })}
                            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                filters.category === category
                                    ? 'bg-primary-600 border-primary-600 text-white'
                                    : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-primary-400'
                            }`}
                        >
                            {category}
                        </button>
                    ))}

                    {hasFilters && (
                        <button
                            onClick={() => {
                                setSearch('');
                                apply({ search: '', category: '' });
                            }}
                            className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-900 dark:hover:text-white px-2"
                        >
                            <X className="w-3.5 h-3.5" />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* ── Results ────────────────────────────────────── */}
            {showing.length === 0 ? (
                <div className="card p-12 text-center">
                    <BookOpen className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1.5">
                        {filters.filter === 'enrolled' ? 'No enrolled courses match' : 'No courses match'}
                    </h2>
                    <p className="text-sm text-surface-500">
                        {filters.filter === 'enrolled'
                            ? 'Switch to All courses to find something to enroll in.'
                            : 'Try a different search term or clear the filters.'}
                    </p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {showing.map((course) => (
                        <article key={course.id} className="card overflow-hidden flex flex-col">
                            <div className="aspect-video bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                                {course.thumbnail_url ? (
                                    <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <BookOpen className="w-8 h-8 text-surface-300 dark:text-surface-600" />
                                )}
                            </div>

                            <div className="p-5 flex flex-col flex-1">
                                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                                    <span className="badge-muted">{course.category}</span>
                                    {course.is_enrolled ? (
                                        course.status === 'completed' ? (
                                            <span className="badge-accent">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Completed
                                            </span>
                                        ) : (
                                            <span className="badge-primary">Enrolled</span>
                                        )
                                    ) : (
                                        <span className="badge-muted capitalize">{course.difficulty}</span>
                                    )}
                                </div>

                                <h2 className="font-semibold text-surface-900 dark:text-white leading-snug">
                                    {course.title}
                                </h2>

                                {course.subtitle && (
                                    <p className="text-sm text-surface-500 mt-1 line-clamp-2">{course.subtitle}</p>
                                )}

                                <div className="flex items-center gap-3 mt-3 text-xs text-surface-400">
                                    <span className="inline-flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {Math.round(course.duration_minutes / 60)}h
                                    </span>
                                    <span>{course.total_lessons} lessons</span>
                                    {!course.is_enrolled && (
                                        <span className="inline-flex items-center gap-1">
                                            <Users className="w-3.5 h-3.5" />
                                            {course.total_enrollments}
                                        </span>
                                    )}
                                </div>

                                {course.is_enrolled && course.percentage !== undefined && (
                                    <div className="mt-4">
                                        <div className="progress-track">
                                            <div className="progress-fill" style={{ width: `${course.percentage}%` }} />
                                        </div>
                                        <p className="text-xs text-surface-400 mt-1.5">
                                            {course.completed_lessons_count} of {course.total_lessons} lessons ·{' '}
                                            {course.percentage}%
                                        </p>
                                    </div>
                                )}

                                <div className="mt-auto pt-5 flex items-center gap-3">
                                    {course.is_enrolled ? (
                                        <Link href={route('learn.show', course.slug)} className="btn-primary w-full">
                                            <PlayCircle className="w-4 h-4" />
                                            {course.percentage ? 'Continue' : 'Start course'}
                                        </Link>
                                    ) : (
                                        <>
                                            <Link
                                                href={route('courses.show', course.slug)}
                                                className="btn-secondary flex-1"
                                            >
                                                View details
                                            </Link>
                                            <span className="text-sm font-medium text-surface-900 dark:text-white shrink-0">
                                                {Number(course.price) > 0
                                                    ? `${course.currency} ${course.price}`
                                                    : 'Free'}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
