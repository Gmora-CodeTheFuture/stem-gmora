import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    Award, BarChart3, CheckCircle2, ChevronDown, Clock, FileText,
    HelpCircle, Lock, PlayCircle, Radio, Users, Video,
} from 'lucide-react';
import MarketingLayout from '@/Layouts/MarketingLayout';
import { Course, Enrollment, PageProps } from '@/types';

interface Props {
    course: Course;
    enrollment: Enrollment | null;
}

const typeIcon = { youtube: Video, live: Radio, pdf: FileText, quiz: HelpCircle } as const;

function formatDuration(seconds: number): string {
    if (!seconds) return '';
    const minutes = Math.round(seconds / 60);

    return `${minutes} min`;
}

export default function CourseDetail({ course, enrollment }: Props) {
    const { auth } = usePage<PageProps>().props;
    const [openModules, setOpenModules] = useState<string[]>(
        course.modules?.slice(0, 1).map((m) => m.id) ?? [],
    );
    const [enrolling, setEnrolling] = useState(false);

    const isActive = enrollment?.status === 'active' || enrollment?.status === 'completed';
    const isFree = Number(course.price) <= 0;

    const enroll = () => {
        if (!auth?.user) {
            router.visit(route('login'));
            return;
        }

        setEnrolling(true);
        router.post(route('enroll.store', course.slug), {}, { onFinish: () => setEnrolling(false) });
    };

    const toggleModule = (id: string) =>
        setOpenModules((open) => (open.includes(id) ? open.filter((m) => m !== id) : [...open, id]));

    return (
        <MarketingLayout>
            <Head title={`${course.title} — Gmora STEM`} />

            {/* ── Hero ─────────────────────────────────────────── */}
            <section className="pt-28 md:pt-36 pb-14 bg-gradient-to-b from-primary-950 to-surface-950">
                <div className="container-wide grid lg:grid-cols-[1fr_360px] gap-10 items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="badge-primary">{course.category}</span>
                            <span className="badge-accent capitalize">{course.difficulty}</span>
                        </div>

                        <h1 className="text-3xl md:text-5xl font-extrabold font-display text-white leading-tight mb-4">
                            {course.title}
                        </h1>
                        <p className="text-lg text-surface-300 max-w-2xl">{course.subtitle}</p>

                        <div className="flex flex-wrap items-center gap-5 mt-6 text-sm text-surface-400">
                            <span className="inline-flex items-center gap-1.5">
                                <BarChart3 className="w-4 h-4" />
                                {course.total_lessons} lessons
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                {Math.round(course.duration_minutes / 60)} hours
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                {course.total_enrollments} enrolled
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <Award className="w-4 h-4" />
                                Certificate on completion
                            </span>
                        </div>
                    </div>

                    {/* Enrollment card */}
                    <div className="glass-card p-6 lg:sticky lg:top-24">
                        <div className="text-3xl font-bold font-display text-white mb-1">
                            {isFree ? 'Free' : `${course.currency} ${course.price}`}
                        </div>
                        <p className="text-sm text-surface-400 mb-5">
                            Lifetime access · learn at your own pace
                        </p>

                        {isActive ? (
                            <Link href={route('learn.show', course.slug)} className="btn-primary w-full">
                                <PlayCircle className="w-4 h-4" />
                                Continue learning
                            </Link>
                        ) : (
                            <button onClick={enroll} disabled={enrolling} className="btn-primary w-full">
                                {enrolling ? 'Enrolling…' : isFree ? 'Enroll for free' : 'Enroll now'}
                            </button>
                        )}

                        {!isFree && !isActive && (
                            <p className="text-xs text-surface-400 mt-3 text-center">
                                Card checkout is not available yet.
                            </p>
                        )}

                        <ul className="mt-6 space-y-2.5 text-sm text-surface-300">
                            {[
                                'Hands-on project work',
                                'Live labs with the instructor',
                                'Verified, shareable certificate',
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-accent-400 shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* ── Body ─────────────────────────────────────────── */}
            <section className="section pt-14">
                <div className="container-wide grid lg:grid-cols-[1fr_320px] gap-10 items-start">
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold font-display text-surface-900 dark:text-white mb-3">
                            About this course
                        </h2>
                        <div className="text-surface-600 dark:text-surface-300 leading-relaxed whitespace-pre-line mb-10">
                            {course.description}
                        </div>

                        <h2 className="text-xl font-bold font-display text-surface-900 dark:text-white mb-4">
                            Curriculum
                        </h2>

                        <div className="space-y-3">
                            {course.modules?.map((module, index) => (
                                <div key={module.id} className="card overflow-hidden">
                                    <button
                                        onClick={() => toggleModule(module.id)}
                                        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                                    >
                                        <div>
                                            <div className="text-xs font-semibold uppercase tracking-wider text-primary-500 mb-0.5">
                                                Module {index + 1}
                                            </div>
                                            <div className="font-semibold text-surface-900 dark:text-white">
                                                {module.title}
                                            </div>
                                        </div>
                                        <ChevronDown
                                            className={`w-5 h-5 text-surface-400 shrink-0 transition-transform ${
                                                openModules.includes(module.id) ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </button>

                                    {openModules.includes(module.id) && (
                                        <ul className="border-t border-surface-100 dark:border-surface-800 divide-y divide-surface-100 dark:divide-surface-800">
                                            {module.lessons?.map((lesson) => {
                                                const Icon = typeIcon[lesson.type] ?? PlayCircle;
                                                const unlocked = isActive || lesson.is_free_preview;

                                                return (
                                                    <li
                                                        key={lesson.id}
                                                        className="flex items-center gap-3 px-5 py-3 text-sm"
                                                    >
                                                        <Icon className="w-4 h-4 text-surface-400 shrink-0" />
                                                        <span className="flex-1 text-surface-700 dark:text-surface-200">
                                                            {lesson.title}
                                                        </span>
                                                        {lesson.is_free_preview && !isActive && (
                                                            <span className="badge-accent">Preview</span>
                                                        )}
                                                        <span className="text-xs text-surface-400">
                                                            {formatDuration(lesson.duration_seconds)}
                                                        </span>
                                                        {!unlocked && (
                                                            <Lock className="w-3.5 h-3.5 text-surface-300 dark:text-surface-600" />
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Instructor */}
                    <aside className="card p-6">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-surface-400 mb-4">
                            Your instructor
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white font-semibold">
                                {course.instructor?.full_name?.charAt(0) ?? '?'}
                            </div>
                            <div>
                                <div className="font-semibold text-surface-900 dark:text-white">
                                    {course.instructor?.full_name}
                                </div>
                                <div className="text-xs text-surface-500">Gmora STEM Instructor</div>
                            </div>
                        </div>
                        {course.instructor?.bio && (
                            <p className="text-sm text-surface-500 mt-4 leading-relaxed">{course.instructor.bio}</p>
                        )}
                    </aside>
                </div>
            </section>
        </MarketingLayout>
    );
}
