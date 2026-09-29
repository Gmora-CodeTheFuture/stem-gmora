import { Link, router } from '@inertiajs/react';
import { ReactNode, useEffect, useState } from 'react';
import {
    ArrowLeft,
    Bell,
    BookOpen,
    Calendar,
    Home,
    MoreVertical,
    X,
} from 'lucide-react';
import CourseCurriculum from '@/Components/Learn/CourseCurriculum';
import {
    CourseShellCourse,
    CourseShellModule,
    CourseTab,
    CurriculumItem,
} from '@/Components/Learn/courseShell';

type Props = {
    course: CourseShellCourse;
    modules?: CourseShellModule[];
    curriculum?: CurriculumItem[];
    completionPercentage?: number;
    activeTab: CourseTab;
    currentItemId?: string | null;
    children: ReactNode;
    /** Hide desktop curriculum rail (e.g. empty course). */
    hideCurriculum?: boolean;
    /** When set (mobile lecture player), show back arrow instead of exit X. */
    headerBack?: () => void;
};

export default function CourseLayout({
    course,
    modules = [],
    curriculum = [],
    completionPercentage = 0,
    activeTab,
    currentItemId = null,
    children,
    hideCurriculum = false,
    headerBack,
}: Props) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [openModules, setOpenModules] = useState<string[]>(() => modules.map((m) => m.id));

    useEffect(() => {
        setOpenModules((prev) => {
            const ids = modules.map((m) => m.id);
            const missing = ids.filter((id) => !prev.includes(id));
            return missing.length ? [...prev, ...missing] : prev;
        });
    }, [modules]);

    const toggleModule = (id: string) =>
        setOpenModules((open) => (open.includes(id) ? open.filter((m) => m !== id) : [...open, id]));

    const goTab = (tab: CourseTab) => {
        if (tab === 'discussions') {
            router.visit(route('discussions.index', course.slug));
            return;
        }
        if (tab === 'grades') {
            router.visit(route('learn.show', course.slug) + '?tab=grades');
            return;
        }
        // Content — resume current item if set, else course root
        if (currentItemId) {
            const item = curriculum.find((c) => c.id === currentItemId);
            if (item) {
                router.visit(
                    item.kind === 'assignment'
                        ? route('learn.assignment', [course.slug, item.id])
                        : route('learn.lesson', [course.slug, item.id]),
                );
                return;
            }
        }
        router.visit(route('learn.show', course.slug));
    };

    return (
        <div className="h-dvh flex flex-col bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 overflow-hidden">
            {/* Top bar */}
            <header className="shrink-0 z-40 border-b border-surface-200 dark:border-surface-800 bg-white/95 dark:bg-surface-900/95 backdrop-blur">
                <div className="flex items-center gap-2 sm:gap-3 h-14 px-3 sm:px-4">
                    {headerBack ? (
                        <button
                            type="button"
                            onClick={headerBack}
                            className="btn-icon shrink-0 lg:hidden"
                            aria-label="Back to overview"
                            title="Back to overview"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    ) : null}
                    {/* Desktop always exits; mobile exits when not in player back mode */}
                    <Link
                        href={route('dashboard.courses')}
                        className={`btn-icon shrink-0 ${headerBack ? 'hidden lg:inline-flex' : ''}`}
                        aria-label="Exit course"
                        title="Back to My Courses"
                    >
                        <X className="w-5 h-5" />
                    </Link>

                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-wider text-surface-400 font-semibold leading-none mb-0.5 hidden sm:block">
                            Course
                        </p>
                        <h1 className="text-sm sm:text-base font-semibold text-surface-900 dark:text-white truncate">
                            {course.title}
                        </h1>
                    </div>

                    <div className="hidden lg:flex items-center gap-2 shrink-0">
                        <div className="w-28 progress-track">
                            <div className="progress-fill" style={{ width: `${completionPercentage}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-surface-500 whitespace-nowrap">
                            {completionPercentage}%
                        </span>
                    </div>

                    <div className="relative shrink-0">
                        <button
                            type="button"
                            className="btn-icon"
                            aria-label="More options"
                            aria-expanded={menuOpen}
                            onClick={() => setMenuOpen((o) => !o)}
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>
                        {menuOpen && (
                            <>
                                <button
                                    type="button"
                                    className="fixed inset-0 z-40"
                                    aria-label="Close menu"
                                    onClick={() => setMenuOpen(false)}
                                />
                                <div className="absolute right-0 top-full mt-1 z-50 w-52 card py-1 shadow-lg border border-surface-200 dark:border-surface-700">
                                    {[
                                        { name: 'Dashboard', href: route('dashboard'), icon: Home },
                                        { name: 'My Courses', href: route('dashboard.courses'), icon: BookOpen },
                                        { name: 'Calendar', href: route('dashboard.calendar'), icon: Calendar },
                                        { name: 'Notifications', href: route('dashboard.notifications'), icon: Bell },
                                        { name: 'Browse catalog', href: route('courses.index'), icon: BookOpen },
                                    ].map((item) => (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={() => setMenuOpen(false)}
                                            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800"
                                        >
                                            <item.icon className="w-4 h-4 text-surface-400" />
                                            {item.name}
                                        </Link>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Mobile course tabs */}
                <nav
                    className="lg:hidden flex border-t border-surface-100 dark:border-surface-800"
                    aria-label="Course sections"
                >
                    {(
                        [
                            { key: 'content', label: 'Content' },
                            { key: 'grades', label: 'Grades' },
                            { key: 'discussions', label: 'Discussions' },
                        ] as const
                    ).map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => goTab(tab.key)}
                            className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
                                activeTab === tab.key
                                    ? 'text-primary-600 dark:text-primary-400'
                                    : 'text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'
                            }`}
                        >
                            {tab.label}
                            {activeTab === tab.key && (
                                <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-primary-600 dark:bg-primary-400" />
                            )}
                        </button>
                    ))}
                </nav>
            </header>

            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Desktop curriculum rail */}
                {!hideCurriculum && (
                    <aside className="hidden lg:flex w-[320px] shrink-0 flex-col border-r border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
                        <div className="px-4 py-4 border-b border-surface-100 dark:border-surface-800 shrink-0">
                            <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1">
                                Course content
                            </p>
                            <p className="text-sm text-surface-600 dark:text-surface-300">
                                {completionPercentage}% complete
                            </p>
                            <div className="mt-2 progress-track">
                                <div className="progress-fill" style={{ width: `${completionPercentage}%` }} />
                            </div>

                            <div className="mt-4 flex gap-1">
                                {(
                                    [
                                        { key: 'content', label: 'Content' },
                                        { key: 'grades', label: 'Grades' },
                                        { key: 'discussions', label: 'Discussions' },
                                    ] as const
                                ).map((tab) => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => goTab(tab.key)}
                                        className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
                                            activeTab === tab.key
                                                ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                                                : 'text-surface-500 hover:bg-surface-50 dark:hover:bg-surface-800'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 px-2 py-2">
                            <CourseCurriculum
                                modules={modules}
                                curriculum={curriculum}
                                courseSlug={course.slug}
                                currentId={currentItemId}
                                openModules={openModules}
                                onToggleModule={toggleModule}
                            />
                        </div>
                    </aside>
                )}

                <main className="flex-1 min-w-0 min-h-0 overflow-y-auto scrollbar-thin">
                    {children}
                </main>
            </div>
        </div>
    );
}
