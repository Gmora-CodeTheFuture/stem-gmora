import { Head, router } from '@inertiajs/react';
import {
    Award,
    Bell,
    BookOpen,
    Calendar,
    CheckCheck,
    ClipboardCheck,
    LifeBuoy,
    MessageSquare,
} from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

interface NotificationRow {
    id: string;
    type: string;
    data: { title?: string; body?: string; url?: string; icon?: string };
    read_at: string | null;
    created_at: string;
}

interface Props extends PageProps {
    notifications: NotificationRow[];
    unreadCount: number;
}

const ICONS: Record<string, typeof Bell> = {
    'clipboard-check': ClipboardCheck,
    award: Award,
    'book-open': BookOpen,
    calendar: Calendar,
    'message-square': MessageSquare,
    'life-buoy': LifeBuoy,
};

function relative(iso: string): string {
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;

    return `${Math.round(minutes / 1440)}d ago`;
}

export default function Notifications({ notifications, unreadCount }: Props) {
    const markRead = (notification: NotificationRow) => {
        if (!notification.read_at) {
            router.post(route('notifications.read', notification.id), {}, { preserveScroll: true });
        }
    };

    /** Mark as read first (when needed), then visit the destination — avoids racing Link with back(). */
    const visitNotification = (notification: NotificationRow) => {
        const url = notification.data.url;

        if (!url) {
            markRead(notification);
            return;
        }

        if (notification.read_at) {
            router.visit(url);
            return;
        }

        router.post(route('notifications.read', notification.id), {}, {
            preserveScroll: true,
            onSuccess: () => router.visit(url),
        });
    };

    return (
        <DashboardLayout header="Notifications">
            <Head title="Notifications — Gmora STEM" />

            <div className="flex items-center gap-3 mb-5">
                <p className="text-sm text-surface-500">
                    {unreadCount > 0 ? `${unreadCount} unread` : 'You’re all caught up'}
                </p>

                {unreadCount > 0 && (
                    <button
                        onClick={() => router.post(route('notifications.read-all'), {}, { preserveScroll: true })}
                        className="btn-ghost ml-auto py-2"
                    >
                        <CheckCheck className="w-4 h-4" />
                        Mark all as read
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="card p-12 text-center">
                    <Bell className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1.5">
                        No notifications yet
                    </h2>
                    <p className="text-sm text-surface-500 max-w-sm mx-auto">
                        Graded assignments, quiz results, and issued certificates land here.
                    </p>
                </div>
            ) : (
                <div className="card divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden">
                    {notifications.map((notification) => {
                        const Icon = ICONS[notification.data.icon ?? ''] ?? Bell;
                        const hasUrl = Boolean(notification.data.url);

                        return (
                            <button
                                key={notification.id}
                                type="button"
                                onClick={() => visitNotification(notification)}
                                className="group flex items-start gap-4 p-5 hover:bg-surface-50 dark:hover:bg-surface-800/60 transition-colors w-full text-left"
                            >
                                <span
                                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                        notification.read_at
                                            ? 'bg-surface-100 dark:bg-surface-800 text-surface-500'
                                            : 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
                                    }`}
                                >
                                    <Icon className="w-[18px] h-[18px]" />
                                </span>

                                <span className="flex-1 min-w-0">
                                    <span className="flex items-center gap-2">
                                        <span
                                            className={`text-sm truncate ${
                                                notification.read_at
                                                    ? 'text-surface-600 dark:text-surface-300'
                                                    : 'font-semibold text-surface-900 dark:text-white'
                                            }`}
                                        >
                                            {notification.data.title ?? notification.type}
                                        </span>
                                        {!notification.read_at && (
                                            <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0" />
                                        )}
                                    </span>
                                    <span className="block text-sm text-surface-500 mt-0.5">
                                        {notification.data.body}
                                    </span>
                                </span>

                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <span className="text-xs text-surface-400">
                                        {relative(notification.created_at)}
                                    </span>
                                    {!notification.read_at && (
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                markRead(notification);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    markRead(notification);
                                                }
                                            }}
                                            className="text-surface-400 hover:text-primary-600 transition-colors p-1 opacity-0 group-hover:opacity-100"
                                            title="Mark as read"
                                        >
                                            <CheckCheck className="w-4 h-4" />
                                        </span>
                                    )}
                                    {hasUrl && (
                                        <span className="sr-only">Open linked page</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </DashboardLayout>
    );
}
