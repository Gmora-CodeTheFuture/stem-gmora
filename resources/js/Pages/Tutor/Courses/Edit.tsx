import { Head, useForm, Link, router } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import { PageProps, Course, Module, Lesson } from '@/types';
import { FormEventHandler, useState } from 'react';
import { Plus, GripVertical, Trash2, Video, FileText, CheckCircle, AlertCircle, Clock, Globe, Upload, Pencil } from 'lucide-react';

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
}

const STATUS_STYLE: Record<string, string> = {
    draft: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300',
    pending_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    archived: 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400',
};

export default function EditCourse({ course, readiness, canPublishDirectly }: Props) {
    const [activeTab, setActiveTab] = useState<'details' | 'curriculum'>('details');

    const { data, setData, patch, errors, processing } = useForm({
        title: course.title,
        subtitle: course.subtitle || '',
        description: course.description || '',
        category: course.category,
        difficulty: course.difficulty,
        language: course.language,
        price: course.price,
        currency: course.currency,
        thumbnail_url: course.thumbnail_url || '',
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
    const [presentationFile, setPresentationFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

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
                setPresentationFile(null);
                setAddingLessonTo(null);
            }
        });
    };

    // Editing an existing lesson — without this a mistake at creation time (a
    // missing duration, a wrong video id) can only be fixed by deleting it.
    const [editingLesson, setEditingLesson] = useState<(typeof blankLesson & { id: string }) | null>(null);

    const openLesson = (lesson: Lesson) =>
        setEditingLesson({
            id: lesson.id,
            title: lesson.title,
            type: lesson.type,
            // Blank means "leave the stored video alone" — the server treats it so.
            content_ref: lesson.content_ref ?? '',
            duration_minutes: Math.round((lesson.duration_seconds ?? 0) / 60),
            is_free_preview: lesson.is_free_preview ?? false,
        });

    const saveLesson: FormEventHandler = (e) => {
        e.preventDefault();
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

    const uploadPresentation = (lessonId: string, file?: File) => {
        const uploadFile = file || presentationFile;
        if (!uploadFile) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('presentation_file', uploadFile);
        router.post(`/tutor/lessons/${lessonId}/presentation`, formData, {
            forceFormData: true,
            onFinish: () => {
                setUploading(false);
                setPresentationFile(null);
            },
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

    // Reordering. The grip handles have always been there but nothing was
    // wired to them, so the order a course was authored in was the order it
    // shipped in. Drag for mice, arrow keys on the focused handle for everyone
    // else — a drag-only control is unusable from a keyboard.
    const [dragging, setDragging] = useState<{ kind: 'module' | 'lesson'; id: string; scope?: string } | null>(null);

    const moduleIds = () => (course.modules ?? []).map((m: Module) => m.id);
    const lessonIds = (moduleId: string) =>
        ((course.modules ?? []).find((m: Module) => m.id === moduleId)?.lessons ?? []).map((l: Lesson) => l.id);

    const commitModules = (order: string[]) =>
        router.post(`/tutor/courses/${course.id}/modules/reorder`, { order }, { preserveScroll: true });

    const commitLessons = (moduleId: string, order: string[]) =>
        router.post(`/tutor/modules/${moduleId}/lessons/reorder`, { order }, { preserveScroll: true });

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
        if (dragging?.kind !== 'module' || dragging.id === targetId) return;
        const ids = moduleIds();
        commitModules(resequence(ids, dragging.id, ids.indexOf(targetId)));
        setDragging(null);
    };

    const dropOnLesson = (moduleId: string, targetId: string) => {
        // Lessons only reorder within their own module.
        if (dragging?.kind !== 'lesson' || dragging.scope !== moduleId || dragging.id === targetId) return;
        const ids = lessonIds(moduleId);
        commitLessons(moduleId, resequence(ids, dragging.id, ids.indexOf(targetId)));
        setDragging(null);
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

                <div className="flex border-b border-surface-200 dark:border-surface-800 mb-6">
                    <button onClick={() => setActiveTab('details')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}>
                        Course Details
                    </button>
                    <button onClick={() => setActiveTab('curriculum')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'curriculum' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}>
                        Curriculum Builder
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

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <InputLabel htmlFor="category" value="Category *" />
                                    <TextInput id="category" className="mt-1 block w-full" value={data.category} onChange={(e) => setData('category', e.target.value)} required />
                                </div>
                                <div>
                                    <InputLabel htmlFor="difficulty" value="Difficulty *" />
                                    <select id="difficulty" value={data.difficulty} onChange={(e) => setData('difficulty', e.target.value as any)}
                                        className="mt-1 block w-full border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 focus:border-primary-500 focus:ring-primary-500 rounded-md shadow-sm">
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
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
                                <InputLabel htmlFor="thumbnail_url" value="Thumbnail URL" />
                                <TextInput id="thumbnail_url" className="mt-1 block w-full" value={data.thumbnail_url} onChange={(e) => setData('thumbnail_url', e.target.value)} />
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
                                className={`card overflow-hidden transition-opacity ${dragging?.kind === 'module' && dragging.id === module.id ? 'opacity-50' : ''}`}
                                onDragOver={(e) => dragging?.kind === 'module' && e.preventDefault()}
                                onDrop={() => dropOnModule(module.id)}
                            >
                                <div className="bg-surface-50 dark:bg-surface-900/50 p-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <button
                                            type="button"
                                            draggable
                                            onDragStart={() => setDragging({ kind: 'module', id: module.id })}
                                            onDragEnd={() => setDragging(null)}
                                            onKeyDown={gripKeys((delta) => nudgeModule(module.id, delta))}
                                            className="cursor-move text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            title="Drag to reorder, or focus and use the arrow keys"
                                            aria-label={`Reorder module ${module.title}`}
                                        >
                                            <GripVertical className="w-5 h-5" />
                                        </button>
                                        {editingModule?.id === module.id ? (
                                            <form onSubmit={saveModule} className="flex items-center gap-2 flex-1">
                                                <TextInput className="flex-1" value={editingModule.title} onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })} required autoFocus />
                                                <TextInput className="flex-1" value={editingModule.description} onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })} placeholder="Description (optional)" />
                                                <PrimaryButton>Save</PrimaryButton>
                                                <button type="button" onClick={() => setEditingModule(null)} className="text-sm text-surface-600 px-2">Cancel</button>
                                            </form>
                                        ) : (
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-surface-900 dark:text-white">{module.title}</h3>
                                                {!module.is_published && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">Draft</span>
                                                )}
                                            </div>
                                            {module.description && <p className="text-xs text-surface-500 mt-0.5">{module.description}</p>}
                                        </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
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
                                <div className="p-4 space-y-2">
                                    {module.lessons?.map((lesson: Lesson) => editingLesson?.id === lesson.id ? (
                                        <form key={lesson.id} onSubmit={saveLesson} className="p-4 border border-primary-300 dark:border-primary-700 rounded-lg bg-primary-50 dark:bg-primary-900/20 space-y-4">
                                            <h4 className="text-sm font-semibold text-primary-900 dark:text-primary-300">Edit lesson</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <InputLabel value="Lesson Title" />
                                                    <TextInput className="mt-1 block w-full" value={editingLesson.title} onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })} required autoFocus />
                                                </div>
                                                <div>
                                                    <InputLabel value="Type" />
                                                    <select value={editingLesson.type} onChange={(e) => setEditingLesson({ ...editingLesson, type: e.target.value })} className="mt-1 block w-full border-surface-300 dark:border-surface-700 dark:bg-surface-900 rounded-md">
                                                        <option value="youtube">YouTube Video</option>
                                                        <option value="pdf">PDF Document</option>
                                                        <option value="html">HTML Presentation</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                {editingLesson.type !== 'html' && (
                                                    <div>
                                                        <InputLabel value={editingLesson.type === 'youtube' ? 'YouTube Video ID' : 'PDF URL'} />
                                                        <TextInput className="mt-1 block w-full" value={editingLesson.content_ref} onChange={(e) => setEditingLesson({ ...editingLesson, content_ref: e.target.value })} placeholder="Leave blank to keep the current one" />
                                                    </div>
                                                )}
                                                <div>
                                                    <InputLabel value="Duration (minutes)" />
                                                    <TextInput type="number" min="0" className="mt-1 block w-full" value={editingLesson.duration_minutes} onChange={(e) => setEditingLesson({ ...editingLesson, duration_minutes: Number(e.target.value) })} />
                                                    <p className="text-xs text-surface-500 mt-1">Required before the course can be published.</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2">
                                                <label className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                                                    <input type="checkbox" checked={editingLesson.is_free_preview} onChange={(e) => setEditingLesson({ ...editingLesson, is_free_preview: e.target.checked })} className="rounded text-primary-600 focus:ring-primary-500" />
                                                    Free Preview
                                                </label>
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={() => setEditingLesson(null)} className="px-3 py-1.5 text-sm font-medium text-surface-600">Cancel</button>
                                                    <PrimaryButton>Save lesson</PrimaryButton>
                                                </div>
                                            </div>
                                        </form>
                                    ) : (
                                        <div
                                            key={lesson.id}
                                            className={`flex items-center justify-between p-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 group transition-opacity ${dragging?.kind === 'lesson' && dragging.id === lesson.id ? 'opacity-50' : ''}`}
                                            onDragOver={(e) => dragging?.kind === 'lesson' && dragging.scope === module.id && e.preventDefault()}
                                            onDrop={() => dropOnLesson(module.id, lesson.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    draggable
                                                    onDragStart={() => setDragging({ kind: 'lesson', id: lesson.id, scope: module.id })}
                                                    onDragEnd={() => setDragging(null)}
                                                    onKeyDown={gripKeys((delta) => nudgeLesson(module.id, lesson.id, delta))}
                                                    className="cursor-move text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    title="Drag to reorder, or focus and use the arrow keys"
                                                    aria-label={`Reorder lesson ${lesson.title}`}
                                                >
                                                    <GripVertical className="w-4 h-4" />
                                                </button>
                                                {lesson.type === 'youtube' ? <Video className="w-4 h-4 text-blue-500" /> : lesson.type === 'html' ? <Globe className="w-4 h-4 text-violet-500" /> : <FileText className="w-4 h-4 text-emerald-500" />}
                                                <span className="text-sm font-medium text-surface-900 dark:text-white">{lesson.title}</span>
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
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <InputLabel value="Lesson Title" />
                                                    <TextInput className="mt-1 block w-full" value={lessonData.title} onChange={(e) => setLessonData({ ...lessonData, title: e.target.value })} required autoFocus />
                                                </div>
                                                <div>
                                                    <InputLabel value="Type" />
                                                    <select value={lessonData.type} onChange={(e) => setLessonData({ ...lessonData, type: e.target.value })} className="mt-1 block w-full border-surface-300 dark:border-surface-700 dark:bg-surface-900 rounded-md">
                                                        <option value="youtube">YouTube Video</option>
                                                        <option value="pdf">PDF Document</option>
                                                        <option value="html">HTML Presentation</option>
                                                    </select>
                                                </div>
                                            </div>
                                            {lessonData.type !== 'html' && (
                                            <div>
                                                <InputLabel value={lessonData.type === 'youtube' ? 'YouTube Video ID' : 'PDF URL'} />
                                                <TextInput className="mt-1 block w-full" value={lessonData.content_ref} onChange={(e) => setLessonData({ ...lessonData, content_ref: e.target.value })} placeholder={lessonData.type === 'youtube' ? 'e.g. dQw4w9WgXcQ' : 'https://...'} />
                                            </div>
                                            )}
                                            <div>
                                                <InputLabel value="Duration (minutes)" />
                                                <TextInput type="number" min="0" className="mt-1 block w-full" value={lessonData.duration_minutes} onChange={(e) => setLessonData({ ...lessonData, duration_minutes: Number(e.target.value) })} />
                                                <p className="text-xs text-surface-500 mt-1">Required before the course can be published.</p>
                                            </div>
                                            {lessonData.type === 'html' && (
                                            <div className="mt-2 text-sm text-surface-500 dark:text-surface-400 bg-violet-50 dark:bg-violet-950/30 p-3 rounded-lg flex items-start gap-2">
                                                <Globe className="w-4 h-4 mt-0.5 shrink-0 text-violet-500" />
                                                <span>After adding this lesson, you can upload a <strong>.zip</strong> file containing your HTML presentation (with images, CSS, JS).</span>
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
                                        <button onClick={() => setAddingLessonTo(module.id)} className="w-full mt-2 py-2 flex items-center justify-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors border border-dashed border-primary-200 dark:border-primary-800">
                                            <Plus className="w-4 h-4" /> Add Lesson
                                        </button>
                                    )}
                                </div>
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
            </div>
        </DashboardLayout>
    );
}
