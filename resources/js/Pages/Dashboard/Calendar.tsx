import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useMemo, useState } from 'react';
import {
    CalendarDays, ChevronLeft, ChevronRight, Clock, ExternalLink,
    MapPin, Plus, Trash2, X,
} from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

type EventType = 'class' | 'workshop' | 'deadline' | 'announcement';

interface CalendarItem {
    id: string;
    source: 'event' | 'live_session' | 'assignment';
    type: EventType;
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    url: string | null;
    course: { id: string; title: string; slug: string } | null;
    editable: boolean;
}

interface Props extends PageProps {
    month: string;
    monthLabel: string;
    rangeStart: string;
    rangeEnd: string;
    items: CalendarItem[];
    canManage: boolean;
    manageableCourses: Array<{ id: string; title: string }>;
}

const TYPE_STYLES: Record<EventType, string> = {
    class: 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300',
    workshop: 'bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-300',
    deadline: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    announcement: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300',
};

const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

function addMonths(month: string, delta: number): string {
    const [year, m] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, m - 1 + delta, 1));

    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function Calendar({
    month, monthLabel, rangeStart, rangeEnd, items, canManage, manageableCourses,
}: Props) {
    const [selected, setSelected] = useState<string>(new Date().toISOString().slice(0, 10));
    const [composerOpen, setComposerOpen] = useState(false);

    // Build the visible grid from the server-provided range.
    const days = useMemo(() => {
        const out: string[] = [];
        const cursor = new Date(rangeStart + 'T00:00:00Z');
        const end = new Date(rangeEnd + 'T00:00:00Z');

        while (cursor <= end) {
            out.push(cursor.toISOString().slice(0, 10));
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }

        return out;
    }, [rangeStart, rangeEnd]);

    const byDay = useMemo(() => {
        const map: Record<string, CalendarItem[]> = {};

        for (const item of items) {
            (map[dayKey(item.starts_at)] ??= []).push(item);
        }

        return map;
    }, [items]);

    const selectedItems = byDay[selected] ?? [];
    const currentMonth = Number(month.split('-')[1]);

    return (
        <DashboardLayout header="Calendar">
            <Head title="Calendar — Gmora STEM" />

            <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => router.get(route('dashboard.calendar'), { month: addMonths(month, -1) })}
                        className="btn-icon"
                        aria-label="Previous month"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => router.get(route('dashboard.calendar'), { month: addMonths(month, 1) })}
                        className="btn-icon"
                        aria-label="Next month"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <h2 className="text-lg font-semibold text-surface-900 dark:text-white">{monthLabel}</h2>

                <button
                    onClick={() => router.get(route('dashboard.calendar'))}
                    className="text-sm text-surface-500 hover:text-primary-600 transition-colors"
                >
                    Today
                </button>

                {canManage && (
                    <button onClick={() => setComposerOpen(true)} className="btn-primary ml-auto">
                        <Plus className="w-4 h-4" />
                        Add event
                    </button>
                )}
            </div>

            <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
                {/* ── Month grid ─────────────────────────────── */}
                <div className="card p-4">
                    <div className="grid grid-cols-7 mb-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
                            <div key={label} className="text-center text-xs font-medium text-surface-400 py-2">
                                {label}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day) => {
                            const dayItems = byDay[day] ?? [];
                            const inMonth = Number(day.split('-')[1]) === currentMonth;
                            const isToday = day === new Date().toISOString().slice(0, 10);

                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelected(day)}
                                    className={`min-h-[86px] p-2 rounded-xl text-left transition-colors border ${
                                        selected === day
                                            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/40'
                                            : 'border-transparent hover:bg-surface-50 dark:hover:bg-surface-800'
                                    } ${inMonth ? '' : 'opacity-40'}`}
                                >
                                    <span
                                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                                            isToday
                                                ? 'bg-primary-600 text-white'
                                                : 'text-surface-600 dark:text-surface-300'
                                        }`}
                                    >
                                        {Number(day.slice(-2))}
                                    </span>

                                    <span className="block space-y-1 mt-1">
                                        {dayItems.slice(0, 2).map((item) => (
                                            <span
                                                key={`${item.source}-${item.id}`}
                                                className={`block px-1.5 py-0.5 rounded-md text-[11px] leading-tight truncate ${TYPE_STYLES[item.type]}`}
                                            >
                                                {item.title}
                                            </span>
                                        ))}
                                        {dayItems.length > 2 && (
                                            <span className="block text-[11px] text-surface-400 px-1.5">
                                                +{dayItems.length - 2} more
                                            </span>
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Day detail ─────────────────────────────── */}
                <aside className="card p-6">
                    <h3 className="text-base font-semibold text-surface-900 dark:text-white">
                        {new Date(selected + 'T00:00:00').toLocaleDateString(undefined, {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                        })}
                    </h3>

                    {selectedItems.length === 0 ? (
                        <div className="text-center py-10">
                            <CalendarDays className="w-7 h-7 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                            <p className="text-sm text-surface-500">Nothing scheduled on this day.</p>
                        </div>
                    ) : (
                        <ul className="mt-5 space-y-4">
                            {selectedItems.map((item) => (
                                <li
                                    key={`${item.source}-${item.id}`}
                                    className="pb-4 border-b border-surface-100 dark:border-surface-800 last:border-0 last:pb-0"
                                >
                                    <div className="flex items-start gap-2">
                                        <span className={`badge ${TYPE_STYLES[item.type]} capitalize`}>{item.type}</span>

                                        {item.editable && canManage && (
                                            <button
                                                onClick={() => router.delete(route('events.destroy', item.id), {
                                                    preserveScroll: true,
                                                })}
                                                className="ml-auto text-surface-400 hover:text-red-500 transition-colors"
                                                aria-label={`Delete ${item.title}`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <h4 className="text-sm font-medium text-surface-900 dark:text-white mt-2">
                                        {item.title}
                                    </h4>

                                    {item.course && (
                                        <Link
                                            href={route('courses.show', item.course.slug)}
                                            className="block text-xs text-primary-600 dark:text-primary-400 mt-0.5 hover:underline"
                                        >
                                            {item.course.title}
                                        </Link>
                                    )}

                                    <p className="inline-flex items-center gap-1.5 text-xs text-surface-500 mt-2">
                                        <Clock className="w-3.5 h-3.5" />
                                        {new Date(item.starts_at).toLocaleTimeString(undefined, {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                        {item.ends_at &&
                                            ` – ${new Date(item.ends_at).toLocaleTimeString(undefined, {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}`}
                                    </p>

                                    {item.location && (
                                        <p className="inline-flex items-center gap-1.5 text-xs text-surface-500 mt-1 ml-3">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {item.location}
                                        </p>
                                    )}

                                    {item.description && (
                                        <p className="text-xs text-surface-500 mt-2 leading-relaxed">
                                            {item.description}
                                        </p>
                                    )}

                                    {item.url && (
                                        <a
                                            href={item.url}
                                            target={item.url.startsWith('http') ? '_blank' : undefined}
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 mt-3 hover:underline"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            Open
                                        </a>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>
            </div>

            {composerOpen && (
                <EventComposer
                    courses={manageableCourses}
                    defaultDate={selected}
                    onClose={() => setComposerOpen(false)}
                />
            )}
        </DashboardLayout>
    );
}

function EventComposer({
    courses,
    defaultDate,
    onClose,
}: {
    courses: Array<{ id: string; title: string }>;
    defaultDate: string;
    onClose: () => void;
}) {
    const form = useForm({
        course_id: courses[0]?.id ?? '',
        title: '',
        description: '',
        type: 'class' as EventType,
        starts_at: `${defaultDate}T18:00`,
        ends_at: '',
        location: '',
        join_url: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('events.store'), { preserveScroll: true, onSuccess: onClose });
    };

    return (
        <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[8vh] px-4 overflow-y-auto"
            onClick={onClose}
        >
            <form
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg card p-6 mb-10"
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Add to calendar</h2>
                    <button type="button" onClick={onClose} className="btn-icon" aria-label="Close">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium mb-1.5">
                            Title
                        </label>
                        <input
                            id="title"
                            value={form.data.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                            required
                            className="input"
                        />
                        {form.errors.title && <p className="text-xs text-red-500 mt-1">{form.errors.title}</p>}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="type" className="block text-sm font-medium mb-1.5">
                                Type
                            </label>
                            <select
                                id="type"
                                value={form.data.type}
                                onChange={(e) => form.setData('type', e.target.value as EventType)}
                                className="input"
                            >
                                <option value="class">Class</option>
                                <option value="workshop">Workshop</option>
                                <option value="deadline">Deadline</option>
                                <option value="announcement">Announcement</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="course" className="block text-sm font-medium mb-1.5">
                                Course
                            </label>
                            <select
                                id="course"
                                value={form.data.course_id}
                                onChange={(e) => form.setData('course_id', e.target.value)}
                                className="input"
                            >
                                {courses.map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.title}
                                    </option>
                                ))}
                                <option value="">Everyone (platform-wide)</option>
                            </select>
                            {form.errors.course_id && (
                                <p className="text-xs text-red-500 mt-1">{form.errors.course_id}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="starts_at" className="block text-sm font-medium mb-1.5">
                                Starts
                            </label>
                            <input
                                id="starts_at"
                                type="datetime-local"
                                value={form.data.starts_at}
                                onChange={(e) => form.setData('starts_at', e.target.value)}
                                required
                                className="input"
                            />
                            {form.errors.starts_at && (
                                <p className="text-xs text-red-500 mt-1">{form.errors.starts_at}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="ends_at" className="block text-sm font-medium mb-1.5">
                                Ends <span className="text-surface-400">(optional)</span>
                            </label>
                            <input
                                id="ends_at"
                                type="datetime-local"
                                value={form.data.ends_at}
                                onChange={(e) => form.setData('ends_at', e.target.value)}
                                className="input"
                            />
                            {form.errors.ends_at && (
                                <p className="text-xs text-red-500 mt-1">{form.errors.ends_at}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium mb-1.5">
                                Location
                            </label>
                            <input
                                id="location"
                                value={form.data.location}
                                onChange={(e) => form.setData('location', e.target.value)}
                                placeholder="Online, Lab 2…"
                                className="input"
                            />
                        </div>

                        <div>
                            <label htmlFor="join_url" className="block text-sm font-medium mb-1.5">
                                Join link
                            </label>
                            <input
                                id="join_url"
                                type="url"
                                value={form.data.join_url}
                                onChange={(e) => form.setData('join_url', e.target.value)}
                                placeholder="https://zoom.us/j/…"
                                className="input"
                            />
                            {form.errors.join_url && (
                                <p className="text-xs text-red-500 mt-1">{form.errors.join_url}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium mb-1.5">
                            Details <span className="text-surface-400">(optional)</span>
                        </label>
                        <textarea
                            id="description"
                            rows={3}
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            className="input"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                    <button type="submit" disabled={form.processing} className="btn-primary">
                        {form.processing ? 'Publishing…' : 'Publish to calendar'}
                    </button>
                    <button type="button" onClick={onClose} className="btn-ghost">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
