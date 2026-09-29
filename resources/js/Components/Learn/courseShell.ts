export type CurriculumItem = {
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

export type CourseShellCourse = {
    id: string;
    title: string;
    slug: string;
    category?: string;
    total_lessons?: number;
};

export type CourseShellModule = {
    id: string;
    title: string;
    description?: string | null;
    order_index: number;
    lessons?: Array<{
        id: string;
        title: string;
        type?: string;
        duration_seconds?: number;
        progress?: { status?: string; watch_percentage?: number } | null;
        quiz?: { id: string; title: string } | null;
    }>;
    assignments?: Array<{
        id: string;
        title: string;
        is_required?: boolean;
        submitted?: boolean;
        max_marks?: number;
    }>;
};

export type CourseTab = 'content' | 'grades' | 'discussions';

export function curriculumItemHref(courseSlug: string, item: CurriculumItem): string {
    return item.kind === 'assignment'
        ? route('learn.assignment', [courseSlug, item.id])
        : route('learn.lesson', [courseSlug, item.id]);
}

/** A module is locked when any earlier required curriculum item is incomplete. */
export function isModuleLocked(
    modules: CourseShellModule[],
    curriculum: CurriculumItem[],
    moduleId: string,
): boolean {
    const moduleIndex = modules.findIndex((m) => m.id === moduleId);
    if (moduleIndex <= 0) {
        return false;
    }

    const priorModuleIds = new Set(modules.slice(0, moduleIndex).map((m) => m.id));

    return curriculum.some(
        (item) =>
            priorModuleIds.has(item.module_id) &&
            item.is_required &&
            !item.submitted &&
            !item.completed,
    );
}

export function nextIncompleteItem(curriculum: CurriculumItem[]): CurriculumItem | null {
    return curriculum.find((item) => !(item.completed || item.submitted)) ?? null;
}

export function moduleProgress(
    moduleId: string,
    curriculum: CurriculumItem[],
): { done: number; total: number; percent: number } {
    const items = curriculum.filter((item) => item.module_id === moduleId);
    const done = items.filter((item) => item.completed || item.submitted).length;
    const total = items.length;

    return {
        done,
        total,
        percent: total === 0 ? 0 : Math.round((done / total) * 100),
    };
}
