import { Head, Link, router } from '@inertiajs/react';
import { Award, Bell, CheckCheck, ClipboardCheck } from 'lucide-react';
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
};

function relative(iso: string): string {
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;

    return `${Math.round(minutes / 1440)}d ago`;
}

export default function Notifications({ notifications, unreadCount }: Props) {
    const open = (notification: NotificationRow) => {
        if (!notification.read_at) {
            router.post(route('notifications.read', notification.id), {}, { preserveScroll: true });
        }
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
                        const body = (
                            <>
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

                                <span className="text-xs text-surface-400 shrink-0">
                                    {relative(notification.created_at)}
                                </span>
                            </>
                        );

                        const className = 'flex items-start gap-4 p-5 hover:bg-surface-50 dark:hover:bg-surface-800/60 transition-colors w-full text-left';

                        return notification.data.url ? (
                            <Link
                                key={notification.id}
                                href={notification.data.url}
                                onClick={() => open(notification)}
                                className={className}
                            >
                                {body}
                            </Link>
                        ) : (
                            <button key={notification.id} onClick={() => open(notification)} className={className}>
                                {body}
                            </button>
                        );
                    })}
                </div>
            )}
        </DashboardLayout>
    );
}
