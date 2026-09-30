import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
    BarChart2,
    BookOpen,
    Check,
    CheckCircle2,
    ChevronRight,
    Clock,
    FileText,
    LayoutGrid,
    List,
    ListFilter,
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

type ViewMode = 'gallery' | 'list';

const VIEW_STORAGE_KEY = 'gmora_courses_view';

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

function readStoredView(): ViewMode {
    if (typeof window === 'undefined') return 'gallery';
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);

    return stored === 'list' ? 'list' : 'gallery';
}

export default function DashboardCourses({ enrolled, catalog, categories, filters, counts }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [filterOpen, setFilterOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('gallery');
    const filterRef = useRef<HTMLDivElement>(null);
    const selectedCategories = Array.isArray(filters.category)
        ? filters.category
        : filters.category
          ? [filters.category]
          : [];

    useEffect(() => {
        setViewMode(readStoredView());
    }, []);

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

    useEffect(() => {
        if (!filterOpen) return;

        const onPointerDown = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setFilterOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setFilterOpen(false);
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [filterOpen]);

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

    const setView = (mode: ViewMode) => {
        setViewMode(mode);
        window.localStorage.setItem(VIEW_STORAGE_KEY, mode);
    };

    const showing = filters.filter === 'enrolled' ? enrolled : catalog;
    const filterLabel = selectedCategories.length === 0
        ? 'All Categories'
        : `Filters (${selectedCategories.length})`;

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

            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
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
                    <div className="relative" ref={filterRef}>
                        <button
                            type="button"
                            aria-expanded={filterOpen}
                            aria-haspopup="listbox"
                            onClick={() => setFilterOpen((open) => !open)}
                            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium border transition-colors ${
                                selectedCategories.length > 0
                                    ? 'border-primary-600 bg-primary-50 text-primary-800 dark:bg-primary-950/50 dark:text-primary-200 dark:border-primary-500'
                                    : 'border-surface-300 dark:border-surface-600 text-surface-800 dark:text-surface-200 hover:border-surface-400 dark:hover:border-surface-500 bg-white dark:bg-surface-900'
                            }`}
                        >
                            <ListFilter className="w-4 h-4" />
                            {filterLabel}
                        </button>

                        {filterOpen && (
                            <div
                                role="listbox"
                                aria-label="Filter by category"
                                aria-multiselectable="true"
                                className="absolute left-0 z-30 mt-2 w-64 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-lg p-2"
                            >
                                <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                                        Categories
                                    </span>
                                    {selectedCategories.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => apply({ category: [] })}
                                            className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                <ul className="max-h-64 overflow-y-auto space-y-0.5">
                                    {categories.map((category) => {
                                        const active = selectedCategories.includes(category);

                                        return (
                                            <li key={category}>
                                                <button
                                                    type="button"
                                                    role="option"
                                                    aria-selected={active}
                                                    onClick={() => toggleCategory(category)}
                                                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm text-left transition-colors ${
                                                        active
                                                            ? 'bg-primary-50 dark:bg-primary-950/40 text-surface-900 dark:text-white font-medium'
                                                            : 'text-surface-800 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800'
                                                    }`}
                                                >
                                                    <span
                                                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                                            active
                                                                ? 'bg-primary-600 border-primary-600 text-white'
                                                                : 'border-surface-400 dark:border-surface-500'
                                                        }`}
                                                    >
                                                        {active && <Check className="w-3 h-3" />}
                                                    </span>
                                                    {category}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div
                        className="inline-flex items-center rounded-full border border-surface-300 dark:border-surface-600 p-0.5 bg-white dark:bg-surface-900"
                        role="group"
                        aria-label="Course layout"
                    >
                        <button
                            type="button"
                            aria-pressed={viewMode === 'gallery'}
                            title="Gallery view"
                            onClick={() => setView('gallery')}
                            className={`inline-flex items-center justify-center w-9 h-8 rounded-full transition-colors ${
                                viewMode === 'gallery'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
                            }`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            aria-pressed={viewMode === 'list'}
                            title="List view"
                            onClick={() => setView('list')}
                            className={`inline-flex items-center justify-center w-9 h-8 rounded-full transition-colors ${
                                viewMode === 'list'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
                            }`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {selectedCategories.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-5">
                    {selectedCategories.map((category) => (
                        <button
                            key={category}
                            type="button"
                            onClick={() => toggleCategory(category)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-surface-400 dark:border-surface-500 text-surface-800 dark:text-surface-100 bg-surface-100 dark:bg-surface-800 hover:border-surface-500 dark:hover:border-surface-400"
                        >
                            {category}
                            <X className="w-3.5 h-3.5 text-surface-600 dark:text-surface-300" />
                        </button>
                    ))}
                    {(search || selectedCategories.length > 0) && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                apply({ search: '', category: [] });
                            }}
                            className="inline-flex items-center gap-1 text-sm font-medium text-surface-700 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white px-2"
                        >
                            <X className="w-3.5 h-3.5" />
                            Clear all
                        </button>
                    )}
                </div>
            )}

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
            ) : viewMode === 'gallery' ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {showing.map((course) => (
                        <CourseCardView key={course.id} course={course} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {showing.map((course) => (
                        <CourseListRow key={course.id} course={course} />
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}

function CourseMeta({ course }: { course: CourseCard }) {
    return (
        <div className="flex items-center gap-3 text-xs text-surface-700 dark:text-surface-300 flex-wrap">
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
    );
}

function CourseProgress({ course }: { course: CourseCard }) {
    if (!course.is_enrolled || course.percentage === undefined) return null;

    return (
        <div>
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
    );
}

function CourseNextUp({ course }: { course: CourseCard }) {
    if (!course.is_enrolled) return null;

    const nextHref = course.next_lesson
        ? route('learn.lesson', [course.slug, course.next_lesson.id])
        : route('learn.show', course.slug);

    return (
        <Link
            href={nextHref}
            className="flex items-center gap-3 rounded-xl bg-primary-50 dark:bg-primary-950/40 px-3 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-950/60 transition-colors"
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
    );
}

function CourseActions({ course }: { course: CourseCard }) {
    return course.is_enrolled ? (
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
    );
}

function CourseCardView({ course }: { course: CourseCard }) {
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

                <div className="mt-3">
                    <CourseMeta course={course} />
                </div>

                {course.is_enrolled && course.percentage !== undefined && (
                    <div className="mt-4">
                        <CourseProgress course={course} />
                    </div>
                )}

                {course.is_enrolled && (
                    <div className="mt-4">
                        <CourseNextUp course={course} />
                    </div>
                )}

                <div className="mt-auto pt-4">
                    <CourseActions course={course} />
                </div>
            </div>
        </article>
    );
}

function CourseListRow({ course }: { course: CourseCard }) {
    return (
        <article className="card rounded-2xl border border-surface-100 dark:border-surface-800 overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-4 p-4">
                <div className="relative w-full sm:w-44 shrink-0 aspect-video sm:aspect-auto sm:h-28 rounded-xl overflow-hidden bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                    {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <BookOpen className="w-7 h-7 text-surface-300 dark:text-surface-600" />
                    )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                {course.category && (
                                    <span className="text-xs font-medium text-surface-700 dark:text-surface-300">
                                        {course.category}
                                    </span>
                                )}
                                {course.is_enrolled && course.status === 'completed' && (
                                    <span className="badge-accent shrink-0">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Done
                                    </span>
                                )}
                            </div>
                            <h2 className="font-semibold text-surface-900 dark:text-white leading-snug">
                                {course.title}
                            </h2>
                            {course.subtitle && (
                                <p className="text-sm text-surface-600 dark:text-surface-300 mt-1 line-clamp-1">
                                    {course.subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    <CourseMeta course={course} />

                    {course.is_enrolled && course.percentage !== undefined && (
                        <div className="max-w-md">
                            <CourseProgress course={course} />
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {course.is_enrolled && (
                            <div className="flex-1 min-w-0">
                                <CourseNextUp course={course} />
                            </div>
                        )}
                        <div className={course.is_enrolled ? 'sm:w-48 shrink-0' : 'w-full sm:max-w-sm'}>
                            <CourseActions course={course} />
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}
