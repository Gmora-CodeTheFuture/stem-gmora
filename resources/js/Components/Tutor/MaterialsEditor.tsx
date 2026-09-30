import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import { router } from '@inertiajs/react';
import { FileText, Globe, GripVertical, Plus, Radio, Trash2, Upload, Video } from 'lucide-react';
import { useEffect, useState } from 'react';

export type MaterialType = 'youtube' | 'pdf' | 'html' | 'live';

export interface TutorMaterial {
    id: string;
    type: MaterialType;
    title: string | null;
    order_index: number;
    content_ref?: string | null;
    has_video?: boolean;
    has_pdf?: boolean;
    has_presentation?: boolean;
    original_filename?: string | null;
    is_ready?: boolean;
    legacy?: boolean;
    scheduled_start?: string | null;
    duration_minutes?: number | null;
    zoom_join_url?: string | null;
    zoom_meeting_id?: string | null;
    zoom_passcode?: string | null;
    recording_url?: string | null;
}

const MATERIAL_TYPE_OPTIONS: Array<{ value: MaterialType; label: string }> = [
    { value: 'youtube', label: 'YouTube video' },
    { value: 'pdf', label: 'PDF document' },
    { value: 'html', label: 'HTML presentation' },
    { value: 'live', label: 'Live class link' },
];

function materialIcon(type: MaterialType) {
    if (type === 'youtube') return <Video className="w-4 h-4 text-blue-500" />;
    if (type === 'html') return <Globe className="w-4 h-4 text-violet-500" />;
    if (type === 'live') return <Radio className="w-4 h-4 text-rose-500" />;
    return <FileText className="w-4 h-4 text-emerald-500" />;
}

function toLocalInput(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
    lessonId: string;
    materials: TutorMaterial[];
};

export default function MaterialsEditor({ lessonId, materials }: Props) {
    const [addType, setAddType] = useState<MaterialType>('youtube');
    const [draggingId, setDraggingId] = useState<string | null>(null);

    const addMaterial = () => {
        router.post(`/tutor/lessons/${lessonId}/materials`, { type: addType }, { preserveScroll: true });
    };

    const removeMaterial = (material: TutorMaterial) => {
        if (material.legacy) {
            alert('Save this lesson once after upgrading, or run materials backfill, before deleting the legacy slot.');
            return;
        }
        if (!confirm('Remove this material?')) return;
        router.delete(`/tutor/materials/${material.id}`, { preserveScroll: true });
    };

    const reorder = (draggedId: string, targetId: string) => {
        if (draggedId === targetId) return;
        if (materials.some((m) => m.legacy)) {
            alert('Convert legacy content first by editing and saving materials, or run lessons:backfill-materials.');
            return;
        }
        const ids = materials.map((m) => m.id).filter((id) => id !== draggedId);
        const to = ids.indexOf(targetId);
        ids.splice(to < 0 ? ids.length : to, 0, draggedId);
        router.post(`/tutor/lessons/${lessonId}/materials/reorder`, { order: ids }, { preserveScroll: true });
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h5 className="text-sm font-semibold text-surface-900 dark:text-white">Materials</h5>
                    <p className="text-xs text-surface-500 mt-0.5">
                        Students see each material under this topic. Only added formats appear — nothing empty.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={addType}
                        onChange={(e) => setAddType(e.target.value as MaterialType)}
                        className="text-sm rounded-lg border-surface-200 dark:border-surface-700 dark:bg-surface-900"
                    >
                        {MATERIAL_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <button type="button" onClick={addMaterial} className="btn-secondary text-sm inline-flex items-center gap-1.5">
                        <Plus className="w-4 h-4" />
                        Add
                    </button>
                </div>
            </div>

            {materials.length === 0 ? (
                <p className="text-sm text-surface-500 py-3">No materials yet. Add a video, PDF, presentation, or live link.</p>
            ) : (
                <ul className="space-y-2">
                    {materials.map((material) => (
                        <li
                            key={material.id}
                            className={`rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-3 ${draggingId === material.id ? 'opacity-50' : ''}`}
                            onDragOver={(e) => {
                                e.preventDefault();
                            }}
                            onDrop={() => {
                                if (draggingId) reorder(draggingId, material.id);
                                setDraggingId(null);
                            }}
                        >
                            <div className="flex items-start gap-2">
                                <span
                                    role="button"
                                    tabIndex={0}
                                    draggable={!material.legacy}
                                    onDragStart={() => setDraggingId(material.id)}
                                    onDragEnd={() => setDraggingId(null)}
                                    className="cursor-grab active:cursor-grabbing text-surface-400 mt-1 p-0.5"
                                    title="Drag to reorder"
                                >
                                    <GripVertical className="w-4 h-4 pointer-events-none" />
                                </span>
                                <div className="flex-1 min-w-0 space-y-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {materialIcon(material.type)}
                                        <span className="text-sm font-medium text-surface-900 dark:text-white capitalize">
                                            {material.title || MATERIAL_TYPE_OPTIONS.find((o) => o.value === material.type)?.label}
                                        </span>
                                        {material.legacy && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Legacy</span>
                                        )}
                                        {material.is_ready === false && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Incomplete</span>
                                        )}
                                    </div>
                                    {!material.legacy && (
                                        <MaterialFields material={material} />
                                    )}
                                    {material.legacy && (
                                        <p className="text-xs text-surface-500">
                                            This content still lives on the lesson. Add a new material of the same type and migrate, or run <code className="text-[11px]">php artisan lessons:backfill-materials</code>.
                                        </p>
                                    )}
                                </div>
                                {!material.legacy && (
                                    <button
                                        type="button"
                                        onClick={() => removeMaterial(material)}
                                        className="btn-icon text-red-500 shrink-0"
                                        title="Remove material"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function MaterialFields({ material }: { material: TutorMaterial }) {
    const [title, setTitle] = useState(material.title ?? '');
    const [contentRef, setContentRef] = useState(material.content_ref ?? '');
    const [scheduledStart, setScheduledStart] = useState(toLocalInput(material.scheduled_start));
    const [durationMinutes, setDurationMinutes] = useState(material.duration_minutes ?? 60);
    const [zoomJoinUrl, setZoomJoinUrl] = useState(material.zoom_join_url ?? '');
    const [zoomMeetingId, setZoomMeetingId] = useState(material.zoom_meeting_id ?? '');
    const [zoomPasscode, setZoomPasscode] = useState(material.zoom_passcode ?? '');
    const [recordingUrl, setRecordingUrl] = useState(material.recording_url ?? '');
    const [hasPdf, setHasPdf] = useState(Boolean(material.has_pdf));
    const [hasPresentation, setHasPresentation] = useState(Boolean(material.has_presentation));
    const [presentationName, setPresentationName] = useState(material.original_filename ?? null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        setHasPdf(Boolean(material.has_pdf));
        setHasPresentation(Boolean(material.has_presentation));
        setPresentationName(material.original_filename ?? null);
    }, [material.has_pdf, material.has_presentation, material.original_filename]);

    const save = () => {
        const payload: Record<string, unknown> = { title: title || null };
        if (material.type === 'youtube') {
            payload.content_ref = contentRef;
        }
        if (material.type === 'live') {
            payload.scheduled_start = scheduledStart || null;
            payload.duration_minutes = durationMinutes;
            payload.zoom_join_url = zoomJoinUrl || null;
            payload.zoom_meeting_id = zoomMeetingId || null;
            payload.zoom_passcode = zoomPasscode || null;
            payload.recording_url = recordingUrl || null;
        }
        router.patch(`/tutor/materials/${material.id}`, payload as never, { preserveScroll: true });
    };

    const uploadPdf = (file: File) => {
        const data = new FormData();
        data.append('pdf_file', file);
        setUploading(true);
        router.post(`/tutor/materials/${material.id}/pdf`, data, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setHasPdf(true),
            onFinish: () => setUploading(false),
        });
    };

    const uploadPresentation = (file: File) => {
        const data = new FormData();
        data.append('presentation_file', file);
        setUploading(true);
        router.post(`/tutor/materials/${material.id}/presentation`, data, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setHasPresentation(true);
                setPresentationName(file.name);
            },
            onFinish: () => setUploading(false),
        });
    };

    // Must not be a <form>: this editor is rendered inside the lesson edit form.
    return (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            <div>
                <InputLabel value="Label (optional)" />
                <TextInput className="mt-1 block w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Walkthrough video" />
            </div>

            {material.type === 'youtube' && (
                <div>
                    <InputLabel value="YouTube link or video ID" />
                    <TextInput className="mt-1 block w-full" value={contentRef} onChange={(e) => setContentRef(e.target.value)} placeholder="Paste the YouTube link" />
                </div>
            )}

            {material.type === 'pdf' && (
                <div>
                    <p className="text-xs text-surface-500 mb-2">
                        {uploading
                            ? 'Uploading document…'
                            : hasPdf
                              ? 'A document is attached. Uploading replaces it.'
                              : 'No document attached yet.'}
                    </p>
                    <label className={`btn-secondary text-sm cursor-pointer inline-flex items-center gap-1.5 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                        <Upload className="w-4 h-4" />
                        {hasPdf ? 'Replace PDF' : 'Upload PDF'}
                        <input
                            type="file"
                            accept="application/pdf,.pdf"
                            className="sr-only"
                            disabled={uploading}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                                e.stopPropagation();
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (!file) return;
                                uploadPdf(file);
                            }}
                        />
                    </label>
                </div>
            )}

            {material.type === 'html' && (
                <div>
                    <p className="text-xs text-surface-500 mb-2">
                        {uploading
                            ? 'Uploading presentation…'
                            : hasPresentation
                              ? `Attached: ${presentationName ?? 'presentation.zip'}`
                              : 'Upload a .zip containing index.html and its assets.'}
                    </p>
                    <label className={`btn-secondary text-sm cursor-pointer inline-flex items-center gap-1.5 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                        <Upload className="w-4 h-4" />
                        {hasPresentation ? 'Replace .zip' : 'Upload .zip'}
                        <input
                            type="file"
                            accept=".zip,application/zip"
                            className="sr-only"
                            disabled={uploading}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                                e.stopPropagation();
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (!file) return;
                                uploadPresentation(file);
                            }}
                        />
                    </label>
                </div>
            )}

            {material.type === 'live' && (
                <div className="grid sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                        <InputLabel value="Zoom join URL" />
                        <TextInput className="mt-1 block w-full" value={zoomJoinUrl} onChange={(e) => setZoomJoinUrl(e.target.value)} />
                    </div>
                    <div>
                        <InputLabel value="Scheduled start" />
                        <TextInput type="datetime-local" className="mt-1 block w-full" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} />
                    </div>
                    <div>
                        <InputLabel value="Duration (minutes)" />
                        <TextInput type="number" min={1} className="mt-1 block w-full" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
                    </div>
                    <div>
                        <InputLabel value="Meeting ID" />
                        <TextInput className="mt-1 block w-full" value={zoomMeetingId} onChange={(e) => setZoomMeetingId(e.target.value)} />
                    </div>
                    <div>
                        <InputLabel value="Passcode" />
                        <TextInput className="mt-1 block w-full" value={zoomPasscode} onChange={(e) => setZoomPasscode(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                        <InputLabel value="Recording URL (optional)" />
                        <TextInput className="mt-1 block w-full" value={recordingUrl} onChange={(e) => setRecordingUrl(e.target.value)} />
                    </div>
                </div>
            )}

            {(material.type === 'youtube' || material.type === 'live' || material.type === 'pdf' || material.type === 'html') && (
                <div className="flex justify-end">
                    <PrimaryButton type="button" onClick={save}>Save material</PrimaryButton>
                </div>
            )}
        </div>
    );
}
