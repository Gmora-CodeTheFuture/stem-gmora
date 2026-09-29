import { Link } from '@inertiajs/react';
import { CheckCircle2, ClipboardCheck, HelpCircle, Lock } from 'lucide-react';
import {
    CourseShellModule,
    CurriculumItem,
    curriculumItemHref,
} from '@/Components/Learn/courseShell';

type Props = {
    courseSlug: string;
    curriculum: CurriculumItem[];
    modules: CourseShellModule[];
};

export default function CourseGradesPanel({ courseSlug, curriculum, modules }: Props) {
    const gradeItems = curriculum.filter(
        (item) => item.kind === 'assignment' || item.type === 'quiz',
    );

    const quizLessonIds = new Map(
        modules
            .flatMap((m) => m.lessons ?? [])
            .filter((l) => l.quiz?.id)
            .map((l) => [l.id, l.quiz!] as const),
    );

    if (gradeItems.length === 0) {
        return (
            <div className="card p-10 text-center max-w-lg mx-auto">
                <ClipboardCheck className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1.5">
                    No graded items yet
                </h2>
                <p className="text-sm text-surface-500">
                    Assignments and quizzes in this course will show up here with their status.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto w-full space-y-3">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Grades</h2>
                <p className="text-sm text-surface-500 mt-1">
                    Assignments and quizzes across this course.
                </p>
            </div>

            <ul className="card divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden">
                {gradeItems.map((item) => {
                    const done = item.completed || item.submitted;
                    const quiz = item.type === 'quiz' ? quizLessonIds.get(item.id) : null;
                    const href = quiz
                        ? route('quiz.show', quiz.id)
                        : curriculumItemHref(courseSlug, item);

                    let statusLabel = 'Not started';
                    if (item.kind === 'assignment') {
                        statusLabel = done ? 'Submitted' : item.is_required ? 'Required' : 'Open';
                    } else if (done) {
                        statusLabel = 'Completed';
                    }

                    return (
                        <li key={`${item.kind}-${item.id}`}>
                            <Link
                                href={href}
                                className="flex items-center gap-3 px-4 py-4 hover:bg-surface-50 dark:hover:bg-surface-800/60 transition-colors"
                            >
                                <span className="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0">
                                    {item.kind === 'assignment' ? (
                                        <ClipboardCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                    ) : (
                                        <HelpCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                    )}
                                </span>

                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-medium text-surface-900 dark:text-white truncate">
                                        {item.title}
                                    </span>
                                    <span className="block text-xs text-surface-500 mt-0.5">
                                        {item.kind === 'assignment' ? 'Assignment' : 'Quiz'}
                                        {item.is_required ? ' · Required' : ''}
                                    </span>
                                </span>

                                <span className="flex items-center gap-1.5 text-xs font-medium shrink-0">
                                    {done ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 text-accent-500" />
                                            <span className="text-accent-600 dark:text-accent-400">
                                                {statusLabel}
                                            </span>
                                        </>
                                    ) : item.is_required ? (
                                        <>
                                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                                            <span className="text-amber-600 dark:text-amber-400">
                                                {statusLabel}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-surface-400">{statusLabel}</span>
                                    )}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
