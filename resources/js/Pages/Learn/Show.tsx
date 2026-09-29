import { Head, Link, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowLeft,
    CheckCircle2,
    ClipboardCheck,
    FileText,
    Globe,
    HelpCircle,
    LayoutList,
    Lock,
    PlayCircle,
    Radio,
} from 'lucide-react';
import CourseLayout from '@/Layouts/CourseLayout';
import SecureVideoPlayer from '@/Components/SecureVideoPlayer';
import AssignmentAttemptPanel from '@/Components/Learn/AssignmentAttemptPanel';
import CourseCurriculum from '@/Components/Learn/CourseCurriculum';
import CourseGradesPanel from '@/Components/Learn/CourseGradesPanel';
import {
    CurriculumItem,
    curriculumItemHref,
    isModuleLocked,
    moduleProgress,
    nextIncompleteItem,
} from '@/Components/Learn/courseShell';
import { Lesson, Module, PageProps } from '@/types';

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

function formatDuration(seconds: number): string {
    if (!seconds) return '—';
    const minutes = Math.round(seconds / 60);

    return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

function itemHref(courseSlug: string, item: CurriculumItem): string {
    return curriculumItemHref(courseSlug, item);
}

function useTabFromUrl(): 'content' | 'grades' {
    const { url } = usePage();
    const query = url.includes('?') ? url.slice(url.indexOf('?')) : '';
    return new URLSearchParams(query).get('tab') === 'grades' ? 'grades' : 'content';
}

export default function LearnShow({
    course,
    modules,
    curriculum = [],
    currentLesson,
    currentAssignment,
    completionPercentage,
}: LearnPageProps) {
    const activeTab = useTabFromUrl();
    const [openModules, setOpenModules] = useState<string[]>(modules.map((m) => m.id));
    const [mobileMode, setMobileMode] = useState<'overview' | 'player'>('player');

    useEffect(() => {
        if (window.innerWidth < 1024) {
            setMobileMode('overview');
        }
    }, []);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(() => {
        const itemId = currentAssignment?.id ?? currentLesson?.id;
        if (itemId) {
            return curriculum.find((c) => c.id === itemId)?.module_id ?? modules[0]?.id ?? null;
        }
        return modules[0]?.id ?? null;
    });

    const toggleModule = (id: string) =>
        setOpenModules((open) => (open.includes(id) ? open.filter((m) => m !== id) : [...open, id]));

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

    const canAdvance = currentAssignment
        ? Boolean(currentAssignment.submission) || !currentAssignment.is_required
        : currentLesson?.progress?.status === 'completed';

    const [showCongrats, setShowCongrats] = useState(false);
    const lastDeckPercent = useRef(Number(currentLesson?.progress?.watch_percentage ?? 0));

    useEffect(() => {
        lastDeckPercent.current = Number(currentLesson?.progress?.watch_percentage ?? 0);
    }, [currentLesson?.id, currentLesson?.progress?.watch_percentage]);

    // Sync selected module when navigating curriculum
    useEffect(() => {
        const fromCurriculum = curriculum.find((c) => c.id === currentId)?.module_id;
        if (fromCurriculum) {
            setSelectedModuleId(fromCurriculum);
        }
    }, [currentId, curriculum]);

    // When deep-linking to a lesson on mobile, open the player
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.innerWidth >= 1024) {
            setMobileMode('player');
            return;
        }
        // Keep overview as default on first paint; switching items while in player stays in player
    }, [currentId]);

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
            },
        );
    };

    const upNext = useMemo(() => nextIncompleteItem(curriculum), [curriculum]);
    const activeModule = modules.find((m) => m.id === selectedModuleId) ?? modules[0] ?? null;
    const activeModuleProgress = activeModule
        ? moduleProgress(activeModule.id, curriculum)
        : { done: 0, total: 0, percent: 0 };

    const pageTitle = currentAssignment?.title ?? currentLesson?.title ?? course.title;

    const goToPlayer = (item?: CurriculumItem | null) => {
        const target = item ?? upNext ?? (currentId ? curriculum.find((c) => c.id === currentId) : null);
        if (!target) return;
        setMobileMode('player');
        if (target.id !== currentId) {
            router.visit(itemHref(course.slug, target));
        }
    };

    return (
        <CourseLayout
            course={course}
            modules={modules}
            curriculum={curriculum}
            completionPercentage={completionPercentage}
            activeTab={activeTab === 'grades' ? 'grades' : 'content'}
            currentItemId={currentId}
            headerBack={
                activeTab === 'content' && mobileMode === 'player'
                    ? () => setMobileMode('overview')
                    : undefined
            }
        >
            <Head title={`${pageTitle} — ${course.title}`} />

            <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
                {activeTab === 'grades' ? (
                    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 sm:p-6 lg:p-8">
                        <CourseGradesPanel
                            courseSlug={course.slug}
                            curriculum={curriculum}
                            modules={modules}
                        />
                    </div>
                ) : (
                    <>
                        {/* Mobile overview */}
                        <div
                            className={`lg:hidden flex-1 min-h-0 overflow-y-auto scrollbar-thin ${
                                mobileMode === 'overview' ? 'block' : 'hidden'
                            }`}
                        >
                            <MobileOverview
                                course={course}
                                modules={modules}
                                curriculum={curriculum}
                                completionPercentage={completionPercentage}
                                selectedModuleId={activeModule?.id ?? null}
                                onSelectModule={setSelectedModuleId}
                                activeModule={activeModule}
                                activeModuleProgress={activeModuleProgress}
                                upNext={upNext}
                                onContinue={() => goToPlayer(upNext)}
                                openModules={openModules}
                                onToggleModule={toggleModule}
                                currentId={currentId}
                                onNavigateItem={() => setMobileMode('player')}
                            />
                        </div>

                        {/* Player (desktop always; mobile when mode=player) */}
                        <div
                            className={`flex flex-col flex-1 min-h-0 h-full overflow-hidden ${
                                mobileMode === 'player' ? 'flex' : 'hidden lg:flex'
                            }`}
                        >
                            <div className="lg:hidden flex items-center gap-2 px-3 py-2 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setMobileMode('overview')}
                                    className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-primary-600"
                                >
                                    <LayoutList className="w-4 h-4" />
                                    Overview
                                </button>
                                <span className="text-surface-300">·</span>
                                <span className="text-sm font-medium text-surface-800 dark:text-surface-100 truncate">
                                    {pageTitle}
                                </span>
                            </div>

                            {/* Scrollable media only */}
                            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-3 sm:px-5 lg:px-8 py-3 lg:py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-5">
                                {currentAssignment ? (
                                    <div className="flex flex-col min-h-0 h-full gap-3">
                                        <div className="flex-1 min-h-0 overflow-y-auto">
                                            <AssignmentAttemptPanel assignment={currentAssignment} />
                                        </div>
                                        {currentAssignment.description && (
                                            <p className="text-sm text-surface-500 leading-relaxed hidden sm:block whitespace-pre-line shrink-0">
                                                {currentAssignment.description}
                                            </p>
                                        )}
                                    </div>
                                ) : currentLesson ? (
                                    <div className="flex flex-col min-h-0 h-full gap-3">
                                        <div className="flex-1 min-h-0 flex flex-col">
                                            {currentLesson.type === 'youtube' && currentLesson.has_video ? (
                                                <SecureVideoPlayer
                                                    key={currentLesson.id}
                                                    lessonId={currentLesson.id}
                                                    title={currentLesson.title}
                                                    initialPercentage={Number(
                                                        currentLesson.progress?.watch_percentage ?? 0,
                                                    )}
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
                                        {currentLesson.description && (
                                            <p className="text-sm text-surface-500 leading-relaxed hidden sm:block shrink-0">
                                                {currentLesson.description}
                                            </p>
                                        )}
                                    </div>
                                ) : null}
                            </div>

                            {/* Desktop pinned footer — Prev / Next / Complete always visible */}
                            <div className="hidden lg:flex shrink-0 items-center gap-4 px-6 py-4 border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs uppercase tracking-wider text-primary-500 font-semibold truncate">
                                        {currentAssignment
                                            ? `Assignment${currentAssignment.is_required ? ' · Required' : ''}`
                                            : 'Lesson'}
                                    </p>
                                    <h2 className="text-base font-semibold text-surface-900 dark:text-white truncate">
                                        {pageTitle}
                                    </h2>
                                </div>
                                <NavActions
                                    courseSlug={course.slug}
                                    prevItem={prevItem}
                                    nextItem={nextItem}
                                    canAdvance={canAdvance}
                                    showComplete={Boolean(currentLesson) && !currentAssignment}
                                    isComplete={currentLesson?.progress?.status === 'completed'}
                                    onMarkComplete={markComplete}
                                    durationLabel={
                                        currentLesson
                                            ? formatDuration(currentLesson.duration_seconds)
                                            : undefined
                                    }
                                    compact
                                />
                            </div>

                            {/* Mobile sticky next / complete */}
                            <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-surface-200 dark:border-surface-800 bg-white/95 dark:bg-surface-900/95 backdrop-blur px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                                <MobileStickyNav
                                    courseSlug={course.slug}
                                    prevItem={prevItem}
                                    nextItem={nextItem}
                                    canAdvance={canAdvance}
                                    showComplete={Boolean(currentLesson) && !currentAssignment}
                                    isComplete={currentLesson?.progress?.status === 'completed'}
                                    onMarkComplete={markComplete}
                                    onCongrats={() => setShowCongrats(true)}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

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
        </CourseLayout>
    );
}

function MobileOverview({
    course,
    modules,
    curriculum,
    completionPercentage,
    selectedModuleId,
    onSelectModule,
    activeModule,
    activeModuleProgress,
    upNext,
    onContinue,
    openModules,
    onToggleModule,
    currentId,
    onNavigateItem,
}: {
    course: { slug: string; title: string };
    modules: Module[];
    curriculum: CurriculumItem[];
    completionPercentage: number;
    selectedModuleId: string | null;
    onSelectModule: (id: string) => void;
    activeModule: Module | null;
    activeModuleProgress: { done: number; total: number; percent: number };
    upNext: CurriculumItem | null;
    onContinue: () => void;
    openModules: string[];
    onToggleModule: (id: string) => void;
    currentId: string | null;
    onNavigateItem: () => void;
}) {
    return (
        <div className="px-4 pt-4 pb-8 space-y-5">
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
                {modules.map((module, index) => {
                    const locked = isModuleLocked(modules, curriculum, module.id);
                    const active = module.id === selectedModuleId;

                    return (
                        <button
                            key={module.id}
                            type="button"
                            disabled={locked}
                            onClick={() => onSelectModule(module.id)}
                            className={`shrink-0 inline-flex items-center justify-center gap-1.5 min-w-[2.75rem] h-10 px-3 rounded-full text-sm font-semibold transition-colors ${
                                active
                                    ? 'bg-primary-600 text-white'
                                    : locked
                                      ? 'bg-surface-100 dark:bg-surface-800 text-surface-400'
                                      : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200'
                            }`}
                            title={module.title}
                        >
                            {locked ? <Lock className="w-3.5 h-3.5" /> : index + 1}
                        </button>
                    );
                })}
            </div>

            <div>
                <p className="text-sm font-medium text-surface-700 dark:text-surface-200">
                    {activeModuleProgress.percent}% Module Completed
                </p>
                <div className="mt-2 progress-track">
                    <div className="progress-fill" style={{ width: `${activeModuleProgress.percent}%` }} />
                </div>
                <p className="text-xs text-surface-400 mt-1.5">
                    Course {completionPercentage}% · {activeModuleProgress.done}/{activeModuleProgress.total} in this
                    module
                </p>
            </div>

            {upNext && (
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2 text-center">
                        Up Next
                    </p>
                    <div className="card p-4 border-2 border-primary-200 dark:border-primary-800">
                        <h3 className="text-base font-semibold text-surface-900 dark:text-white leading-snug">
                            {upNext.title}
                        </h3>
                        <div className="mt-4 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                                {upNext.kind === 'assignment' ? (
                                    <ClipboardCheck className="w-3.5 h-3.5" />
                                ) : (
                                    <PlayCircle className="w-3.5 h-3.5" />
                                )}
                                {upNext.kind === 'assignment' ? 'Assignment' : upNext.type}
                            </span>
                            <button type="button" onClick={onContinue} className="btn-primary ml-auto">
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeModule && (
                <div>
                    <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-1">
                        {activeModule.title}
                    </h2>
                    {activeModule.description && (
                        <p className="text-sm text-surface-500 leading-relaxed mb-3">{activeModule.description}</p>
                    )}
                    <div className="card p-2">
                        <CourseCurriculum
                            modules={modules.filter((m) => m.id === activeModule.id)}
                            curriculum={curriculum}
                            courseSlug={course.slug}
                            currentId={currentId}
                            openModules={openModules.includes(activeModule.id) ? [activeModule.id] : [activeModule.id]}
                            onToggleModule={onToggleModule}
                            onNavigate={onNavigateItem}
                            dense
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function MobileStickyNav({
    courseSlug,
    prevItem,
    nextItem,
    canAdvance,
    showComplete,
    isComplete = false,
    onMarkComplete,
    onCongrats,
}: {
    courseSlug: string;
    prevItem: CurriculumItem | null;
    nextItem: CurriculumItem | null;
    canAdvance: boolean;
    showComplete: boolean;
    isComplete?: boolean;
    onMarkComplete?: () => void;
    onCongrats?: () => void;
}) {
    return (
        <div className="flex items-center gap-2">
            {prevItem && (
                <Link
                    href={itemHref(courseSlug, prevItem)}
                    className="btn-secondary h-11 px-3 shrink-0"
                    aria-label="Previous"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Link>
            )}

            {showComplete && onMarkComplete && !isComplete && (
                <button type="button" onClick={onMarkComplete} className="btn-secondary h-11 flex-1 justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                    Complete
                </button>
            )}

            {nextItem ? (
                canAdvance ? (
                    <Link href={itemHref(courseSlug, nextItem)} className="btn-primary h-11 flex-1 justify-center">
                        Go to next item
                    </Link>
                ) : (
                    <button type="button" disabled className="btn-secondary h-11 flex-1 justify-center">
                        <Lock className="w-3.5 h-3.5 mr-1" />
                        Locked
                    </button>
                )
            ) : canAdvance ? (
                <button type="button" onClick={onCongrats} className="btn-primary h-11 flex-1 justify-center">
                    Finish course
                </button>
            ) : null}
        </div>
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
    compact = false,
}: {
    courseSlug: string;
    prevItem: CurriculumItem | null;
    nextItem: CurriculumItem | null;
    canAdvance: boolean;
    showComplete: boolean;
    isComplete?: boolean;
    onMarkComplete?: () => void;
    durationLabel?: string;
    compact?: boolean;
}) {
    return (
        <div
            className={
                compact
                    ? 'flex flex-row flex-wrap items-center gap-2 shrink-0'
                    : 'grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 pt-3 sm:pt-5 border-t border-surface-200 dark:border-surface-800 shrink-0 mt-3 sm:mt-5'
            }
        >
            {prevItem ? (
                <Link
                    href={itemHref(courseSlug, prevItem)}
                    className="btn-secondary h-11 w-auto justify-center px-4"
                >
                    Previous
                </Link>
            ) : null}

            {nextItem ? (
                canAdvance ? (
                    <Link
                        href={itemHref(courseSlug, nextItem)}
                        className="btn-secondary h-11 w-auto justify-center px-4"
                    >
                        Next
                    </Link>
                ) : (
                    <button
                        type="button"
                        disabled
                        title="Submit the required assignment to continue"
                        className="btn-secondary h-11 w-auto justify-center px-4"
                    >
                        <Lock className="w-3.5 h-3.5 mr-1" />
                        Next
                    </button>
                )
            ) : null}

            {showComplete && onMarkComplete && (
                <button
                    type="button"
                    onClick={onMarkComplete}
                    disabled={isComplete}
                    className={`h-11 w-auto justify-center px-4 ${isComplete ? 'btn-ghost cursor-default' : 'btn-primary'}`}
                >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {isComplete ? 'Completed' : 'Mark as complete'}
                </button>
            )}
            {durationLabel && <span className="hidden sm:inline text-sm text-surface-400">{durationLabel}</span>}
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
                        Check what you&apos;ve picked up before moving on. Passing marks this lesson complete.
                    </p>
                    <Link href={route('quiz.show', lesson.quiz.id)} className="btn-primary mt-5">
                        Open quiz
                    </Link>
                </>
            ) : (
                <p className="text-surface-500 mt-2">This quiz hasn&apos;t been published yet.</p>
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
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Interactive Presentation</h2>
                <p className="text-sm text-surface-400 mt-5">The presentation hasn&apos;t been uploaded yet.</p>
            </div>
        );
    }

    const src = route('presentation.show', lesson.id);

    return (
        <div
            className={
                immersive
                    ? 'fixed inset-0 z-[200] bg-white dark:bg-surface-950'
                    : 'card relative overflow-hidden flex-1 min-h-0 h-full bg-white dark:bg-surface-950'
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
                <p className="text-surface-500 mt-2">The document for this lesson hasn&apos;t been uploaded yet.</p>
            </div>
        );
    }

    const src = route('lesson.pdf', lesson.id);

    return (
        <div className="card overflow-hidden flex-1 min-h-0 h-full flex flex-col">
            <object data={src} type="application/pdf" className="w-full flex-1 min-h-0">
                <div className="p-8 text-center">
                    <p className="text-surface-500">Your browser can&apos;t display PDFs inline.</p>
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
