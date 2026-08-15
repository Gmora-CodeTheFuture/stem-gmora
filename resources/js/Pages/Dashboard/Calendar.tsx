import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useMemo, useState, useRef, useEffect } from 'react';
import {
    CalendarDays, Check, Clock, ExternalLink,
    MapPin, Pencil, Plus, Trash2, X, XCircle, Info
} from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

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
    registration_open?: boolean;
    capacity?: number | null;
    registration?: {
        open: boolean;
        registered: boolean;
        going: number;
        capacity: number | null;
        spots_left: number | null;
        full: boolean;
    };
}

interface Props extends PageProps {
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

export default function Calendar({
    rangeStart, rangeEnd, items, canManage, manageableCourses,
}: Props) {
    const [composerOpen, setComposerOpen] = useState(false);
    const [editing, setEditing] = useState<CalendarItem | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null);
    
    // We keep track of the initial date so that FullCalendar doesn't reset to today on every prop update
    const initialDate = useRef(new Date().toISOString().slice(0, 10));

    // Below this the month grid stops being legible and becomes a list.
    const [isNarrow, setIsNarrow] = useState(false);

    useEffect(() => {
        const query = window.matchMedia('(max-width: 767px)');
        const sync = () => setIsNarrow(query.matches);

        sync();
        query.addEventListener('change', sync);

        return () => query.removeEventListener('change', sync);
    }, []);
    
    // Set selected event to null if items change and it's no longer there
    useEffect(() => {
        if (selectedEvent) {
            const stillExists = items.find(i => i.id === selectedEvent.id && i.source === selectedEvent.source);
            if (!stillExists) setSelectedEvent(null);
            else setSelectedEvent(stillExists);
        }
    }, [items]);

    const events = useMemo(() => {
        return items.map(item => {
            return {
                id: `${item.source}-${item.id}`,
                title: item.title,
                start: item.starts_at,
                end: item.ends_at ?? undefined,
                allDay: item.type === 'deadline' || !item.ends_at,
                extendedProps: item,
                classNames: [TYPE_STYLES[item.type], 'border-0', 'rounded-md', 'px-1', 'py-0.5', 'text-xs', 'overflow-hidden'],
            };
        });
    }, [items]);

    const handleDatesSet = (arg: any) => {
        const start = arg.startStr.split('T')[0];
        const end = arg.endStr.split('T')[0];
        
        // Prevent infinite loops if ranges haven't really changed
        if (start === rangeStart && end === rangeEnd) return;

        router.get(
            route('dashboard.calendar'),
            { start, end },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    return (
        <DashboardLayout header="Calendar">
            <Head title="Calendar — Gmora STEM" />

            {/* The layout already renders the page title; every other page
                follows it with a line of context and its primary action. */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
                <p className="text-sm text-surface-500">
                    Classes, workshops and deadlines from the courses you're enrolled in.
                </p>

                {canManage && (
                    <button
                        onClick={() => setComposerOpen(true)}
                        className="btn-primary w-full sm:w-auto justify-center sm:ml-auto whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        Add event
                    </button>
                )}
            </div>

            <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
                {/* ── FullCalendar ─────────────────────────────── */}
                <div className="card p-2 sm:p-4">
                    {/* A month grid needs ~700px to be readable, so a phone gets
                        the agenda list instead of a grid it has to scroll. */}
                    <div className="fc-gmora">
                        <FullCalendar
                            key={isNarrow ? 'list' : 'grid'}
                            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                            initialView={isNarrow ? 'listMonth' : 'dayGridMonth'}
                            initialDate={initialDate.current}
                            headerToolbar={isNarrow
                                ? { left: 'prev,next', center: 'title', right: 'today' }
                                : {
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: 'dayGridMonth,timeGridWeek,timeGridDay',
                                }}
                            noEventsText="Nothing scheduled this month."

                            events={events}
                            datesSet={handleDatesSet}
                            eventClick={(info) => {
                                setSelectedEvent(info.event.extendedProps as CalendarItem);
                            }}
                            height="auto"
                            dayMaxEvents={true}
                            eventContent={(arg) => {
                                const item = arg.event.extendedProps as CalendarItem;
                                return (
                                    <div className="flex flex-col w-full overflow-hidden text-[11px] leading-tight">
                                        <div className="font-semibold truncate">{arg.event.title}</div>
                                        {!arg.event.allDay && (
                                            <div className="truncate opacity-80">
                                                {arg.timeText}
                                            </div>
                                        )}
                                    </div>
                                );
                            }}
                        />
                    </div>
                </div>

                {/* ── Event detail ─────────────────────────────── */}
                <aside className={`card p-6 lg:sticky lg:top-[88px] ${selectedEvent ? '' : 'hidden lg:block'}`}>
                    <h3 className="text-base font-semibold text-surface-900 dark:text-white flex items-center justify-between mb-5">
                        Event Details
                        {selectedEvent && (
                            <button onClick={() => setSelectedEvent(null)} className="text-surface-400 hover:text-surface-600 transition-colors">
                                <XCircle className="w-5 h-5" />
                            </button>
                        )}
                    </h3>

                    {!selectedEvent ? (
                        <div className="text-center py-10">
                            <CalendarDays className="w-7 h-7 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                            <p className="text-sm text-surface-500">Select an event on the calendar to see details.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="pb-4 border-b border-surface-100 dark:border-surface-800">
                                <div className="flex items-start gap-2">
                                    <span className={`badge ${TYPE_STYLES[selectedEvent.type]} capitalize`}>{selectedEvent.type}</span>

                                    {selectedEvent.editable && canManage && (
                                        <span className="ml-auto flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditing(selectedEvent);
                                                    setSelectedEvent(null);
                                                }}
                                                className="text-surface-400 hover:text-primary-600 transition-colors"
                                                aria-label={`Edit ${selectedEvent.title}`}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    router.delete(route('events.destroy', selectedEvent.id), {
                                                        preserveScroll: true,
                                                    });
                                                    setSelectedEvent(null);
                                                }}
                                                className="text-surface-400 hover:text-red-500 transition-colors"
                                                aria-label={`Delete ${selectedEvent.title}`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </span>
                                    )}
                                </div>

                                <h4 className="text-lg font-bold text-surface-900 dark:text-white mt-3 leading-tight">
                                    {selectedEvent.title}
                                </h4>

                                {selectedEvent.course && (
                                    <Link
                                        href={route('courses.show', selectedEvent.course.slug)}
                                        className="inline-flex text-sm font-medium text-primary-600 dark:text-primary-400 mt-1.5 hover:underline"
                                    >
                                        {selectedEvent.course.title}
                                    </Link>
                                )}
                            </div>

                            <div className="space-y-3 pt-2">
                                <p className="flex items-start gap-3 text-sm text-surface-700 dark:text-surface-300">
                                    <Clock className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                                    <span>
                                        <span className="block font-medium">
                                            {new Date(selectedEvent.starts_at).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="text-surface-500">
                                            {new Date(selectedEvent.starts_at).toLocaleTimeString(undefined, {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                            {selectedEvent.ends_at &&
                                                ` – ${new Date(selectedEvent.ends_at).toLocaleTimeString(undefined, {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}`}
                                        </span>
                                    </span>
                                </p>

                                {selectedEvent.location && (
                                    <p className="flex items-start gap-3 text-sm text-surface-700 dark:text-surface-300">
                                        <MapPin className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                                        <span>{selectedEvent.location}</span>
                                    </p>
                                )}

                                {selectedEvent.description && (
                                    <div className="flex items-start gap-3 text-sm text-surface-700 dark:text-surface-300">
                                        <Info className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                                        <p className="leading-relaxed whitespace-pre-wrap">{selectedEvent.description}</p>
                                    </div>
                                )}
                            </div>

                            {selectedEvent.registration && (selectedEvent.registration.open || selectedEvent.registration.registered) && (
                                <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 mt-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        {selectedEvent.registration.registered ? (
                                            <>
                                                <span className="badge-accent py-1.5 px-3">
                                                    <Check className="w-3.5 h-3.5 mr-1" />
                                                    You're going
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        router.delete(route('events.unregister', selectedEvent.id), {
                                                            preserveScroll: true,
                                                        })
                                                    }
                                                    className="text-sm font-medium text-surface-500 hover:text-red-500 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() =>
                                                    router.post(route('events.register', selectedEvent.id), {}, {
                                                        preserveScroll: true,
                                                    })
                                                }
                                                className="btn-primary w-full justify-center"
                                            >
                                                Register
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-surface-500 mt-3 flex items-center justify-between">
                                        <span>{selectedEvent.registration.going} going</span>
                                        {selectedEvent.registration.capacity && (
                                            <span>{selectedEvent.registration.spots_left} spots left (of {selectedEvent.registration.capacity})</span>
                                        )}
                                    </p>
                                </div>
                            )}

                            {selectedEvent.url && (
                                <a
                                    href={selectedEvent.url}
                                    target={selectedEvent.url.startsWith('http') ? '_blank' : undefined}
                                    rel="noreferrer"
                                    className="btn-primary w-full justify-center mt-2"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Open Link
                                </a>
                            )}
                        </div>
                    )}
                </aside>
            </div>

            {(composerOpen || editing) && (
                <EventComposer
                    courses={manageableCourses}
                    defaultDate={initialDate.current}
                    event={editing}
                    onClose={() => {
                        setComposerOpen(false);
                        setEditing(null);
                    }}
                />
            )}
        </DashboardLayout>
    );
}

/** `datetime-local` wants `YYYY-MM-DDTHH:MM` — an ISO string with the rest cut. */
const forInput = (iso: string | null) => (iso ? iso.slice(0, 16) : '');

function EventComposer({
    courses,
    defaultDate,
    event,
    onClose,
}: {
    courses: Array<{ id: string; title: string }>;
    defaultDate: string;
    event?: CalendarItem | null;
    onClose: () => void;
}) {
    const editing = Boolean(event);

    const form = useForm({
        course_id: event ? (event.course?.id ?? '') : (courses[0]?.id ?? ''),
        title: event?.title ?? '',
        description: event?.description ?? '',
        type: (event?.type ?? 'class') as EventType,
        starts_at: event ? forInput(event.starts_at) : `${defaultDate}T18:00`,
        ends_at: event ? forInput(event.ends_at) : '',
        location: event?.location ?? '',
        join_url: event?.url ?? '',
        capacity: event?.capacity != null ? String(event.capacity) : '',
        registration_open: (event?.registration_open ?? false) as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = { preserveScroll: true, onSuccess: onClose };

        if (event) {
            form.patch(route('events.update', event.id), options);

            return;
        }

        form.post(route('events.store'), options);
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
                    <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                        {editing ? 'Edit event' : 'Add to calendar'}
                    </h2>
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

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="capacity" className="block text-sm font-medium mb-1.5">
                                Capacity <span className="text-surface-400">(blank = unlimited)</span>
                            </label>
                            <input
                                id="capacity"
                                type="number"
                                min="1"
                                value={form.data.capacity}
                                onChange={(e) => form.setData('capacity', e.target.value)}
                                className="input"
                            />
                            {form.errors.capacity && (
                                <p className="text-xs text-red-500 mt-1">{form.errors.capacity}</p>
                            )}
                        </div>

                        <label className="flex items-center gap-2.5 sm:mt-7">
                            <input
                                type="checkbox"
                                checked={form.data.registration_open}
                                onChange={(e) => form.setData('registration_open', e.target.checked)}
                                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-surface-700 dark:text-surface-200">
                                Let students register
                            </span>
                        </label>
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
                        {form.processing
                            ? (editing ? 'Saving…' : 'Publishing…')
                            : (editing ? 'Save changes' : 'Publish to calendar')}
                    </button>
                    <button type="button" onClick={onClose} className="btn-ghost">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
