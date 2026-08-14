import { Head, Link, router } from '@inertiajs/react';
import { useCallback, useState } from 'react';
import {
    ArrowLeft, CheckCircle2, ChevronDown, Circle, FileText,
    Globe, HelpCircle, MessageSquare, PlayCircle, Radio, Video, PanelRight
} from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import SecureVideoPlayer from '@/Components/SecureVideoPlayer';
import { Lesson, Module, PageProps } from '@/types';

interface LearnPageProps extends PageProps {
    course: { id: string; title: string; slug: string; category: string; total_lessons: number };
    modules: Module[];
    currentLesson: Lesson;
    completionPercentage: number;
}

const typeIcon = {
    youtube: Video,
    live: Radio,
    pdf: FileText,
    quiz: HelpCircle,
    html: Globe,
} as const;

function formatDuration(seconds: number): string {
    if (!seconds) return '—';
    const minutes = Math.round(seconds / 60);

    return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

export default function LearnShow({ course, modules, currentLesson, completionPercentage }: LearnPageProps) {
    const [openModules, setOpenModules] = useState<string[]>(modules.map((m) => m.id));
    const [curriculumOpen, setCurriculumOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('gmora_curriculum_open') !== 'false';
        }
        return true;
    });

    const toggleCurriculum = () => {
        const nextState = !curriculumOpen;
        setCurriculumOpen(nextState);
        localStorage.setItem('gmora_curriculum_open', String(nextState));
    };

    const toggleModule = (id: string) =>
        setOpenModules((open) => (open.includes(id) ? open.filter((m) => m !== id) : [...open, id]));

    const reportProgress = useCallback(
        (percentage: number, completed: boolean) => {
            router.patch(
                route('learn.progress', currentLesson.id),
                { watch_percentage: percentage, completed },
                { preserveScroll: true, preserveState: true, only: completed ? undefined : [] },
            );
        },
        [currentLesson.id],
    );

    const allLessons = modules.flatMap((m) => m.lessons ?? []);
    const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id);
    const prevLessonId = currentIndex > 0 ? allLessons[currentIndex - 1].id : null;
    const nextLessonId = currentIndex !== -1 && currentIndex + 1 < allLessons.length ? allLessons[currentIndex + 1].id : null;

    const [showCongrats, setShowCongrats] = useState(false);

    const markComplete = () => {
        router.patch(
            route('learn.progress', currentLesson.id),
            { watch_percentage: 100, completed: true },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    if (nextLessonId) {
                        router.visit(route('learn.lesson', [course.slug, nextLessonId]));
                    } else {
                        setShowCongrats(true);
                    }
                },
            }
        );
    };

    const isComplete = currentLesson.progress?.status === 'completed';

    return (
        <DashboardLayout header={course.title} noScroll={true}>
            <Head title={`${currentLesson.title} — ${course.title}`} />

            <div className="mb-6 flex items-center justify-between gap-4 flex-wrap shrink-0">
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

                <div className="flex items-center gap-3">
                    <div className="w-40 progress-track">
                        <div
                            className="progress-fill"
                            style={{ width: `${completionPercentage}%` }}
                        />
                    </div>
                    <span className="text-sm font-semibold text-surface-600 dark:text-surface-300 mr-2">
                        {completionPercentage}% complete
                    </span>
                    <button
                        onClick={toggleCurriculum}
                        className={`p-2 rounded-lg transition-colors ${
                            curriculumOpen 
                                ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400' 
                                : 'text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800'
                        }`}
                        title="Toggle curriculum sidebar"
                        aria-label="Toggle curriculum sidebar"
                    >
                        <PanelRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className={`grid gap-6 h-full min-h-0 transition-all duration-300 ${curriculumOpen ? 'lg:grid-cols-[1fr_340px]' : 'lg:grid-cols-1 max-w-5xl mx-auto w-full'}`}>
                {/* ── Player / lesson body ─────────────────────── */}
                <div className="min-w-0 flex flex-col h-full pb-2">
                    <div className="shrink-0">
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
                        ) : (
                            <PlaceholderPanel lesson={currentLesson} />
                        )}
                    </div>

                    <div className="card p-5 lg:p-6 mt-4 lg:mt-5 flex-1 min-h-0 overflow-y-auto scrollbar-thin flex flex-col">
                        <div className="shrink-0">
                            <h1 className="text-xl md:text-2xl font-semibold text-surface-900 dark:text-white">
                                {currentLesson.title}
                            </h1>
                            {currentLesson.description && (
                                <p className="text-surface-500 mt-2 leading-relaxed">{currentLesson.description}</p>
                            )}
                        </div>

                        <div className="flex items-center gap-3 mt-auto pt-5 border-t border-surface-200 dark:border-surface-800 shrink-0">
                            {prevLessonId && (
                                <Link
                                    href={route('learn.lesson', [course.slug, prevLessonId])}
                                    className="btn-secondary"
                                >
                                    Previous lesson
                                </Link>
                            )}

                            {nextLessonId && (
                                isComplete ? (
                                    <Link
                                        href={route('learn.lesson', [course.slug, nextLessonId])}
                                        className="btn-secondary"
                                    >
                                        Next lesson
                                    </Link>
                                ) : (
                                    <button disabled className="btn-secondary opacity-50 cursor-not-allowed">
                                        Next lesson
                                    </button>
                                )
                            )}
                            
                            <button
                                onClick={markComplete}
                                disabled={isComplete}
                                className={isComplete ? 'btn-ghost cursor-default' : 'btn-primary'}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                {isComplete ? 'Completed' : 'Mark as complete'}
                            </button>
                            <span className="text-sm text-surface-400">
                                {formatDuration(currentLesson.duration_seconds)}
                            </span>
                        </div>
                    </div>

                </div>

                {/* ── Curriculum sidebar ───────────────────────── */}
                {curriculumOpen && (
                    <aside className="card p-2 flex flex-col h-full overflow-hidden fade-in">
                        <div className="overflow-y-auto scrollbar-thin flex-1 pr-1">
                            {modules.map((module) => (
                                <div key={module.id} className="mb-1">
                                    <button
                                        onClick={() => toggleModule(module.id)}
                                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                                    >
                                        <span className="text-sm font-semibold text-surface-900 dark:text-white">
                                            {module.title}
                                        </span>
                                        <ChevronDown
                                            className={`w-4 h-4 text-surface-400 shrink-0 transition-transform ${
                                                openModules.includes(module.id) ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </button>

                                    {openModules.includes(module.id) && (
                                        <ul className="mt-0.5 space-y-0.5">
                                            {(module.lessons ?? []).map((lesson) => {
                                                const Icon = typeIcon[lesson.type] ?? PlayCircle;
                                                const active = lesson.id === currentLesson.id;
                                                const done = lesson.progress?.status === 'completed';

                                                return (
                                                    <li key={lesson.id}>
                                                        <Link
                                                            href={route('learn.lesson', [course.slug, lesson.id])}
                                                            preserveScroll
                                                            className={`flex items-start gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                                                                active
                                                                    ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 font-medium'
                                                                    : 'text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'
                                                            }`}
                                                        >
                                                            {done ? (
                                                                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-accent-500" />
                                                            ) : (
                                                                <Circle className="w-4 h-4 mt-0.5 shrink-0 text-surface-300 dark:text-surface-600" />
                                                            )}
                                                            <span className="flex-1 leading-snug">{lesson.title}</span>
                                                            <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-surface-400" />
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    </aside>
                )}
            </div>

            {/* Congratulations Modal */}
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
                            You've completed <strong>{course.title}</strong>. Outstanding work!
                        </p>
                        <div className="flex gap-3 relative">
                            <Link href={route('dashboard.courses')} className="btn-secondary flex-1">
                                Go to dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
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
    const handleLaunch = () => {
        if (lesson.has_presentation) {
            window.open(route('presentation.show', lesson.id), '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div className="card p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-950 flex items-center justify-center mx-auto mb-4">
                <Globe className="w-7 h-7 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                Interactive Presentation
            </h2>
            <p className="text-surface-500 mt-2 max-w-md mx-auto">
                This lesson contains an interactive HTML presentation. Click the button below to open it in a new tab and explore at your own pace.
            </p>
            {lesson.has_presentation ? (
                <button onClick={handleLaunch} className="btn-primary mt-5 gap-2">
                    <Globe className="w-4 h-4" />
                    Launch Interactive Presentation
                </button>
            ) : (
                <p className="text-sm text-surface-400 mt-5">
                    The presentation hasn't been uploaded yet.
                </p>
            )}
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
