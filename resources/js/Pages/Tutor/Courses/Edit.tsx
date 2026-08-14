import { Head, useForm, Link, router } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import { PageProps, Course, Module, Lesson } from '@/types';
import { FormEventHandler, useState } from 'react';
import { Plus, GripVertical, Edit, Trash2, Video, FileText, CheckCircle, Clock, Globe, Upload } from 'lucide-react';

interface Props extends PageProps {
    course: Course;
}

export default function EditCourse({ course }: Props) {
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
    const [lessonData, setLessonData] = useState({ title: '', type: 'youtube', content_ref: '', duration_seconds: 0, is_free_preview: false });
    const [presentationFile, setPresentationFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const addLesson: FormEventHandler = (e) => {
        e.preventDefault();
        if (!addingLessonTo) return;
        router.post(`/tutor/modules/${addingLessonTo}/lessons`, lessonData, {
            onSuccess: () => {
                setLessonData({ title: '', type: 'youtube', content_ref: '', duration_seconds: 0, is_free_preview: false });
                setPresentationFile(null);
                setAddingLessonTo(null);
            }
        });
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
                            <div key={module.id} className="card overflow-hidden">
                                <div className="bg-surface-50 dark:bg-surface-900/50 p-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <GripVertical className="w-5 h-5 text-surface-400 cursor-move" />
                                        <div>
                                            <h3 className="font-semibold text-surface-900 dark:text-white">{module.title}</h3>
                                            {module.description && <p className="text-xs text-surface-500 mt-0.5">{module.description}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => deleteModule(module.id)} className="btn-icon text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete module"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <div className="p-4 space-y-2">
                                    {module.lessons?.map((lesson: Lesson) => (
                                        <div key={lesson.id} className="flex items-center justify-between p-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 group">
                                            <div className="flex items-center gap-3">
                                                <GripVertical className="w-4 h-4 text-surface-400 cursor-move" />
                                                {lesson.type === 'youtube' ? <Video className="w-4 h-4 text-blue-500" /> : lesson.type === 'html' ? <Globe className="w-4 h-4 text-violet-500" /> : <FileText className="w-4 h-4 text-emerald-500" />}
                                                <span className="text-sm font-medium text-surface-900 dark:text-white">{lesson.title}</span>
                                                {lesson.is_free_preview && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">Free</span>}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {lesson.duration_seconds > 0 && <span className="text-xs text-surface-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.round(lesson.duration_seconds / 60)}m</span>}
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
