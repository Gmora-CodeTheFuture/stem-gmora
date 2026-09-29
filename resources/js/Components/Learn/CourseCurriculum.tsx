import { Link } from '@inertiajs/react';
import {
    CheckCircle2,
    ChevronDown,
    Circle,
    ClipboardCheck,
    FileText,
    Globe,
    HelpCircle,
    Lock,
    PlayCircle,
    Radio,
    Video,
} from 'lucide-react';
import {
    CourseShellModule,
    CurriculumItem,
    curriculumItemHref,
} from '@/Components/Learn/courseShell';

const typeIcon = {
    youtube: Video,
    live: Radio,
    pdf: FileText,
    quiz: HelpCircle,
    html: Globe,
    assignment: ClipboardCheck,
} as const;

type Props = {
    modules: CourseShellModule[];
    curriculum: CurriculumItem[];
    courseSlug: string;
    currentId: string | null;
    openModules: string[];
    onToggleModule: (id: string) => void;
    onNavigate?: () => void;
    /** Compact list for mobile drawers / overview */
    dense?: boolean;
};

export default function CourseCurriculum({
    modules,
    curriculum,
    courseSlug,
    currentId,
    openModules,
    onToggleModule,
    onNavigate,
    dense = false,
}: Props) {
    return (
        <div className="pr-1">
            {modules.map((module) => {
                const items = curriculum.filter((item) => item.module_id === module.id);
                const doneInModule = items.filter((item) => item.completed || item.submitted).length;

                return (
                    <div key={module.id} className={dense ? 'mb-0.5' : 'mb-1'}>
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
                                    const Icon =
                                        typeIcon[item.type as keyof typeof typeIcon] ??
                                        (item.kind === 'assignment' ? ClipboardCheck : PlayCircle);
                                    const active = item.id === currentId;
                                    const done = item.completed || item.submitted;

                                    return (
                                        <li key={`${item.kind}-${item.id}`}>
                                            <Link
                                                href={curriculumItemHref(courseSlug, item)}
                                                preserveScroll
                                                onClick={onNavigate}
                                                className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors border-l-2 ${
                                                    active
                                                        ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 font-medium border-l-primary-600'
                                                        : 'border-l-transparent text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'
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

            {modules.length === 0 && (
                <p className="px-3 py-6 text-sm text-surface-500 text-center">
                    No published modules yet.
                </p>
            )}
        </div>
    );
}
