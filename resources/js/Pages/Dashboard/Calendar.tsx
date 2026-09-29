import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
    CalendarDays, Check, ChevronLeft, ChevronRight, Clock, ExternalLink,
    MapPin, Pencil, Plus, Trash2, X, XCircle, Info
} from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import SystemSelect from '@/Components/SystemSelect';
import { PageProps } from '@/types';

import FullCalendar from '@fullcalendar/react';
import type { DateSelectArg, DatesSetArg, EventClickArg, EventContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

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

const TYPE_META: Record<EventType, { label: string; chip: string; accent: string; color: string; border: string }> = {
    class: {
        label: 'Class',
        chip: 'bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-200',
        accent: 'border-l-primary-500',
        color: '#dbeafe',
        border: '#3b82f6',
    },
    workshop: {
        label: 'Workshop',
        chip: 'bg-accent-100 text-accent-800 dark:bg-accent-950 dark:text-accent-200',
        accent: 'border-l-accent-500',
        color: '#d1fae5',
        border: '#10b981',
    },
    deadline: {
        label: 'Deadline',
        chip: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200',
        accent: 'border-l-amber-500',
        color: '#fef3c7',
        border: '#f59e0b',
    },
    announcement: {
        label: 'Announcement',
        chip: 'bg-surface-200 text-surface-700 dark:bg-surface-800 dark:text-surface-200',
        accent: 'border-l-surface-400',
        color: '#e5e7eb',
        border: '#9ca3af',
    },
};

const TYPE_STYLES: Record<EventType, string> = {
    class: TYPE_META.class.chip,
    workshop: TYPE_META.workshop.chip,
    deadline: TYPE_META.deadline.chip,
    announcement: TYPE_META.announcement.chip,
};

/** Format a Date for `<input type="datetime-local">`. All-day uses noon local. */
function toLocalInput(date: Date, allDay = false): string {
    const d = new Date(date);
    if (allDay) {
        d.setHours(12, 0, 0, 0);
    }
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Calendar({
    rangeStart, rangeEnd, items, canManage, manageableCourses,
}: Props) {
    const { url: pageUrl } = usePage();
    const [composerOpen, setComposerOpen] = useState(false);
    const [editing, setEditing] = useState<CalendarItem | null>(null);
    const [composerDefaults, setComposerDefaults] = useState<{ starts_at?: string; ends_at?: string }>({});
    const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null);
    const [viewTitle, setViewTitle] = useState('');
    const deepLinkApplied = useRef(false);

    const calendarRef = useRef<FullCalendar | null>(null);
    const initialDate = useRef(new Date().toISOString().slice(0, 10));

    // Deep-link from notifications: /dashboard/calendar?open={eventId}
    useEffect(() => {
        if (deepLinkApplied.current || items.length === 0) {
            return;
        }

        const query = pageUrl.includes('?') ? pageUrl.slice(pageUrl.indexOf('?')) : '';
        const openId = new URLSearchParams(query).get('open');
        if (!openId) {
            return;
        }

        const match = items.find((i) => i.source === 'event' && i.id === openId);
        if (match) {
            setSelectedEvent(match);
            deepLinkApplied.current = true;
        }
    }, [items, pageUrl]);

    useEffect(() => {
        if (!selectedEvent) {
            return;
        }
        const stillExists = items.find((i) => i.id === selectedEvent.id && i.source === selectedEvent.source);
        if (!stillExists) {
            setSelectedEvent(null);
        } else {
            setSelectedEvent(stillExists);
        }
    }, [items]);

    const events = useMemo(() => {
        return items.map((item) => {
            const meta = TYPE_META[item.type];
            return {
                id: `${item.source}-${item.id}`,
                title: item.title,
                start: item.starts_at,
                end: item.ends_at ?? undefined,
                allDay: item.type === 'deadline' || !item.ends_at,
                extendedProps: item,
                backgroundColor: meta.color,
                borderColor: meta.border,
                textColor: '#111827',
                classNames: [
                    'gmora-cal-event',
                    meta.chip,
                    meta.accent,
                    'border-0',
                    'border-l-4',
                    'rounded-lg',
                    'overflow-hidden',
                ],
            };
        });
    }, [items]);

    const upcoming = useMemo(() => {
        const now = Date.now();
        return [...items]
            .filter((item) => new Date(item.starts_at).getTime() >= now - 60 * 60 * 1000)
            .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
            .slice(0, 5);
    }, [items]);

    const api = () => calendarRef.current?.getApi();

    const handleDatesSet = useCallback((arg: DatesSetArg) => {
        setViewTitle(arg.view.title);

        const start = arg.startStr.split('T')[0];
        const end = arg.endStr.split('T')[0];
        if (start === rangeStart && end === rangeEnd) {
            return;
        }

        router.get(
            route('dashboard.calendar'),
            { start, end },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }, [rangeStart, rangeEnd]);

    const openCreate = (startsAt?: string, endsAt?: string) => {
        if (!canManage) {
            return;
        }
        setEditing(null);
        setComposerDefaults({
            starts_at: startsAt,
            ends_at: endsAt,
        });
        setSelectedEvent(null);
        setComposerOpen(true);
    };

    const handleSelect = (info: DateSelectArg) => {
        if (!canManage) {
            info.view.calendar.unselect();
            return;
        }

        const start = toLocalInput(info.start, info.allDay);
        let end: string | undefined;
        if (info.end) {
            // FullCalendar's end is exclusive for all-day ranges.
            const endDate = new Date(info.end);
            if (info.allDay) {
                endDate.setDate(endDate.getDate() - 1);
                end = toLocalInput(endDate, true);
            } else {
                end = toLocalInput(info.end, false);
            }
        }

        openCreate(start, end);
        info.view.calendar.unselect();
    };

    const renderEventContent = (arg: EventContentArg) => {
        const item = arg.event.extendedProps as CalendarItem;
        const meta = TYPE_META[item.type];

        return (
            <div className={`gmora-cal-chip w-full overflow-hidden rounded-md px-1.5 py-1 leading-snug ${meta.chip} ${meta.accent} border-l-[3px]`}>
                {!arg.event.allDay && arg.timeText && (
                    <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80 truncate">
                        {arg.timeText}
                    </div>
                )}
                <div className="text-[12px] font-semibold truncate">{arg.event.title}</div>
            </div>
        );
    };

    return (
        <DashboardLayout header="Calendar" noScroll={true}>
            <Head title="Calendar — Gmora STEM" />

            <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3 shrink-0">
                    <p className="text-sm text-surface-500">
                        Classes, workshops and deadlines from the courses you're enrolled in.
                    </p>

                {canManage && (
                    <button
                        onClick={() => openCreate()}
                        className="btn-primary w-full sm:w-auto justify-center sm:ml-auto whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        Add event
                    </button>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3 shrink-0" aria-label="Event type legend">
                {(Object.keys(TYPE_META) as EventType[]).map((type) => (
                    <span
                        key={type}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${TYPE_META[type].chip}`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TYPE_META[type].border }} />
                        {TYPE_META[type].label}
                    </span>
                ))}
                {canManage && (
                    <span className="text-xs text-surface-400 ml-auto hidden sm:inline">
                        Click a day or drag a time range to add an event
                    </span>
                )}
            </div>

                <div className="grid lg:grid-cols-[1fr_340px] gap-5 flex-1 min-h-0 overflow-hidden">
                    <div className="card p-3 sm:p-4 flex flex-col min-h-0 h-full overflow-hidden">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-3 shrink-0 min-w-0">
                            <button
                                type="button"
                                className="btn-icon"
                                aria-label="Previous month"
                                onClick={() => api()?.prev()}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                className="btn-icon"
                                aria-label="Next month"
                                onClick={() => api()?.next()}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            <h2 className="text-sm sm:text-lg font-semibold text-surface-900 dark:text-white ml-1 truncate min-w-0">
                                {viewTitle || '\u00a0'}
                            </h2>
                        </div>

                        <div className="fc-gmora flex-1 min-h-0">
                            <FullCalendar
                                ref={calendarRef}
                                plugins={[dayGridPlugin, interactionPlugin]}
                                initialView="dayGridMonth"
                                initialDate={initialDate.current}
                                headerToolbar={false}
                                events={events}
                                datesSet={handleDatesSet}
                                eventClick={(info: EventClickArg) => {
                                    setSelectedEvent(info.event.extendedProps as CalendarItem);
                                }}
                                selectable={canManage}
                                selectMirror={canManage}
                                select={handleSelect}
                                selectMinDistance={4}
                                longPressDelay={200}
                                height="100%"
                                expandRows={true}
                                dayMaxEvents={3}
                                eventDisplay="block"
                                eventContent={renderEventContent}
                            />
                        </div>
                    </div>

                    <aside className={`card p-5 lg:p-6 flex flex-col min-h-0 h-full overflow-hidden ${selectedEvent ? '' : 'hidden lg:flex'}`}>
                        <h3 className="text-base font-semibold text-surface-900 dark:text-white flex items-center justify-between mb-5 shrink-0">
                            {selectedEvent ? 'Event details' : 'Upcoming'}
                            {selectedEvent && (
                                <button
                                    onClick={() => setSelectedEvent(null)}
                                    className="text-surface-400 hover:text-surface-600 transition-colors"
                                    aria-label="Close event details"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            )}
                        </h3>

                        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                    {!selectedEvent ? (
                        upcoming.length === 0 ? (
                            <div className="text-center py-10">
                                <CalendarDays className="w-7 h-7 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                                <p className="text-sm text-surface-500">
                                    Nothing coming up. Select an event on the calendar to see details.
                                </p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {upcoming.map((item) => (
                                    <li key={`${item.source}-${item.id}`}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedEvent(item)}
                                            className={`w-full text-left rounded-xl border border-surface-100 dark:border-surface-800 p-3 hover:bg-surface-50 dark:hover:bg-surface-800/60 transition-colors border-l-4 ${TYPE_META[item.type].accent}`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`badge text-[10px] ${TYPE_STYLES[item.type]} capitalize`}>
                                                    {item.type}
                                                </span>
                                                <span className="text-xs text-surface-400 ml-auto">
                                                    {new Date(item.starts_at).toLocaleDateString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </span>
                                            </div>
                                            <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">
                                                {item.title}
                                            </p>
                                            <p className="text-xs text-surface-500 mt-0.5">
                                                {new Date(item.starts_at).toLocaleTimeString(undefined, {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                                {item.course ? ` · ${item.course.title}` : ''}
                                            </p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )
                    ) : (
                        <div className="space-y-4">
                            <div className="pb-4 border-b border-surface-100 dark:border-surface-800">
                                <div className="flex items-start gap-2">
                                    <span className={`badge ${TYPE_STYLES[selectedEvent.type]} capitalize`}>
                                        {selectedEvent.type}
                                    </span>

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

                            <div className="space-y-3 pt-1">
                                <p className="flex items-start gap-3 text-sm text-surface-700 dark:text-surface-300">
                                    <Clock className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                                    <span>
                                        <span className="block font-medium">
                                            {new Date(selectedEvent.starts_at).toLocaleDateString(undefined, {
                                                weekday: 'long',
                                                month: 'short',
                                                day: 'numeric',
                                            })}
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
                                <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 mt-2">
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
                                            <span>
                                                {selectedEvent.registration.spots_left} spots left (of{' '}
                                                {selectedEvent.registration.capacity})
                                            </span>
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
                                    Open link
                                </a>
                            )}
                        </div>
                    )}
                        </div>
                    </aside>
                </div>
            </div>

            {(composerOpen || editing) && (
                <EventComposer
                    courses={manageableCourses}
                    defaultDate={initialDate.current}
                    defaults={composerDefaults}
                    event={editing}
                    onClose={() => {
                        setComposerOpen(false);
                        setEditing(null);
                        setComposerDefaults({});
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
    defaults,
    event,
    onClose,
}: {
    courses: Array<{ id: string; title: string }>;
    defaultDate: string;
    defaults?: { starts_at?: string; ends_at?: string };
    event?: CalendarItem | null;
    onClose: () => void;
}) {
    const editing = Boolean(event);

    const form = useForm({
        course_id: event ? (event.course?.id ?? '') : (courses[0]?.id ?? ''),
        title: event?.title ?? '',
        description: event?.description ?? '',
        type: (event?.type ?? 'class') as EventType,
        starts_at: event
            ? forInput(event.starts_at)
            : (defaults?.starts_at ?? `${defaultDate}T18:00`),
        ends_at: event
            ? forInput(event.ends_at)
            : (defaults?.ends_at ?? ''),
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
                            <SystemSelect
                                id="type"
                                value={form.data.type}
                                onValueChange={(type) => form.setData('type', type as EventType)}
                                options={[
                                    { value: 'class', label: 'Class' },
                                    { value: 'workshop', label: 'Workshop' },
                                    { value: 'deadline', label: 'Deadline' },
                                    { value: 'announcement', label: 'Announcement' },
                                ]}
                            />
                        </div>

                        <div>
                            <label htmlFor="course" className="block text-sm font-medium mb-1.5">
                                Course
                            </label>
                            <SystemSelect
                                id="course"
                                value={form.data.course_id || '__everyone__'}
                                onValueChange={(courseId) =>
                                    form.setData('course_id', courseId === '__everyone__' ? '' : courseId)
                                }
                                options={[
                                    ...courses.map((course) => ({
                                        value: course.id,
                                        label: course.title,
                                    })),
                                    { value: '__everyone__', label: 'Everyone (platform-wide)' },
                                ]}
                            />
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
