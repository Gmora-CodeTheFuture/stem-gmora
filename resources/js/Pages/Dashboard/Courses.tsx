import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    BarChart2,
    BookOpen,
    CheckCircle2,
    ChevronRight,
    Clock,
    FileText,
    PlayCircle,
    Search,
    Users,
    X,
} from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import SegmentedControl from '@/Components/SegmentedControl';
import { PageProps } from '@/types';

interface NextLesson {
    id: string;
    title: string;
    duration_seconds: number;
}

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
    percentage?: number;
    completed_lessons_count?: number;
    status?: string;
    next_lesson?: NextLesson | null;
}

interface Props extends PageProps {
    enrolled: CourseCard[];
    catalog: CourseCard[];
    categories: string[];
    filters: { search: string; filter: 'enrolled' | 'all'; category: string[] };
    counts: { enrolled: number; all: number };
}

function formatDurationHours(minutes: number): string {
    if (!minutes) return '—';
    const hours = Math.round(minutes / 60);
    if (hours < 1) return `${minutes}m`;

    return `${hours}h`;
}

function formatLessonMinutes(seconds: number): string {
    const minutes = Math.max(1, Math.round(seconds / 60));

    return `${minutes} min`;
}

export default function DashboardCourses({ enrolled, catalog, categories, filters, counts }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const selectedCategories = Array.isArray(filters.category)
        ? filters.category
        : filters.category
          ? [filters.category]
          : [];

    useEffect(() => {
        if (search === (filters.search ?? '')) return;

        const timeout = setTimeout(() => {
            router.get(
                route('dashboard.courses'),
                { ...filters, search: search || undefined, category: selectedCategories },
                { preserveState: true, replace: true },
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [search]);

    const apply = (patch: Partial<{ search: string; filter: 'enrolled' | 'all'; category: string[] }>) => {
        router.get(
            route('dashboard.courses'),
            {
                ...filters,
                search: search || undefined,
                category: selectedCategories,
                ...patch,
            },
            { preserveState: true, replace: true },
        );
    };

    const toggleCategory = (category: string) => {
        const next = selectedCategories.includes(category)
            ? selectedCategories.filter((item) => item !== category)
            : [...selectedCategories, category];

        apply({ category: next });
    };

    const showing = filters.filter === 'enrolled' ? enrolled : catalog;
    const hasFilters = Boolean(search) || selectedCategories.length > 0;

    return (
        <DashboardLayout header="My Courses">
            <Head title="My Courses — Gmora STEM" />

            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-surface-900 dark:text-white tracking-tight">
                    My Courses
                </h1>
                <p className="mt-1.5 text-sm text-surface-600 dark:text-surface-300 max-w-xl">
                    Continue learning and track your progress across all enrolled courses.
                </p>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
                <SegmentedControl
                    className="self-start shrink-0"
                    aria-label="Course list"
                    value={filters.filter}
                    onChange={(tab) => apply({ filter: tab })}
                    items={[
                        {
                            key: 'enrolled',
                            label: (
                                <>
                                    My courses
                                    <span className="ml-1.5 text-xs text-surface-600 dark:text-surface-400">{counts.enrolled}</span>
                                </>
                            ),
                        },
                        {
                            key: 'all',
                            label: (
                                <>
                                    All courses
                                    <span className="ml-1.5 text-xs text-surface-600 dark:text-surface-400">{counts.all}</span>
                                </>
                            ),
                        },
                    ]}
                />

                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 dark:text-surface-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name…"
                        aria-label="Search courses by name"
                        className="input pl-11 rounded-full placeholder:text-surface-500 dark:placeholder:text-surface-400"
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {categories.map((category) => {
                        const active = selectedCategories.includes(category);

                        return (
                            <button
                                key={category}
                                type="button"
                                aria-pressed={active}
                                onClick={() => toggleCategory(category)}
                                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                    active
                                        ? 'bg-primary-600 border-primary-600 text-white'
                                        : 'border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:border-primary-400'
                                }`}
                            >
                                {category}
                            </button>
                        );
                    })}

                    {hasFilters && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                apply({ search: '', category: [] });
                            }}
                            className="inline-flex items-center gap-1 text-sm text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white px-2"
                        >
                            <X className="w-3.5 h-3.5" />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {showing.length === 0 ? (
                <div className="card p-12 text-center">
                    <BookOpen className="w-8 h-8 text-surface-400 dark:text-surface-500 mx-auto mb-3" />
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1.5">
                        {filters.filter === 'enrolled' ? 'No enrolled courses match' : 'No courses match'}
                    </h2>
                    <p className="text-sm text-surface-600 dark:text-surface-300">
                        {filters.filter === 'enrolled'
                            ? 'Switch to All courses to find something to enroll in.'
                            : 'Try a different search term or clear the filters.'}
                    </p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {showing.map((course) => (
                        <CourseCardView key={course.id} course={course} />
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}

function CourseCardView({ course }: { course: CourseCard }) {
    const nextHref = course.next_lesson
        ? route('learn.lesson', [course.slug, course.next_lesson.id])
        : route('learn.show', course.slug);

    return (
        <article className="card overflow-hidden flex flex-col rounded-2xl shadow-sm border border-surface-100 dark:border-surface-800">
            <div className="relative aspect-video bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                    <BookOpen className="w-8 h-8 text-surface-300 dark:text-surface-600" />
                )}

                {course.category && (
                    <span className="absolute top-3 left-3 max-w-[70%] truncate px-2.5 py-1 rounded-full text-[11px] font-medium text-white bg-black/55 backdrop-blur-sm">
                        {course.category}
                    </span>
                )}
            </div>

            <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <h2 className="font-semibold text-surface-900 dark:text-white leading-snug">
                        {course.title}
                    </h2>
                    {course.is_enrolled && course.status === 'completed' && (
                        <span className="badge-accent shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            Done
                        </span>
                    )}
                </div>

                {course.subtitle && (
                    <p className="text-sm text-surface-600 dark:text-surface-300 mt-1 line-clamp-2 leading-relaxed">{course.subtitle}</p>
                )}

                <div className="flex items-center gap-3 mt-3 text-xs text-surface-700 dark:text-surface-300">
                    <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-surface-500 dark:text-surface-400" />
                        {formatDurationHours(course.duration_minutes)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-surface-500 dark:text-surface-400" />
                        {course.total_lessons} lessons
                    </span>
                    <span className="inline-flex items-center gap-1 capitalize">
                        <BarChart2 className="w-3.5 h-3.5 text-surface-500 dark:text-surface-400" />
                        {course.difficulty}
                    </span>
                    {!course.is_enrolled && (
                        <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-surface-500 dark:text-surface-400" />
                            {course.total_enrollments}
                        </span>
                    )}
                </div>

                {course.is_enrolled && course.percentage !== undefined && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-medium text-surface-700 dark:text-surface-300">Your progress</span>
                            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                                {course.percentage}%
                            </span>
                        </div>
                        <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${course.percentage}%` }} />
                        </div>
                        <p className="text-xs text-surface-600 dark:text-surface-400 mt-1.5">
                            {course.completed_lessons_count ?? 0} of {course.total_lessons} lessons completed
                        </p>
                    </div>
                )}

                {course.is_enrolled && (
                    <Link
                        href={nextHref}
                        className="mt-4 flex items-center gap-3 rounded-xl bg-primary-50 dark:bg-primary-950/40 px-3 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-950/60 transition-colors"
                    >
                        <span className="w-8 h-8 rounded-full bg-white dark:bg-surface-900 shadow-sm flex items-center justify-center shrink-0">
                            <PlayCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        </span>
                        <span className="flex-1 min-w-0">
                            <span className="block text-[11px] font-medium text-primary-700 dark:text-primary-300">
                                Next up
                            </span>
                            <span className="block text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
                                {course.next_lesson?.title ?? 'Continue where you left off'}
                            </span>
                        </span>
                        {course.next_lesson && (
                            <span className="text-xs text-surface-600 dark:text-surface-400 shrink-0">
                                {formatLessonMinutes(course.next_lesson.duration_seconds)}
                            </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-surface-500 dark:text-surface-400 shrink-0" />
                    </Link>
                )}

                <div className="mt-auto pt-4">
                    {course.is_enrolled ? (
                        <Link href={route('learn.show', course.slug)} className="btn-primary w-full justify-center rounded-xl">
                            <PlayCircle className="w-4 h-4" />
                            {course.percentage ? 'Continue Learning' : 'Start course'}
                        </Link>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link href={route('courses.show', course.slug)} className="btn-secondary flex-1 justify-center rounded-xl">
                                View details
                            </Link>
                            <span className="text-sm font-medium text-surface-900 dark:text-white shrink-0">
                                {Number(course.price) > 0 ? `${course.currency} ${course.price}` : 'Free'}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}
