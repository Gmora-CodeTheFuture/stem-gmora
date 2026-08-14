import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Ticket } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { Paginated, PageProps } from '@/types';

interface LogRow {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    ip_address: string | null;
    created_at: string | null;
}

interface TokenRow {
    id: string;
    lesson: string | null;
    issued_at: string | null;
    expires_at: string | null;
    revoked_at: string | null;
}

interface Props extends PageProps {
    targetUser: { id: string; full_name: string; email: string };
    logs: Paginated<LogRow>;
    tokens: TokenRow[];
}

function when(iso: string | null): string {
    return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

export default function SecurityUser({ targetUser, logs, tokens }: Props) {
    return (
        <DashboardLayout header={`Activity — ${targetUser.full_name}`}>
            <Head title={`${targetUser.full_name} — security`} />

            <Link
                href={route('admin.security.index')}
                className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Security console
            </Link>

            <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
                <div className="card divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden">
                    <div className="p-5">
                        <h2 className="text-base font-semibold text-surface-900 dark:text-white">Audit timeline</h2>
                        <p className="text-sm text-surface-500 mt-1">
                            Everything {targetUser.full_name} did, and everything done to their account.
                        </p>
                    </div>

                    {logs.data.length === 0 ? (
                        <p className="p-8 text-center text-sm text-surface-500">Nothing recorded yet.</p>
                    ) : (
                        logs.data.map((log) => (
                            <div key={log.id} className="p-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <code className="text-xs font-mono px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                                        {log.action}
                                    </code>
                                    <span className="text-sm text-surface-700 dark:text-surface-200">
                                        {log.entity_type}
                                    </span>
                                </div>
                                <p className="text-xs text-surface-400 mt-1">
                                    {log.ip_address ? `${log.ip_address} · ` : ''}
                                    {when(log.created_at)}
                                </p>
                            </div>
                        ))
                    )}
                </div>

                <div className="card p-5">
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1">
                        Recent video tickets
                    </h2>
                    <p className="text-sm text-surface-500 mb-4">Last 25 issued for this account.</p>

                    {tokens.length === 0 ? (
                        <p className="text-sm text-surface-500">No tickets issued.</p>
                    ) : (
                        <ul className="divide-y divide-surface-100 dark:divide-surface-800">
                            {tokens.map((token) => (
                                <li key={token.id} className="py-3 flex items-start gap-3">
                                    <Ticket className="w-4 h-4 text-surface-400 shrink-0 mt-0.5" />
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm text-surface-900 dark:text-white truncate">
                                            {token.lesson ?? 'Deleted lesson'}
                                        </span>
                                        <span className="block text-xs text-surface-400">
                                            {when(token.issued_at)}
                                        </span>
                                    </span>
                                    {token.revoked_at && <span className="badge-muted">Revoked</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
