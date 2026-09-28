import { Head, Link, router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ArrowLeft, CheckCircle2, ChevronDown, Circle, ClipboardCheck, FileText,
    Globe, HelpCircle, ListChecks, Lock, MessageSquare, PlayCircle, Radio, Video, PanelRight, X
} from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import SecureVideoPlayer from '@/Components/SecureVideoPlayer';
import AssignmentAttemptPanel from '@/Components/Learn/AssignmentAttemptPanel';
import { Lesson, Module, PageProps } from '@/types';

type CurriculumItem = {
    kind: 'lesson' | 'assignment';
    id: string;
    module_id: string;
    title: string;
    type: string;
    order_index: number;
    completed: boolean;
    submitted: boolean;
    is_required: boolean;
};

type CurrentAssignment = {
    id: string;
    title: string;
    description?: string | null;
    deadline_at?: string | null;
    max_marks: number;
    is_required?: boolean;
    questions: Array<{
        id: string;
        type: 'mcq' | 'short_answer' | 'normal';
        body: string;
        points: number;
        options?: Array<{ index?: number; text: string }>;
    }>;
    submission?: {
        id: string;
        status: string;
        answers?: Record<string, unknown> | null;
        marks_awarded?: number | null;
        feedback?: string | null;
    } | null;
};

interface LearnPageProps extends PageProps {
    course: { id: string; title: string; slug: string; category: string; total_lessons: number };
    modules: Module[];
    curriculum: CurriculumItem[];
    currentLesson: Lesson | null;
    currentAssignment: CurrentAssignment | null;
    completionPercentage: number;
}

interface DeckMessage {
    source?: string;
    type?: string;
    direction?: 'next' | 'prev';
    percent?: number;
    complete?: boolean;
}

const typeIcon = {
    youtube: Video,
    live: Radio,
    pdf: FileText,
    quiz: HelpCircle,
    html: Globe,
    assignment: ClipboardCheck,
} as const;

function formatDuration(seconds: number): string {
    if (!seconds) return '—';
    const minutes = Math.round(seconds / 60);

    return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

function itemHref(courseSlug: string, item: CurriculumItem): string {
    return item.kind === 'assignment'
        ? route('learn.assignment', [courseSlug, item.id])
        : route('learn.lesson', [courseSlug, item.id]);
}

export default function LearnShow({
    course,
    modules,
    curriculum = [],
    currentLesson,
    currentAssignment,
    completionPercentage,
}: LearnPageProps) {
    const [openModules, setOpenModules] = useState<string[]>(modules.map((m) => m.id));
    const [curriculumOpen, setCurriculumOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            if (window.innerWidth < 1024) {
                return false;
            }
            const stored = localStorage.getItem('gmora_curriculum_open');
            if (stored !== null) {
                return stored === 'true';
            }
            return true;
        }
        return true;
    });
    const [progressSheetOpen, setProgressSheetOpen] = useState(false);

    const toggleCurriculum = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setProgressSheetOpen(true);
            return;
        }
        const nextState = !curriculumOpen;
        setCurriculumOpen(nextState);
        localStorage.setItem('gmora_curriculum_open', String(nextState));
    };

    const toggleModule = (id: string) =>
        setOpenModules((open) => (open.includes(id) ? open.filter((m) => m !== id) : [...open, id]));

    useEffect(() => {
        if (!progressSheetOpen) {
            return;
        }
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [progressSheetOpen]);

    const reportProgress = useCallback(
        (percentage: number, completed: boolean) => {
            if (!currentLesson) return;
            router.patch(
                route('learn.progress', currentLesson.id),
                { watch_percentage: percentage, completed },
                {
                    preserveScroll: true,
                    preserveState: true,
                    only: ['modules', 'currentLesson', 'completionPercentage', 'curriculum'],
                },
            );
        },
        [currentLesson],
    );

    const currentId = currentAssignment?.id ?? currentLesson?.id ?? null;
    const currentIndex = curriculum.findIndex((item) => item.id === currentId);
    const prevItem = currentIndex > 0 ? curriculum[currentIndex - 1] : null;
    const nextItem = currentIndex !== -1 && currentIndex + 1 < curriculum.length ? curriculum[currentIndex + 1] : null;

    const allLessons = modules.flatMap((m) => m.lessons ?? []);
    const completedCount = allLessons.filter((l) => l.progress?.status === 'completed').length;

    const canAdvance = currentAssignment
        ? Boolean(currentAssignment.submission) || !currentAssignment.is_required
        : currentLesson?.progress?.status === 'completed';

    const [showCongrats, setShowCongrats] = useState(false);
    const lastDeckPercent = useRef(Number(currentLesson?.progress?.watch_percentage ?? 0));

    useEffect(() => {
        lastDeckPercent.current = Number(currentLesson?.progress?.watch_percentage ?? 0);
    }, [currentLesson?.id, currentLesson?.progress?.watch_percentage]);

    useEffect(() => {
        if (currentLesson?.type !== 'html') {
            return;
        }

        const onMessage = (event: MessageEvent<DeckMessage>) => {
            if (event.origin !== window.location.origin) {
                return;
            }
            const data = event.data;
            if (!data || data.source !== 'gmora-deck') {
                return;
            }

            if (data.type === 'deck-progress') {
                const percent = Math.max(0, Math.min(100, Number(data.percent ?? 0)));
                const complete = Boolean(data.complete) || percent >= 90;
                if (complete || percent - lastDeckPercent.current >= 1) {
                    lastDeckPercent.current = percent;
                    reportProgress(percent, complete);
                }
                return;
            }

            if (data.type === 'deck-navigate') {
                if (data.direction === 'next' && nextItem && canAdvance) {
                    router.visit(itemHref(course.slug, nextItem));
                } else if (data.direction === 'prev' && prevItem) {
                    router.visit(itemHref(course.slug, prevItem));
                } else if (data.direction === 'next' && !nextItem && canAdvance) {
                    setShowCongrats(true);
                }
            }
        };

        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [course.slug, currentLesson?.type, nextItem, prevItem, reportProgress, canAdvance]);

    const markComplete = () => {
        if (!currentLesson) return;
        router.patch(
            route('learn.progress', currentLesson.id),
            { watch_percentage: 100, completed: true },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['modules', 'currentLesson', 'completionPercentage', 'curriculum'],
                onSuccess: () => {
                    if (nextItem) {
                        router.visit(itemHref(course.slug, nextItem));
                    } else {
                        setShowCongrats(true);
                    }
                },
            }
        );
    };

    const pageTitle = currentAssignment?.title ?? currentLesson?.title ?? course.title;
    const isComplete = canAdvance;

    return (
        <DashboardLayout header={course.title} noScroll={true}>
            <Head title={`${pageTitle} — ${course.title}`} />

            <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
                <div className="mb-4 flex items-center justify-between gap-4 flex-wrap shrink-0">
                    <div className="flex items-center gap-4">
                        <Link
                            href={route('dashboard.courses')}
                            className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            My Courses
                        </Link>

                        <Link
                            href={route('discussions.index', course.slug)}
                            className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 transition-colors"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Discussions
                        </Link>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <div className="flex-1 sm:flex-none flex items-center gap-2 min-w-0">
                            <div className="flex-1 sm:w-40 progress-track">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${completionPercentage}%` }}
                                />
                            </div>
                            <span className="text-sm font-semibold text-surface-600 dark:text-surface-300 whitespace-nowrap">
                                {completionPercentage}%
                                <span className="hidden sm:inline"> complete</span>
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={toggleCurriculum}
                            className={`inline-flex items-center gap-1.5 rounded-lg transition-colors shrink-0 ${
                                curriculumOpen || progressSheetOpen
                                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400'
                                    : 'text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800'
                            } px-2.5 py-2 lg:p-2`}
                            title="View course progress"
                            aria-label="View course progress"
                        >
                            <ListChecks className="w-5 h-5 lg:hidden" />
                            <PanelRight className="w-5 h-5 hidden lg:block" />
                            <span className="text-sm font-medium lg:hidden">Progress</span>
                        </button>
                    </div>
                </div>

                <div className={`grid gap-6 flex-1 min-h-0 overflow-hidden transition-all duration-300 ${curriculumOpen ? 'lg:grid-cols-[1fr_340px]' : 'lg:grid-cols-1 max-w-5xl mx-auto w-full'}`}>
                    <div className="min-w-0 min-h-0 h-full overflow-y-auto scrollbar-thin flex flex-col pb-6 lg:pb-2">
                        {currentAssignment ? (
                            <>
                                <div className="flex-1 flex flex-col min-h-[20rem]">
                                    <AssignmentAttemptPanel assignment={currentAssignment} />
                                </div>
                                <div className="card p-4 sm:p-5 lg:p-6 mt-3 lg:mt-5 shrink-0 flex flex-col bg-white dark:bg-surface-950">
                                    <div className="shrink-0">
                                        <p className="text-xs uppercase tracking-wider text-primary-500 font-semibold mb-1">
                                            Assignment{currentAssignment.is_required ? ' · Required' : ''}
                                        </p>
                                        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-surface-900 dark:text-white">
                                            {currentAssignment.title}
                                        </h1>
                                        {currentAssignment.description && (
                                            <p className="text-surface-500 mt-2 leading-relaxed hidden sm:block whitespace-pre-line">
                                                {currentAssignment.description}
                                            </p>
                                        )}
                                    </div>
                                    <NavActions
                                        courseSlug={course.slug}
                                        prevItem={prevItem}
                                        nextItem={nextItem}
                                        canAdvance={canAdvance}
                                        showComplete={false}
                                    />
                                </div>
                            </>
                        ) : currentLesson ? (
                            <>
                        <div className={`flex-1 flex flex-col ${currentLesson.type === 'html' ? 'min-h-[min(48dvh,24rem)] sm:min-h-[22rem] lg:min-h-[min(72dvh,40rem)]' : 'min-h-[20rem]'}`}>
                            {currentLesson.type === 'youtube' && currentLesson.has_video ? (
                                <SecureVideoPlayer
                                    key={currentLesson.id}
                                    lessonId={currentLesson.id}
                                    title={currentLesson.title}
                                    initialPercentage={Number(currentLesson.progress?.watch_percentage ?? 0)}
                                    onProgress={reportProgress}
                                />
                            ) : currentLesson.type === 'live' ? (
                                <LivePanel lesson={currentLesson} />
                            ) : currentLesson.type === 'quiz' ? (
                                <QuizPanel lesson={currentLesson} />
                            ) : currentLesson.type === 'html' ? (
                                <PresentationPanel lesson={currentLesson} />
                            ) : currentLesson.type === 'pdf' ? (
                                <DocumentPanel lesson={currentLesson} />
                            ) : (
                                <PlaceholderPanel lesson={currentLesson} />
                            )}
                        </div>

                        <div className="card p-4 sm:p-5 lg:p-6 mt-3 lg:mt-5 shrink-0 flex flex-col bg-white dark:bg-surface-950">
                            <div className="shrink-0">
                                <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-surface-900 dark:text-white">
                                    {currentLesson.title}
                                </h1>
                                {currentLesson.description && (
                                    <p className="text-surface-500 mt-2 leading-relaxed hidden sm:block">{currentLesson.description}</p>
                                )}
                            </div>

                            <NavActions
                                courseSlug={course.slug}
                                prevItem={prevItem}
                                nextItem={nextItem}
                                canAdvance={isComplete}
                                showComplete
                                isComplete={currentLesson.progress?.status === 'completed'}
                                onMarkComplete={markComplete}
                                durationLabel={formatDuration(currentLesson.duration_seconds)}
                            />
                        </div>
                            </>
                        ) : null}
                    </div>

                    {curriculumOpen && (
                        <aside className="hidden lg:flex card p-2 flex-col min-h-0 h-full overflow-hidden fade-in">
                            <CurriculumList
                                modules={modules}
                                curriculum={curriculum}
                                courseSlug={course.slug}
                                currentId={currentId}
                                openModules={openModules}
                                onToggleModule={toggleModule}
                            />
                        </aside>
                    )}
                </div>
            </div>

            {progressSheetOpen && (
                <div className="lg:hidden fixed inset-0 z-[60] flex flex-col justify-end">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        aria-label="Close progress"
                        onClick={() => setProgressSheetOpen(false)}
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Course progress"
                        className="relative z-10 flex flex-col max-h-[85dvh] rounded-t-3xl bg-white dark:bg-surface-900 shadow-2xl border-t border-surface-200 dark:border-surface-800 pb-[env(safe-area-inset-bottom)]"
                    >
                        <div className="flex justify-center pt-3 pb-1 shrink-0">
                            <span className="w-10 h-1 rounded-full bg-surface-300 dark:bg-surface-700" aria-hidden />
                        </div>

                        <div className="flex items-start justify-between gap-3 px-5 pb-4 border-b border-surface-100 dark:border-surface-800 shrink-0">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-1">
                                    Course progress
                                </p>
                                <h2 className="text-lg font-semibold text-surface-900 dark:text-white truncate">
                                    {course.title}
                                </h2>
                                <p className="text-sm text-surface-500 mt-1">
                                    {completedCount} of {allLessons.length} lessons complete
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="relative w-14 h-14">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
                                        <circle cx="50" cy="50" r="42" strokeWidth="8" fill="none" className="stroke-surface-100 dark:stroke-surface-800" />
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="42"
                                            strokeWidth="8"
                                            fill="none"
                                            strokeLinecap="round"
                                            className="stroke-primary-600"
                                            strokeDasharray={2 * Math.PI * 42}
                                            strokeDashoffset={2 * Math.PI * 42 * (1 - completionPercentage / 100)}
                                        />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-surface-900 dark:text-white">
                                        {completionPercentage}%
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setProgressSheetOpen(false)}
                                    className="btn-icon"
                                    aria-label="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
                            <CurriculumList
                                modules={modules}
                                curriculum={curriculum}
                                courseSlug={course.slug}
                                currentId={currentId}
                                openModules={openModules}
                                onToggleModule={toggleModule}
                                onNavigate={() => setProgressSheetOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {showCongrats && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
                    <div className="card p-8 max-w-sm w-full text-center scale-in shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent pointer-events-none" />
                        <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center mx-auto mb-5">
                            <CheckCircle2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-2 relative">
                            Congratulations!
                        </h2>
                        <p className="text-surface-500 dark:text-surface-400 mb-6 relative">
                            You&apos;ve completed <strong>{course.title}</strong>. Outstanding work!
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 relative">
                            <Link href={route('dashboard.courses')} className="btn-secondary flex-1 justify-center">
                                Go to dashboard
                            </Link>
                            <Link href={route('dashboard.certificates')} className="btn-primary flex-1 justify-center">
                                View certificates
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

function NavActions({
    courseSlug,
    prevItem,
    nextItem,
    canAdvance,
    showComplete,
    isComplete = false,
    onMarkComplete,
    durationLabel,
}: {
    courseSlug: string;
    prevItem: CurriculumItem | null;
    nextItem: CurriculumItem | null;
    canAdvance: boolean;
    showComplete: boolean;
    isComplete?: boolean;
    onMarkComplete?: () => void;
    durationLabel?: string;
}) {
    return (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 pt-3 sm:pt-5 border-t border-surface-200 dark:border-surface-800 shrink-0 mt-3 sm:mt-5">
            {prevItem ? (
                <Link
                    href={itemHref(courseSlug, prevItem)}
                    className="btn-secondary h-11 w-full sm:w-auto justify-center px-4"
                >
                    <span className="sm:hidden">Previous</span>
                    <span className="hidden sm:inline">Previous</span>
                </Link>
            ) : null}

            {nextItem ? (
                canAdvance ? (
                    <Link
                        href={itemHref(courseSlug, nextItem)}
                        className={`btn-secondary h-11 w-full sm:w-auto justify-center px-4 ${prevItem ? '' : 'col-span-2 sm:col-auto'}`}
                    >
                        <span className="sm:hidden">Next</span>
                        <span className="hidden sm:inline">Next</span>
                    </Link>
                ) : (
                    <button
                        type="button"
                        disabled
                        title="Submit the required assignment to continue"
                        className={`btn-secondary h-11 w-full sm:w-auto justify-center px-4 ${prevItem ? '' : 'col-span-2 sm:col-auto'}`}
                    >
                        <Lock className="w-3.5 h-3.5 mr-1" />
                        <span className="sm:hidden">Next</span>
                        <span className="hidden sm:inline">Next</span>
                    </button>
                )
            ) : null}

            {showComplete && onMarkComplete && (
                <button
                    type="button"
                    onClick={onMarkComplete}
                    disabled={isComplete}
                    className={`col-span-2 sm:col-auto h-11 w-full sm:w-auto justify-center px-4 ${isComplete ? 'btn-ghost cursor-default' : 'btn-primary'}`}
                >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="sm:hidden">{isComplete ? 'Completed' : 'Complete'}</span>
                    <span className="hidden sm:inline">{isComplete ? 'Completed' : 'Mark as complete'}</span>
                </button>
            )}
            {durationLabel && (
                <span className="hidden sm:inline text-sm text-surface-400">{durationLabel}</span>
            )}
        </div>
    );
}

function CurriculumList({
    modules,
    curriculum,
    courseSlug,
    currentId,
    openModules,
    onToggleModule,
    onNavigate,
}: {
    modules: Module[];
    curriculum: CurriculumItem[];
    courseSlug: string;
    currentId: string | null;
    openModules: string[];
    onToggleModule: (id: string) => void;
    onNavigate?: () => void;
}) {
    return (
        <div className="overflow-y-auto scrollbar-thin flex-1 min-h-0 pr-1">
            {modules.map((module) => {
                const items = curriculum.filter((item) => item.module_id === module.id);
                const doneInModule = items.filter((item) => item.completed || item.submitted).length;

                return (
                    <div key={module.id} className="mb-1">
                        <button
                            type="button"
                            onClick={() => onToggleModule(module.id)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                        >
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold text-surface-900 dark:text-white">
                                    {module.title}
                                </span>
                                <span className="block text-[11px] text-surface-400 mt-0.5">
                                    {doneInModule}/{items.length} complete
                                </span>
                            </span>
                            <ChevronDown
                                className={`w-4 h-4 text-surface-400 shrink-0 transition-transform ${
                                    openModules.includes(module.id) ? 'rotate-180' : ''
                                }`}
                            />
                        </button>

                        {openModules.includes(module.id) && (
                            <ul className="mt-0.5 space-y-0.5">
                                {items.map((item) => {
                                    const Icon = typeIcon[item.type as keyof typeof typeIcon] ?? (item.kind === 'assignment' ? ClipboardCheck : PlayCircle);
                                    const active = item.id === currentId;
                                    const done = item.completed || item.submitted;

                                    return (
                                        <li key={`${item.kind}-${item.id}`}>
                                            <Link
                                                href={itemHref(courseSlug, item)}
                                                preserveScroll
                                                onClick={onNavigate}
                                                className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                                                    active
                                                        ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 font-medium'
                                                        : 'text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'
                                                }`}
                                            >
                                                {done ? (
                                                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-accent-500" />
                                                ) : item.is_required ? (
                                                    <Lock className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                                                ) : (
                                                    <Circle className="w-4 h-4 mt-0.5 shrink-0 text-surface-300 dark:text-surface-600" />
                                                )}
                                                <span className="flex-1 leading-snug">
                                                    {item.title}
                                                    {item.kind === 'assignment' && (
                                                        <span className="block text-[10px] text-surface-400 font-normal">
                                                            Assignment{item.is_required ? ' · Required' : ''}
                                                        </span>
                                                    )}
                                                </span>
                                                <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-surface-400" />
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function LivePanel({ lesson }: { lesson: Lesson }) {
    const session = lesson.live_session;
    const start = session ? new Date(session.scheduled_start) : null;
    const soon = start ? start.getTime() - Date.now() < 30 * 60 * 1000 : false;

    return (
        <div className="card p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-950 flex items-center justify-center mx-auto mb-4">
                <Radio className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Live class</h2>
            {start && (
                <p className="text-surface-500 mt-1">
                    {start.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
                    {session?.duration_minutes ? ` · ${session.duration_minutes} min` : ''}
                </p>
            )}

            {/* [v2] The join link only appears near the scheduled start, not
                indefinitely in the lesson list. */}
            {soon && session?.zoom_join_url ? (
                <a href={session.zoom_join_url} target="_blank" rel="noreferrer" className="btn-primary mt-5">
                    Join on Zoom
                </a>
            ) : (
                <p className="text-sm text-surface-400 mt-5">
                    The join link appears here 30 minutes before the session starts.
                </p>
            )}
        </div>
    );
}

function QuizPanel({ lesson }: { lesson: Lesson }) {
    return (
        <div className="card p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-7 h-7 text-primary-500" />
            </div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                {lesson.quiz?.title ?? lesson.title}
            </h2>

            {lesson.quiz ? (
                <>
                    <p className="text-surface-500 mt-2">
                        Check what you've picked up before moving on. Passing marks this lesson complete.
                    </p>
                    <Link href={route('quiz.show', lesson.quiz.id)} className="btn-primary mt-5">
                        Open quiz
                    </Link>
                </>
            ) : (
                <p className="text-surface-500 mt-2">This quiz hasn't been published yet.</p>
            )}
        </div>
    );
}

function PresentationPanel({ lesson }: { lesson: Lesson }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [immersive, setImmersive] = useState(false);

    useEffect(() => {
        if (!lesson.has_presentation) {
            return;
        }

        const keys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Home', 'End']);

        const onKeyDown = (event: KeyboardEvent) => {
            if (!keys.has(event.key)) {
                return;
            }
            const target = event.target as HTMLElement | null;
            if (target) {
                const tag = target.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
                    return;
                }
            }

            const frame = iframeRef.current?.contentWindow;
            if (!frame) {
                return;
            }

            event.preventDefault();
            frame.postMessage(
                { source: 'gmora-lms', type: 'deck-key', key: event.key },
                window.location.origin,
            );
        };

        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) {
                return;
            }
            const data = event.data;
            if (!data || data.source !== 'gmora-deck' || data.type !== 'deck-fullscreen') {
                return;
            }
            setImmersive(Boolean(data.active));
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('message', onMessage);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('message', onMessage);
        };
    }, [lesson.has_presentation, lesson.id]);

    useEffect(() => {
        if (!immersive) {
            return;
        }
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [immersive]);

    if (!lesson.has_presentation) {
        return (
            <div className="card p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-950 flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-7 h-7 text-violet-600 dark:text-violet-400" />
                </div>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                    Interactive Presentation
                </h2>
                <p className="text-sm text-surface-400 mt-5">
                    The presentation hasn't been uploaded yet.
                </p>
            </div>
        );
    }

    const src = route('presentation.show', lesson.id);

    return (
        <div
            className={
                immersive
                    ? 'fixed inset-0 z-[200] bg-white dark:bg-surface-950'
                    : 'card relative overflow-hidden h-full min-h-[min(48dvh,24rem)] sm:min-h-[22rem] lg:min-h-[min(70dvh,36rem)] bg-white dark:bg-surface-950'
            }
        >
            <iframe
                ref={iframeRef}
                key={lesson.id}
                src={src}
                title={lesson.title}
                className="absolute inset-0 h-full w-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads"
                allow="clipboard-write; fullscreen"
                allowFullScreen
            />
        </div>
    );
}

function DocumentPanel({ lesson }: { lesson: Lesson }) {
    if (!lesson.has_pdf) {
        return (
            <div className="card p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-7 h-7 text-primary-500" />
                </div>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white">{lesson.title}</h2>
                <p className="text-surface-500 mt-2">The document for this lesson hasn't been uploaded yet.</p>
            </div>
        );
    }

    const src = route('lesson.pdf', lesson.id);

    return (
        <div className="card overflow-hidden h-full flex flex-col">
            {/* The browser's own viewer handles paging, zoom and search. */}
            <object data={src} type="application/pdf" className="w-full flex-1 min-h-0">
                <div className="p-8 text-center">
                    <p className="text-surface-500">
                        Your browser can't display PDFs inline.
                    </p>
                    <a href={src} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4">
                        Open the document
                    </a>
                </div>
            </object>

            <div className="p-3 border-t border-surface-200 dark:border-surface-800 flex justify-end">
                <a href={src} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">
                    <FileText className="w-4 h-4" />
                    Open in a new tab
                </a>
            </div>
        </div>
    );
}

function PlaceholderPanel({ lesson }: { lesson: Lesson }) {
    return (
        <div className="card p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-primary-500" />
            </div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">{lesson.title}</h2>
            <p className="text-surface-500 mt-2">Downloadable resources land in the storage milestone.</p>
        </div>
    );
}
