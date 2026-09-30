import { Head, useForm, Link, router } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import QuizBuilderPanel from '@/Components/Tutor/QuizBuilderPanel';
import MaterialsEditor, { TutorMaterial } from '@/Components/Tutor/MaterialsEditor';
import AssignmentQuestionBuilder from '@/Components/Tutor/AssignmentQuestionBuilder';
import SystemSelect from '@/Components/SystemSelect';
import { PageProps, Course, Module, Lesson, Assignment, User } from '@/types';
import { FormEventHandler, useEffect, useState } from 'react';
import { Plus, GripVertical, Trash2, Video, FileText, CheckCircle, AlertCircle, Clock, Globe, Upload, Pencil, HelpCircle, Radio, ClipboardCheck, ChevronDown } from 'lucide-react';

interface ReadinessCheck {
    label: string;
    passed: boolean;
    detail: string;
    manual?: boolean;
}

interface Props extends PageProps {
    course: Course;
    readiness: { checks: ReadinessCheck[]; blocking: number };
    canPublishDirectly: boolean;
    instructors?: Array<Pick<User, 'id' | 'full_name' | 'email'>>;
    canAssignInstructor?: boolean;
}

const LESSON_TYPE_OPTIONS = [
    { value: 'youtube', label: 'YouTube Video' },
    { value: 'pdf', label: 'PDF Document' },
    { value: 'html', label: 'HTML Presentation' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'live', label: 'Live Session' },
];

const DIFFICULTY_OPTIONS = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
];

const STATUS_STYLE: Record<string, string> = {
    draft: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300',
    pending_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    archived: 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400',
};

export default function EditCourse({ course, readiness, canPublishDirectly, instructors = [], canAssignInstructor = false }: Props) {
    const [activeTab, setActiveTab] = useState<'details' | 'curriculum' | 'assignments'>('details');

    const { data, setData, patch, errors, processing } = useForm({
        title: course.title,
        subtitle: course.subtitle || '',
        description: course.description || '',
        category: course.category,
        difficulty: course.difficulty,
        language: course.language,
        price: course.price,
        currency: course.currency,
        instructor_id: course.instructor_id,
    });

    const submitDetails: FormEventHandler = (e) => {
        e.preventDefault();
        patch(`/tutor/courses/${course.id}`);
    };

    // Module Form State
    const [showModuleForm, setShowModuleForm] = useState(false);
    const [moduleTitle, setModuleTitle] = useState('');
    const [moduleDesc, setModuleDesc] = useState('');

    const addModule: FormEventHandler = (e) => {
        e.preventDefault();
        router.post(`/tutor/courses/${course.id}/modules`, { title: moduleTitle, description: moduleDesc }, {
            onSuccess: () => {
                setModuleTitle('');
                setModuleDesc('');
                setShowModuleForm(false);
            }
        });
    };

    // Lesson Form State
    const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null);
    const [lessonData, setLessonData] = useState({ title: '', type: 'youtube', content_ref: '', duration_minutes: 0, is_free_preview: false });

    const blankLesson = { title: '', type: 'youtube', content_ref: '', duration_minutes: 0, is_free_preview: false };

    // Duration is authored in minutes but stored in seconds.
    const lessonPayload = (form: typeof blankLesson) => ({
        title: form.title,
        type: form.type,
        content_ref: form.content_ref,
        duration_seconds: Math.round((Number(form.duration_minutes) || 0) * 60),
        is_free_preview: form.is_free_preview,
    });

    const addLesson: FormEventHandler = (e) => {
        e.preventDefault();
        if (!addingLessonTo) return;
        router.post(`/tutor/modules/${addingLessonTo}/lessons`, lessonPayload(lessonData), {
            onSuccess: () => {
                setLessonData(blankLesson);
                setAddingLessonTo(null);
            }
        });
    };

    // Editing an existing lesson — without this a mistake at creation time (a
    // missing duration, a wrong video id) can only be fixed by deleting it.
    const [editingLesson, setEditingLesson] = useState<(typeof blankLesson & { id: string }) | null>(null);

    const openLesson = (lesson: Lesson) => {
        const parentId = (course.modules ?? []).find((m: Module) =>
            m.lessons?.some((l: Lesson) => l.id === lesson.id),
        )?.id;
        if (parentId) expandModule(parentId);
        setEditingLesson({
            id: lesson.id,
            title: lesson.title,
            type: lesson.type,
            // Blank means "leave the stored video alone" — the server treats it so.
            content_ref: lesson.content_ref ?? '',
            duration_minutes: Math.round((lesson.duration_seconds ?? 0) / 60),
            is_free_preview: lesson.is_free_preview ?? false,
        });
    };

    const saveLesson = () => {
        if (!editingLesson) return;
        router.patch(`/tutor/lessons/${editingLesson.id}`, lessonPayload(editingLesson), {
            preserveScroll: true,
            onSuccess: () => setEditingLesson(null),
        });
    };

    const [editingModule, setEditingModule] = useState<{ id: string; title: string; description: string } | null>(null);

    const saveModule: FormEventHandler = (e) => {
        e.preventDefault();
        if (!editingModule) return;
        router.patch(
            `/tutor/modules/${editingModule.id}`,
            { title: editingModule.title, description: editingModule.description },
            { preserveScroll: true, onSuccess: () => setEditingModule(null) },
        );
    };

    const uploadCover = (file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        router.post(`/tutor/courses/${course.id}/image`, formData, { forceFormData: true, preserveScroll: true });
    };

    const uploadPresentation = (lessonId: string, file: File) => {
        const formData = new FormData();
        formData.append('presentation_file', file);
        router.post(`/tutor/lessons/${lessonId}/presentation`, formData, {
            forceFormData: true,
        });
    };

    // Publishing is per-module and per-lesson: students only ever see a lesson
    // that is published inside a module that is published, so both toggles have
    // to be reachable here or the course can be approved with nothing in it.
    const toggleModule = (module: Module) => {
        router.patch(
            `/tutor/modules/${module.id}`,
            { title: module.title, description: module.description ?? '', is_published: !module.is_published },
            { preserveScroll: true },
        );
    };

    const toggleLesson = (lesson: Lesson) => {
        router.patch(
            `/tutor/lessons/${lesson.id}`,
            { title: lesson.title, type: lesson.type, is_published: !lesson.is_published },
            { preserveScroll: true },
        );
    };

    // Assignments (course-level + optional curriculum placement)
    type AssignmentDraft = {
        title: string;
        description: string;
        deadline_at: string;
        max_marks: number;
        is_required: boolean;
        module_id: string;
        after_lesson_id: string;
    };
    const blankAssignment: AssignmentDraft = {
        title: '',
        description: '',
        deadline_at: '',
        max_marks: 100,
        is_required: false,
        module_id: '__none__',
        after_lesson_id: '__start__',
    };
    const [assignmentForm, setAssignmentForm] = useState(blankAssignment);
    const [editingAssignment, setEditingAssignment] = useState<(AssignmentDraft & { id: string }) | null>(null);
    const [scheduleForId, setScheduleForId] = useState<string | null>(null);
    const [scheduleAt, setScheduleAt] = useState('');

    const lessonsForModule = (moduleId: string) =>
        (course.modules ?? []).find((m) => m.id === moduleId)?.lessons ?? [];

    const moduleOptions = [
        { value: '__none__', label: 'Not in curriculum (course list only)' },
        ...(course.modules ?? []).map((m) => ({ value: m.id, label: m.title })),
    ];

    const afterLessonOptions = (moduleId: string) => [
        { value: '__start__', label: 'At start of module' },
        ...lessonsForModule(moduleId).map((l) => ({ value: l.id, label: `After: ${l.title}` })),
    ];

    const assignmentPayload = (draft: AssignmentDraft) => ({
        title: draft.title,
        description: draft.description,
        deadline_at: draft.deadline_at || null,
        max_marks: draft.max_marks,
        is_required: draft.is_required,
        module_id: !draft.module_id || draft.module_id === '__none__' ? null : draft.module_id,
        after_lesson_id: !draft.after_lesson_id || draft.after_lesson_id === '__start__' ? null : draft.after_lesson_id,
    });

    const assignmentReady = (assignment: Assignment) =>
        (assignment.questions?.length ?? 0) > 0 && Boolean(assignment.title) && assignment.max_marks >= 1;

    const saveAssignment: FormEventHandler = (e) => {
        e.preventDefault();
        if (editingAssignment) {
            router.patch(`/tutor/assignments/${editingAssignment.id}`, assignmentPayload(editingAssignment), {
                preserveScroll: true,
                onSuccess: () => setEditingAssignment(null),
            });
            return;
        }
        router.post(`/tutor/courses/${course.id}/assignments`, assignmentPayload(assignmentForm), {
            preserveScroll: true,
            onSuccess: () => setAssignmentForm(blankAssignment),
        });
    };

    const deleteAssignment = (id: string) => {
        if (confirm('Delete this assignment?')) {
            router.delete(`/tutor/assignments/${id}`, { preserveScroll: true });
        }
    };

    const publishAssignment = (id: string) => {
        router.post(`/tutor/assignments/${id}/publish`, {}, { preserveScroll: true });
    };

    const unpublishAssignment = (id: string) => {
        router.post(`/tutor/assignments/${id}/unpublish`, {}, { preserveScroll: true });
    };

    const scheduleAssignment = (id: string) => {
        if (!scheduleAt) return;
        router.post(
            `/tutor/assignments/${id}/schedule`,
            { publish_at: scheduleAt },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setScheduleForId(null);
                    setScheduleAt('');
                },
            },
        );
    };

    const placementLabel = (assignment: Assignment) => {
        if (!assignment.module_id) return 'Course list only';
        const mod = (course.modules ?? []).find((m) => m.id === assignment.module_id);
        const lessons = mod?.lessons ?? [];
        const before = lessons.filter((l) => (l.order_index ?? 0) < (assignment.order_index ?? 0)).at(-1);
        const after = lessons.find((l) => (l.order_index ?? 0) >= (assignment.order_index ?? 0));
        if (before && after) return `${mod?.title}: between “${before.title}” and “${after.title}”`;
        if (before) return `${mod?.title}: after “${before.title}”`;
        if (after) return `${mod?.title}: before “${after.title}”`;
        return mod?.title ?? 'In curriculum';
    };

    // Reordering. The grip handles have always been there but nothing was
    // wired to them, so the order a course was authored in was the order it
    // shipped in. Drag for mice, arrow keys on the focused handle for everyone
    // else — a drag-only control is unusable from a keyboard.
    const [dragging, setDragging] = useState<{ kind: 'module' | 'lesson'; id: string; scope?: string } | null>(null);
    const [expandedModules, setExpandedModules] = useState<string[]>(() =>
        (course.modules ?? []).map((m: Module) => m.id),
    );

    useEffect(() => {
        const ids = (course.modules ?? []).map((m: Module) => m.id);
        setExpandedModules((prev) => {
            const kept = prev.filter((id) => ids.includes(id));
            const added = ids.filter((id) => !prev.includes(id));
            // Keep collapsed state for existing modules; expand newly added ones.
            return [...kept, ...added];
        });
    }, [course.modules]);

    const isModuleExpanded = (id: string) => expandedModules.includes(id);

    const toggleModuleExpanded = (id: string) => {
        setExpandedModules((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
        );
    };

    const expandModule = (id: string) => {
        setExpandedModules((prev) => (prev.includes(id) ? prev : [...prev, id]));
    };

    const moduleIds = () => (course.modules ?? []).map((m: Module) => m.id);
    const lessonIds = (moduleId: string) =>
        ((course.modules ?? []).find((m: Module) => m.id === moduleId)?.lessons ?? []).map((l: Lesson) => l.id);

    const commitModules = (order: string[]) =>
        router.post(`/tutor/courses/${course.id}/modules/reorder`, { order }, { preserveScroll: true });

    const commitLessons = (moduleId: string, order: string[]) =>
        router.post(`/tutor/modules/${moduleId}/lessons/reorder`, { order }, { preserveScroll: true });

    /** Pull `id` out and insert it before `targetId` (or at end if target missing). */
    const resequenceBefore = (ids: string[], id: string, targetId: string) => {
        const next = ids.filter((candidate) => candidate !== id);
        const to = next.indexOf(targetId);
        next.splice(to < 0 ? next.length : to, 0, id);
        return next;
    };

    /** Pull `id` out of the list and drop it back in at `to`. */
    const resequence = (ids: string[], id: string, to: number) => {
        const next = ids.filter((candidate) => candidate !== id);
        next.splice(to, 0, id);
        return next;
    };

    const nudgeModule = (id: string, delta: number) => {
        const ids = moduleIds();
        const to = ids.indexOf(id) + delta;
        if (to < 0 || to >= ids.length) return;
        commitModules(resequence(ids, id, to));
    };

    const nudgeLesson = (moduleId: string, id: string, delta: number) => {
        const ids = lessonIds(moduleId);
        const to = ids.indexOf(id) + delta;
        if (to < 0 || to >= ids.length) return;
        commitLessons(moduleId, resequence(ids, id, to));
    };

    const dropOnModule = (targetId: string) => {
        if (dragging?.kind !== 'module' || dragging.id === targetId) {
            setDragging(null);
            return;
        }
        commitModules(resequenceBefore(moduleIds(), dragging.id, targetId));
        setDragging(null);
    };

    const dropOnLesson = (moduleId: string, targetId: string) => {
        // Lessons only reorder within their own module.
        if (dragging?.kind !== 'lesson' || dragging.scope !== moduleId || dragging.id === targetId) {
            setDragging(null);
            return;
        }
        commitLessons(moduleId, resequenceBefore(lessonIds(moduleId), dragging.id, targetId));
        setDragging(null);
    };

    const startModuleDrag = (e: React.DragEvent, id: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        setDragging({ kind: 'module', id });
    };

    const startLessonDrag = (e: React.DragEvent, moduleId: string, id: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        setDragging({ kind: 'lesson', id, scope: moduleId });
    };

    const allowModuleDrop = (e: React.DragEvent) => {
        if (dragging?.kind !== 'module') return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const allowLessonDrop = (e: React.DragEvent, moduleId: string) => {
        if (dragging?.kind !== 'lesson' || dragging.scope !== moduleId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const gripKeys = (move: (delta: number) => void) => (e: React.KeyboardEvent) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        move(e.key === 'ArrowUp' ? -1 : 1);
    };

    const setStatus = (status: string) => {
        router.patch(`/tutor/courses/${course.id}/status`, { status }, { preserveScroll: true });
    };

    const deleteModule = (id: string) => {
        if (confirm('Delete this module and all its lessons?')) {
            router.delete(`/tutor/modules/${id}`);
        }
    };

    const deleteLesson = (id: string) => {
        if (confirm('Delete this lesson?')) {
            router.delete(`/tutor/lessons/${id}`);
        }
    };

    return (
        <DashboardLayout>
            <Head title={`Edit ${course.title} — Tutor`} />

            <div className="max-w-4xl">
                <div className="flex items-center gap-3 mb-6">
                    <Link href="/tutor/courses" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">← My Courses</Link>
                    <span className="text-surface-400">/</span>
                    <h1 className="text-xl font-semibold text-surface-900 dark:text-white truncate">Edit Course: {course.title}</h1>
                </div>

                <div className="card p-5 mb-6">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_STYLE[course.status] ?? STATUS_STYLE.draft}`}>
                            {course.status.replace('_', ' ')}
                        </span>

                        <span className="text-sm text-surface-500">
                            {readiness.blocking === 0
                                ? 'Ready to publish.'
                                : `${readiness.blocking} thing${readiness.blocking === 1 ? '' : 's'} to sort out before this can go live.`}
                        </span>

                        <div className="ml-auto flex items-center gap-2">
                            {course.status === 'published' ? (
                                <button onClick={() => setStatus('draft')} className="btn-ghost text-sm">
                                    Unpublish
                                </button>
                            ) : canPublishDirectly ? (
                                <button
                                    onClick={() => setStatus('published')}
                                    disabled={readiness.blocking > 0}
                                    className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={readiness.blocking > 0 ? 'Resolve the checklist below first' : undefined}
                                >
                                    Publish course
                                </button>
                            ) : (
                                <button
                                    onClick={() => setStatus('pending_review')}
                                    disabled={readiness.blocking > 0 || course.status === 'pending_review'}
                                    className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {course.status === 'pending_review' ? 'Awaiting review' : 'Submit for review'}
                                </button>
                            )}
                        </div>
                    </div>

                    <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2">
                        {readiness.checks.map((check) => (
                            <li key={check.label} className="flex items-start gap-2 text-sm">
                                {check.passed ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                ) : (
                                    <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${check.manual ? 'text-surface-400' : 'text-amber-500'}`} />
                                )}
                                <span>
                                    <span className={check.passed ? 'text-surface-500' : 'text-surface-900 dark:text-white font-medium'}>
                                        {check.label}
                                    </span>
                                    {check.manual && <span className="text-xs text-surface-400"> (check yourself)</span>}
                                    <span className="block text-xs text-surface-400">{check.detail}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex border-b border-surface-200 dark:border-surface-800 mb-6 overflow-x-auto">
                    <button onClick={() => setActiveTab('details')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'details' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}>
                        Course Details
                    </button>
                    <button onClick={() => setActiveTab('curriculum')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'curriculum' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}>
                        Curriculum Builder
                    </button>
                    <button onClick={() => setActiveTab('assignments')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'assignments' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}>
                        Assignments
                    </button>
                </div>

                {activeTab === 'details' && (
                    <div className="card p-7">
                        <form onSubmit={submitDetails} className="space-y-6">
                            <div>
                                <InputLabel htmlFor="title" value="Title *" />
                                <TextInput id="title" className="mt-1 block w-full" value={data.title} onChange={(e) => setData('title', e.target.value)} required />
                                <InputError className="mt-2" message={errors.title} />
                            </div>

                            <div>
                                <InputLabel htmlFor="subtitle" value="Subtitle" />
                                <TextInput id="subtitle" className="mt-1 block w-full" value={data.subtitle} onChange={(e) => setData('subtitle', e.target.value)} />
                            </div>

                            <div>
                                <InputLabel htmlFor="description" value="Description" />
                                <textarea id="description" className="mt-1 block w-full border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 focus:border-primary-500 focus:ring-primary-500 rounded-md shadow-sm"
                                    value={data.description} onChange={(e) => setData('description', e.target.value)} rows={5} />
                            </div>

                            {canAssignInstructor && (
                                <div>
                                    <InputLabel htmlFor="instructor_id" value="Assigned instructor *" />
                                    <SystemSelect
                                        id="instructor_id"
                                        value={data.instructor_id}
                                        onValueChange={(instructor_id) => setData('instructor_id', instructor_id)}
                                        triggerClassName="mt-1 w-full"
                                        options={instructors.map((instructor) => ({
                                            value: instructor.id,
                                            label: `${instructor.full_name} (${instructor.email})`,
                                        }))}
                                    />
                                    <InputError className="mt-2" message={errors.instructor_id} />
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <InputLabel htmlFor="category" value="Category *" />
                                    <TextInput id="category" className="mt-1 block w-full" value={data.category} onChange={(e) => setData('category', e.target.value)} required />
                                </div>
                                <div>
                                    <InputLabel htmlFor="difficulty" value="Difficulty *" />
                                    <SystemSelect
                                        id="difficulty"
                                        value={data.difficulty}
                                        onValueChange={(difficulty) => setData('difficulty', difficulty as typeof data.difficulty)}
                                        triggerClassName="mt-1 w-full"
                                        options={DIFFICULTY_OPTIONS}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div>
                                    <InputLabel htmlFor="price" value="Price *" />
                                    <TextInput id="price" type="number" step="0.01" className="mt-1 block w-full" value={data.price} onChange={(e) => setData('price', parseFloat(e.target.value))} required />
                                </div>
                                <div>
                                    <InputLabel htmlFor="currency" value="Currency *" />
                                    <TextInput id="currency" className="mt-1 block w-full" value={data.currency} onChange={(e) => setData('currency', e.target.value)} required />
                                </div>
                                <div>
                                    <InputLabel htmlFor="language" value="Language *" />
                                    <TextInput id="language" className="mt-1 block w-full" value={data.language} onChange={(e) => setData('language', e.target.value)} required />
                                </div>
                            </div>

                            <div>
                                <InputLabel value="Cover image" />
                                <div className="mt-2 flex items-start gap-4 flex-wrap">
                                    {course.thumbnail_url ? (
                                        <img
                                            src={course.thumbnail_url}
                                            alt=""
                                            className="w-40 h-24 object-cover rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800"
                                        />
                                    ) : (
                                        <div className="w-40 h-24 rounded-lg border border-dashed border-surface-300 dark:border-surface-700 flex items-center justify-center text-xs text-surface-400">
                                            No cover yet
                                        </div>
                                    )}

                                    <div>
                                        <label className="btn-secondary text-sm cursor-pointer inline-flex">
                                            <Upload className="w-4 h-4" />
                                            {course.thumbnail_url ? 'Replace image' : 'Upload image'}
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) uploadCover(file);
                                                }}
                                            />
                                        </label>
                                        <p className="text-xs text-surface-500 mt-2">
                                            JPEG, PNG or WebP, up to 4 MB. Shown on the course card and detail page.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <PrimaryButton disabled={processing}>Save Changes</PrimaryButton>
                        </form>
                    </div>
                )}

                {activeTab === 'curriculum' && (
                    <div className="space-y-6">
                        {course.modules?.map((module: Module) => (
                            <div
                                key={module.id}
                                className={`card overflow-hidden transition-opacity ${dragging?.kind === 'module' && dragging.id === module.id ? 'opacity-50' : ''} ${dragging?.kind === 'module' && dragging.id !== module.id ? 'ring-1 ring-primary-300 dark:ring-primary-700' : ''}`}
                                onDragOver={allowModuleDrop}
                                onDrop={() => dropOnModule(module.id)}
                            >
                                <div className={`bg-surface-50 dark:bg-surface-900/50 p-4 flex items-center justify-between ${isModuleExpanded(module.id) ? 'border-b border-surface-200 dark:border-surface-800' : ''}`}>
                                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            draggable
                                            onDragStart={(e) => startModuleDrag(e, module.id)}
                                            onDragEnd={() => setDragging(null)}
                                            onKeyDown={gripKeys((delta) => nudgeModule(module.id, delta))}
                                            className="cursor-grab active:cursor-grabbing text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 p-0.5 shrink-0"
                                            title="Drag to reorder, or focus and use the arrow keys"
                                            aria-label={`Reorder module ${module.title}`}
                                        >
                                            <GripVertical className="w-5 h-5 pointer-events-none" />
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => toggleModuleExpanded(module.id)}
                                            className="btn-icon text-surface-500 hover:text-surface-800 dark:hover:text-surface-200 shrink-0"
                                            aria-expanded={isModuleExpanded(module.id)}
                                            title={isModuleExpanded(module.id) ? 'Collapse module' : 'Expand module'}
                                        >
                                            <ChevronDown
                                                className={`w-5 h-5 transition-transform duration-200 ${
                                                    isModuleExpanded(module.id) ? '' : '-rotate-90'
                                                }`}
                                            />
                                        </button>
                                        {editingModule?.id === module.id ? (
                                            <form onSubmit={saveModule} className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                                                <TextInput className="flex-1" value={editingModule.title} onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })} required autoFocus />
                                                <TextInput className="flex-1" value={editingModule.description} onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })} placeholder="Description (optional)" />
                                                <PrimaryButton>Save</PrimaryButton>
                                                <button type="button" onClick={() => setEditingModule(null)} className="text-sm text-surface-600 px-2">Cancel</button>
                                            </form>
                                        ) : (
                                        <button
                                            type="button"
                                            onClick={() => toggleModuleExpanded(module.id)}
                                            className="min-w-0 flex-1 text-left rounded-lg hover:bg-surface-100/80 dark:hover:bg-surface-800/60 px-1.5 py-1 -mx-1.5 -my-1 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold text-surface-900 dark:text-white">{module.title}</h3>
                                                {!module.is_published && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">Draft</span>
                                                )}
                                                <span className="text-[11px] font-medium text-surface-500 dark:text-surface-400">
                                                    {module.lessons?.length ?? 0} lesson{(module.lessons?.length ?? 0) === 1 ? '' : 's'}
                                                </span>
                                            </div>
                                            {module.description && <p className="text-xs text-surface-500 mt-0.5">{module.description}</p>}
                                        </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => setEditingModule({ id: module.id, title: module.title, description: module.description ?? '' })}
                                            className="btn-icon text-surface-500 hover:text-primary-600"
                                            title="Rename module"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => toggleModule(module)}
                                            className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${module.is_published ? 'text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
                                            title={module.is_published ? 'Hide this module from students' : 'Make this module visible to students'}
                                        >
                                            {module.is_published ? 'Unpublish' : 'Publish module'}
                                        </button>
                                        <button onClick={() => deleteModule(module.id)} className="btn-icon text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete module"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                {isModuleExpanded(module.id) && (
                                <div className="p-4 space-y-2">
                                    {module.lessons?.map((lesson: Lesson) => editingLesson?.id === lesson.id ? (
                                        <div key={lesson.id} className="p-4 border border-primary-300 dark:border-primary-700 rounded-lg bg-primary-50 dark:bg-primary-900/20 space-y-4">
                                            <h4 className="text-sm font-semibold text-primary-900 dark:text-primary-300">Edit lesson topic</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <InputLabel value="Topic title" />
                                                    <TextInput className="mt-1 block w-full" value={editingLesson.title} onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })} required autoFocus />
                                                </div>
                                                <div>
                                                    <InputLabel value="Primary type" />
                                                    <SystemSelect
                                                        value={editingLesson.type}
                                                        onValueChange={(type) =>
                                                            setEditingLesson({ ...editingLesson, type })
                                                        }
                                                        triggerClassName="mt-1 w-full"
                                                        options={LESSON_TYPE_OPTIONS}
                                                    />
                                                    <p className="text-xs text-surface-500 mt-1">
                                                        Quiz stays single-purpose. Other types use materials below.
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <InputLabel value="Duration (minutes)" />
                                                <TextInput type="number" min="0" className="mt-1 block w-full max-w-xs" value={editingLesson.duration_minutes} onChange={(e) => setEditingLesson({ ...editingLesson, duration_minutes: Number(e.target.value) })} />
                                                <p className="text-xs text-surface-500 mt-1">Topic-level estimate shown to students.</p>
                                            </div>

                                            {editingLesson.type === 'quiz' && lesson.quiz && (
                                                <QuizBuilderPanel quiz={lesson.quiz} />
                                            )}

                                            {editingLesson.type === 'quiz' && !lesson.quiz && (
                                                <p className="text-sm text-amber-600">Save this lesson as type Quiz, then reopen to configure questions.</p>
                                            )}

                                            {editingLesson.type !== 'quiz' && (
                                                <MaterialsEditor
                                                    lessonId={lesson.id}
                                                    materials={(lesson.materials as TutorMaterial[] | undefined) ?? []}
                                                />
                                            )}

                                            <div className="flex items-center justify-between pt-2">
                                                <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                                                    <input type="checkbox" checked={editingLesson.is_free_preview} onChange={(e) => setEditingLesson({ ...editingLesson, is_free_preview: e.target.checked })} className="rounded text-primary-600 focus:ring-primary-500" />
                                                    Free Preview
                                                </label>
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={() => setEditingLesson(null)} className="px-3 py-1.5 text-sm font-medium text-surface-600">Cancel</button>
                                                    <PrimaryButton type="button" onClick={saveLesson}>Save lesson</PrimaryButton>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            key={lesson.id}
                                            className={`flex items-center justify-between p-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 group transition-opacity ${dragging?.kind === 'lesson' && dragging.id === lesson.id ? 'opacity-50' : ''} ${dragging?.kind === 'lesson' && dragging.scope === module.id && dragging.id !== lesson.id ? 'ring-1 ring-primary-300 dark:ring-primary-700' : ''}`}
                                            onDragOver={(e) => allowLessonDrop(e, module.id)}
                                            onDrop={() => dropOnLesson(module.id, lesson.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span
                                                    role="button"
                                                    tabIndex={0}
                                                    draggable
                                                    onDragStart={(e) => startLessonDrag(e, module.id, lesson.id)}
                                                    onDragEnd={() => setDragging(null)}
                                                    onKeyDown={gripKeys((delta) => nudgeLesson(module.id, lesson.id, delta))}
                                                    className="cursor-grab active:cursor-grabbing text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 p-0.5 shrink-0"
                                                    title="Drag to reorder, or focus and use the arrow keys"
                                                    aria-label={`Reorder lesson ${lesson.title}`}
                                                >
                                                    <GripVertical className="w-4 h-4 pointer-events-none" />
                                                </span>
                                                {lesson.type === 'youtube' ? <Video className="w-4 h-4 text-blue-500" /> : lesson.type === 'html' ? <Globe className="w-4 h-4 text-violet-500" /> : lesson.type === 'quiz' ? <HelpCircle className="w-4 h-4 text-amber-500" /> : lesson.type === 'live' ? <Radio className="w-4 h-4 text-rose-500" /> : <FileText className="w-4 h-4 text-emerald-500" />}
                                                <span className="text-sm font-medium text-surface-900 dark:text-white">{lesson.title}</span>
                                                {(lesson.materials as TutorMaterial[] | undefined)?.length ? (
                                                    <span className="flex items-center gap-1">
                                                        {(lesson.materials as TutorMaterial[])
                                                            .map((m) => m.type)
                                                            .filter((t, i, arr) => arr.indexOf(t) === i)
                                                            .map((type) => (
                                                                <span key={type} className="inline-flex" title={type}>
                                                                    {type === 'youtube' ? <Video className="w-3.5 h-3.5 text-blue-500" /> : type === 'html' ? <Globe className="w-3.5 h-3.5 text-violet-500" /> : type === 'live' ? <Radio className="w-3.5 h-3.5 text-rose-500" /> : <FileText className="w-3.5 h-3.5 text-emerald-500" />}
                                                                </span>
                                                            ))}
                                                    </span>
                                                ) : null}
                                                {lesson.is_free_preview && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">Free</span>}
                                                {!lesson.is_published && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">Draft</span>}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {lesson.duration_seconds > 0 ? (
                                                    <span className="text-xs text-surface-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.round(lesson.duration_seconds / 60)}m</span>
                                                ) : (
                                                    <button onClick={() => openLesson(lesson)} className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline" title="A duration is needed before this course can be published">
                                                        <Clock className="w-3 h-3" /> Set duration
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => toggleLesson(lesson)}
                                                    className={`text-xs font-medium px-2 py-1 rounded transition-colors ${lesson.is_published ? 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700' : 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20'}`}
                                                    title={lesson.is_published ? 'Hide this lesson from students' : 'Make this lesson visible to students'}
                                                >
                                                    {lesson.is_published ? 'Unpublish' : 'Publish'}
                                                </button>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => openLesson(lesson)} className="btn-icon text-surface-500 hover:text-primary-600" title="Edit lesson"><Pencil className="w-4 h-4" /></button>
                                                        {lesson.type === 'html' && (
                                                            <label className="btn-icon text-violet-500 cursor-pointer" title="Upload presentation .zip">
                                                                <Upload className="w-4 h-4" />
                                                                <input
                                                                    type="file"
                                                                    accept=".zip"
                                                                    className="hidden"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            uploadPresentation(lesson.id, file);
                                                                        }
                                                                    }}
                                                                />
                                                            </label>
                                                        )}
                                                        <button onClick={() => deleteLesson(lesson.id)} className="btn-icon text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                            </div>
                                        </div>
                                    ))}

                                    {addingLessonTo === module.id ? (
                                        <form onSubmit={addLesson} className="p-4 border border-dashed border-primary-300 dark:border-primary-700 rounded-lg bg-primary-50 dark:bg-primary-900/20 mt-4 space-y-4">
                                            <h4 className="text-sm font-semibold text-primary-900 dark:text-primary-300">New Lesson</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <InputLabel value="Lesson Title" />
                                                    <TextInput className="mt-1 block w-full" value={lessonData.title} onChange={(e) => setLessonData({ ...lessonData, title: e.target.value })} required autoFocus />
                                                </div>
                                                <div>
                                                    <InputLabel value="Type" />
                                                    <SystemSelect
                                                        value={lessonData.type}
                                                        onValueChange={(type) =>
                                                            setLessonData({ ...lessonData, type })
                                                        }
                                                        triggerClassName="mt-1 w-full"
                                                        options={LESSON_TYPE_OPTIONS}
                                                    />
                                                </div>
                                            </div>
                                            {lessonData.type !== 'html' && lessonData.type !== 'quiz' && lessonData.type !== 'live' && (
                                            <div>
                                                <InputLabel value={lessonData.type === 'youtube' ? 'YouTube Video ID' : 'PDF URL'} />
                                                <TextInput className="mt-1 block w-full" value={lessonData.content_ref} onChange={(e) => setLessonData({ ...lessonData, content_ref: e.target.value })} placeholder={lessonData.type === 'youtube' ? 'Paste the YouTube link' : 'https://...'} />
                                            </div>
                                            )}
                                            {lessonData.type !== 'quiz' && lessonData.type !== 'live' && (
                                            <div>
                                                <InputLabel value="Duration (minutes)" />
                                                <TextInput type="number" min="0" className="mt-1 block w-full" value={lessonData.duration_minutes} onChange={(e) => setLessonData({ ...lessonData, duration_minutes: Number(e.target.value) })} />
                                                <p className="text-xs text-surface-500 mt-1">Required before the course can be published.</p>
                                            </div>
                                            )}
                                            {lessonData.type === 'html' && (
                                            <div className="mt-2 text-sm text-surface-500 dark:text-surface-400 bg-violet-50 dark:bg-violet-950/30 p-3 rounded-lg flex items-start gap-2">
                                                <Globe className="w-4 h-4 mt-0.5 shrink-0 text-violet-500" />
                                                <span>After adding this lesson, you can upload a <strong>.zip</strong> file containing your HTML presentation (with images, CSS, JS).</span>
                                            </div>
                                            )}
                                            {lessonData.type === 'quiz' && (
                                            <div className="text-sm text-surface-500 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg flex items-start gap-2">
                                                <HelpCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                                                <span>After adding, open the lesson to configure questions and publish the quiz.</span>
                                            </div>
                                            )}
                                            {lessonData.type === 'live' && (
                                            <div className="text-sm text-surface-500 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg flex items-start gap-2">
                                                <Radio className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
                                                <span>After adding, open the lesson to set the Zoom link and schedule.</span>
                                            </div>
                                            )}
                                            <div className="flex items-center justify-between pt-2">
                                                <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                                                    <input type="checkbox" checked={lessonData.is_free_preview} onChange={(e) => setLessonData({ ...lessonData, is_free_preview: e.target.checked })} className="rounded text-primary-600 focus:ring-primary-500" />
                                                    Free Preview
                                                </label>
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={() => setAddingLessonTo(null)} className="px-3 py-1.5 text-sm font-medium text-surface-600">Cancel</button>
                                                    <PrimaryButton>Add Lesson</PrimaryButton>
                                                </div>
                                            </div>
                                        </form>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                expandModule(module.id);
                                                setAddingLessonTo(module.id);
                                            }}
                                            className="w-full mt-2 py-2 flex items-center justify-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors border border-dashed border-primary-200 dark:border-primary-800"
                                        >
                                            <Plus className="w-4 h-4" /> Add Lesson
                                        </button>
                                    )}
                                </div>
                                )}
                            </div>
                        ))}

                        {showModuleForm ? (
                            <form onSubmit={addModule} className="card p-5 border-2 border-primary-500 space-y-4">
                                <h3 className="font-semibold text-surface-900 dark:text-white">New Module</h3>
                                <div>
                                    <InputLabel value="Module Title" />
                                    <TextInput className="mt-1 block w-full" value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} required autoFocus />
                                </div>
                                <div>
                                    <InputLabel value="Description (Optional)" />
                                    <TextInput className="mt-1 block w-full" value={moduleDesc} onChange={(e) => setModuleDesc(e.target.value)} />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setShowModuleForm(false)} className="text-sm font-medium text-surface-600">Cancel</button>
                                    <PrimaryButton>Save Module</PrimaryButton>
                                </div>
                            </form>
                        ) : (
                            <button onClick={() => setShowModuleForm(true)} className="w-full py-4 flex items-center justify-center gap-2 text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white border-2 border-dashed border-surface-300 dark:border-surface-700 hover:border-surface-400 rounded-xl transition-all font-medium">
                                <Plus className="w-5 h-5" /> Add Module
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'assignments' && (
                    <div className="space-y-4">
                        <p className="text-sm text-surface-500">
                            New assignments are saved as drafts. Add complete questions, then publish now or schedule a go-live time. Students only see published assignments.
                        </p>

                        {(course.assignments ?? []).map((assignment: Assignment) => (
                            <div key={assignment.id} className="card p-4">
                                {editingAssignment?.id === assignment.id ? (
                                    <form onSubmit={saveAssignment} className="space-y-3">
                                        <TextInput className="block w-full" value={editingAssignment.title} onChange={(e) => setEditingAssignment({ ...editingAssignment, title: e.target.value })} required />
                                        <textarea className="block w-full rounded-md border-surface-300 dark:border-surface-700 dark:bg-surface-900 text-sm" rows={3} value={editingAssignment.description} onChange={(e) => setEditingAssignment({ ...editingAssignment, description: e.target.value })} />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <InputLabel value="Deadline" />
                                                <TextInput type="datetime-local" className="mt-1 block w-full" value={editingAssignment.deadline_at} onChange={(e) => setEditingAssignment({ ...editingAssignment, deadline_at: e.target.value })} />
                                            </div>
                                            <div>
                                                <InputLabel value="Max marks" />
                                                <TextInput type="number" min={1} className="mt-1 block w-full" value={editingAssignment.max_marks} onChange={(e) => setEditingAssignment({ ...editingAssignment, max_marks: Number(e.target.value) })} />
                                            </div>
                                            <div>
                                                <InputLabel value="Curriculum module" />
                                                <SystemSelect
                                                    className="mt-1"
                                                    value={editingAssignment.module_id || '__none__'}
                                                    onValueChange={(value) => setEditingAssignment({ ...editingAssignment, module_id: value, after_lesson_id: '__start__' })}
                                                    options={moduleOptions}
                                                    triggerClassName="mt-1 w-full"
                                                />
                                            </div>
                                            {editingAssignment.module_id && editingAssignment.module_id !== '__none__' && (
                                                <div>
                                                    <InputLabel value="Place after lesson" />
                                                    <SystemSelect
                                                        className="mt-1"
                                                        value={editingAssignment.after_lesson_id || '__start__'}
                                                        onValueChange={(value) => setEditingAssignment({ ...editingAssignment, after_lesson_id: value })}
                                                        options={afterLessonOptions(editingAssignment.module_id)}
                                                        triggerClassName="mt-1 w-full"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input type="checkbox" checked={editingAssignment.is_required} onChange={(e) => setEditingAssignment({ ...editingAssignment, is_required: e.target.checked })} className="rounded text-primary-600" />
                                            Required (blocks next lesson until submitted)
                                        </label>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setEditingAssignment(null)} className="text-sm text-surface-600">Cancel</button>
                                            <PrimaryButton>Save</PrimaryButton>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <ClipboardCheck className="w-4 h-4 text-primary-500" />
                                                <h3 className="font-semibold text-surface-900 dark:text-white">{assignment.title}</h3>
                                                {assignment.is_published ? (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Published</span>
                                                ) : assignment.publish_at ? (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">Scheduled</span>
                                                ) : (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Draft</span>
                                                )}
                                                {assignment.is_required && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">Required</span>}
                                            </div>
                                            {assignment.description && <p className="text-sm text-surface-500 mt-1">{assignment.description}</p>}
                                            <p className="text-xs text-surface-400 mt-2">
                                                {assignment.max_marks} marks
                                                {assignment.deadline_at ? ` · due ${new Date(assignment.deadline_at).toLocaleString()}` : ' · no deadline'}
                                                {' · '}{placementLabel(assignment)}
                                                {(assignment.questions?.length ?? 0) > 0 ? ` · ${assignment.questions!.length} question${assignment.questions!.length === 1 ? '' : 's'}` : ' · no questions yet'}
                                                {assignment.publish_at && !assignment.is_published
                                                    ? ` · goes live ${new Date(assignment.publish_at).toLocaleString()}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                className="btn-icon"
                                                onClick={() => {
                                                    const lessons = lessonsForModule(assignment.module_id ?? '');
                                                    const after = lessons.filter((l) => (l.order_index ?? 0) < (assignment.order_index ?? 0)).at(-1);
                                                    setEditingAssignment({
                                                        id: assignment.id,
                                                        title: assignment.title,
                                                        description: assignment.description ?? '',
                                                        deadline_at: assignment.deadline_at ? assignment.deadline_at.slice(0, 16) : '',
                                                        max_marks: assignment.max_marks,
                                                        is_required: assignment.is_required ?? false,
                                                        module_id: assignment.module_id ?? '__none__',
                                                        after_lesson_id: after?.id ?? '__start__',
                                                    });
                                                }}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button type="button" className="btn-icon text-red-500" onClick={() => deleteAssignment(assignment.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        {assignment.is_published ? (
                                            <button
                                                type="button"
                                                className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800"
                                                onClick={() => unpublishAssignment(assignment.id)}
                                            >
                                                Unpublish
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    disabled={!assignmentReady(assignment)}
                                                    title={assignmentReady(assignment) ? 'Publish for enrolled students' : 'Add at least one question first'}
                                                    className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                                                        assignmentReady(assignment)
                                                            ? 'bg-primary-600 text-white hover:bg-primary-700'
                                                            : 'bg-surface-100 text-surface-400 cursor-not-allowed'
                                                    }`}
                                                    onClick={() => publishAssignment(assignment.id)}
                                                >
                                                    Publish now
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={!assignmentReady(assignment)}
                                                    className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                                                        assignmentReady(assignment)
                                                            ? 'text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                                                            : 'text-surface-400 cursor-not-allowed'
                                                    }`}
                                                    onClick={() => {
                                                        setScheduleForId(assignment.id);
                                                        setScheduleAt(assignment.publish_at ? assignment.publish_at.slice(0, 16) : '');
                                                    }}
                                                >
                                                    Schedule
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {scheduleForId === assignment.id && (
                                        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                            <div className="flex-1 min-w-[12rem]">
                                                <InputLabel value="Publish at" />
                                                <TextInput
                                                    type="datetime-local"
                                                    className="mt-1 block w-full"
                                                    value={scheduleAt}
                                                    onChange={(e) => setScheduleAt(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <button type="button" className="btn-primary text-sm h-10" onClick={() => scheduleAssignment(assignment.id)} disabled={!scheduleAt}>
                                                Save schedule
                                            </button>
                                            <button type="button" className="text-sm text-surface-600 h-10 px-2" onClick={() => setScheduleForId(null)}>
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                    </>
                                )}
                                <AssignmentQuestionBuilder assignment={assignment} />
                            </div>
                        ))}

                        <form onSubmit={saveAssignment} className="card p-5 space-y-4 border-2 border-dashed border-surface-300 dark:border-surface-700">
                            <h3 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> New assignment</h3>
                            <p className="text-xs text-surface-500">Creates a draft. Add questions after saving, then publish or schedule.</p>
                            <div>
                                <InputLabel value="Title" />
                                <TextInput className="mt-1 block w-full" value={assignmentForm.title} onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })} required />
                            </div>
                            <div>
                                <InputLabel value="Brief" />
                                <textarea className="mt-1 block w-full rounded-md border-surface-300 dark:border-surface-700 dark:bg-surface-900 text-sm" rows={3} value={assignmentForm.description} onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <InputLabel value="Deadline" />
                                    <TextInput type="datetime-local" className="mt-1 block w-full" value={assignmentForm.deadline_at} onChange={(e) => setAssignmentForm({ ...assignmentForm, deadline_at: e.target.value })} />
                                </div>
                                <div>
                                    <InputLabel value="Max marks" />
                                    <TextInput type="number" min={1} className="mt-1 block w-full" value={assignmentForm.max_marks} onChange={(e) => setAssignmentForm({ ...assignmentForm, max_marks: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <InputLabel value="Curriculum module" />
                                    <SystemSelect
                                        className="mt-1"
                                        value={assignmentForm.module_id || '__none__'}
                                        onValueChange={(value) => setAssignmentForm({ ...assignmentForm, module_id: value, after_lesson_id: '__start__' })}
                                        options={moduleOptions}
                                        triggerClassName="mt-1 w-full"
                                    />
                                </div>
                                {assignmentForm.module_id && assignmentForm.module_id !== '__none__' && (
                                    <div>
                                        <InputLabel value="Place after lesson" />
                                        <SystemSelect
                                            className="mt-1"
                                            value={assignmentForm.after_lesson_id || '__start__'}
                                            onValueChange={(value) => setAssignmentForm({ ...assignmentForm, after_lesson_id: value })}
                                            options={afterLessonOptions(assignmentForm.module_id)}
                                            triggerClassName="mt-1 w-full"
                                        />
                                    </div>
                                )}
                            </div>
                            <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-200">
                                <input
                                    type="checkbox"
                                    checked={assignmentForm.is_required}
                                    onChange={(e) => setAssignmentForm({ ...assignmentForm, is_required: e.target.checked })}
                                    className="rounded text-primary-600"
                                />
                                Required — students must submit before the next lesson
                            </label>
                            <PrimaryButton>Save as draft</PrimaryButton>
                        </form>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
