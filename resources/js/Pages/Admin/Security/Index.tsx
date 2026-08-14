import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { AlertTriangle, KeyRound, Search, ShieldCheck, Ticket } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { Paginated, PageProps } from '@/types';

interface LogRow {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    diff: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string | null;
    actor: { id: string; full_name: string; email: string } | null;
}

interface Props extends PageProps {
    logs: Paginated<LogRow>;
    filters: { search: string; action: string; actor: string; from: string; to: string };
    actions: string[];
    tokens: {
        issued_24h: number;
        issued_7d: number;
        active: number;
        revoked_7d: number;
        threshold: number;
        top_issuers: Array<{
            user_id: string;
            full_name: string;
            email: string;
            issued: number;
            lessons: number;
            suspicious: boolean;
        }>;
    };
}

/** Actions that change who can do what deserve to stand out in the list. */
const SENSITIVE = ['user.role_changed', 'user.deleted', 'auth.two_factor_failed', 'video_token.mismatched_user'];

function when(iso: string | null): string {
    return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
}

export default function SecurityIndex({ logs, filters, actions, tokens }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = (patch: Record<string, string>) =>
        router.get(route('admin.security.index'), { ...filters, search, ...patch }, {
            preserveState: true,
            replace: true,
        });

    const tiles = [
        { label: 'Tickets issued (24h)', value: tokens.issued_24h, icon: Ticket },
        { label: 'Tickets issued (7d)', value: tokens.issued_7d, icon: Ticket },
        { label: 'Currently valid', value: tokens.active, icon: KeyRound },
        { label: 'Revoked (7d)', value: tokens.revoked_7d, icon: ShieldCheck },
    ];

    return (
        <DashboardLayout header="Security">
            <Head title="Security — Admin" />

            {/* Video-token monitor */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-surface-200 dark:bg-surface-800 rounded-3xl overflow-hidden border border-surface-200 dark:border-surface-800 mb-5">
                {tiles.map((tile) => (
                    <div key={tile.label} className="bg-white dark:bg-surface-900 p-5">
                        <div className="flex items-center gap-2 text-surface-500 mb-3">
                            <tile.icon className="w-4 h-4" />
                            <span className="text-xs font-medium">{tile.label}</span>
                        </div>
                        <p className="text-2xl font-semibold text-surface-900 dark:text-white">{tile.value}</p>
                    </div>
                ))}
            </div>

            {tokens.top_issuers.length > 0 && (
                <div className="card p-6 mb-5">
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1">
                        Busiest ticket issuers (24h)
                    </h2>
                    <p className="text-sm text-surface-500 mb-4">
                        Many tickets across few lessons is the shape scripted scraping takes. Flagged above{' '}
                        {tokens.threshold} in a day.
                    </p>

                    <ul className="divide-y divide-surface-100 dark:divide-surface-800">
                        {tokens.top_issuers.map((issuer) => (
                            <li key={issuer.user_id} className="py-3 flex items-center gap-3">
                                <span className="flex-1 min-w-0">
                                    <Link
                                        href={route('admin.security.user', issuer.user_id)}
                                        className="text-sm font-medium text-surface-900 dark:text-white hover:text-primary-600"
                                    >
                                        {issuer.full_name}
                                    </Link>
                                    <span className="block text-xs text-surface-400 truncate">{issuer.email}</span>
                                </span>

                                {issuer.suspicious && (
                                    <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                        <AlertTriangle className="w-3 h-3" />
                                        Review
                                    </span>
                                )}

                                <span className="text-right shrink-0">
                                    <span className="block text-sm font-semibold text-surface-900 dark:text-white">
                                        {issuer.issued} tickets
                                    </span>
                                    <span className="block text-xs text-surface-400">
                                        {issuer.lessons} lesson{issuer.lessons === 1 ? '' : 's'}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Audit log */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        apply({});
                    }}
                    className="relative flex-1 max-w-sm"
                >
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Action, entity or IP…"
                        aria-label="Search the audit log"
                        className="input pl-11 rounded-full"
                    />
                </form>

                <select
                    value={filters.action ?? ''}
                    onChange={(e) => apply({ action: e.target.value })}
                    aria-label="Filter by action"
                    className="input rounded-full max-w-[240px]"
                >
                    <option value="">All actions</option>
                    {actions.map((action) => (
                        <option key={action} value={action}>
                            {action}
                        </option>
                    ))}
                </select>

                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={filters.from ?? ''}
                        onChange={(e) => apply({ from: e.target.value })}
                        aria-label="From date"
                        className="input rounded-full"
                    />
                    <span className="text-surface-400 text-sm">to</span>
                    <input
                        type="date"
                        value={filters.to ?? ''}
                        onChange={(e) => apply({ to: e.target.value })}
                        aria-label="To date"
                        className="input rounded-full"
                    />
                </div>
            </div>

            <div className="card divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden">
                {logs.data.length === 0 ? (
                    <p className="p-10 text-center text-sm text-surface-500">No matching audit entries.</p>
                ) : (
                    logs.data.map((log) => (
                        <div key={log.id} className="p-4 flex items-start gap-4">
                            <span className="flex-1 min-w-0">
                                <span className="flex items-center gap-2 flex-wrap">
                                    <code
                                        className={`text-xs font-mono px-2 py-0.5 rounded ${
                                            SENSITIVE.includes(log.action)
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300'
                                        }`}
                                    >
                                        {log.action}
                                    </code>
                                    <span className="text-sm text-surface-700 dark:text-surface-200">
                                        {log.entity_type}
                                    </span>
                                    {log.entity_id && (
                                        <span className="text-xs font-mono text-surface-400 truncate">
                                            {log.entity_id}
                                        </span>
                                    )}
                                </span>

                                <span className="block text-xs text-surface-400 mt-1">
                                    {log.actor ? (
                                        <Link
                                            href={route('admin.security.user', log.actor.id)}
                                            className="hover:text-primary-600"
                                        >
                                            {log.actor.full_name}
                                        </Link>
                                    ) : (
                                        'System'
                                    )}
                                    {log.ip_address ? ` · ${log.ip_address}` : ''} · {when(log.created_at)}
                                </span>

                                {log.diff && (
                                    <pre className="mt-2 text-xs font-mono bg-surface-50 dark:bg-surface-800/60 p-2.5 rounded-lg overflow-x-auto text-surface-600 dark:text-surface-300">
                                        {JSON.stringify(log.diff)}
                                    </pre>
                                )}
                            </span>
                        </div>
                    ))
                )}
            </div>

            {logs.last_page > 1 && (
                <nav className="flex justify-center gap-1 mt-6" aria-label="Pagination">
                    {logs.links.map((link, i) => (
                        <Link
                            key={i}
                            href={link.url ?? '#'}
                            preserveScroll
                            className={`px-3.5 py-2 rounded-lg text-sm ${
                                link.active
                                    ? 'bg-primary-600 text-white'
                                    : link.url
                                      ? 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
                                      : 'text-surface-300 pointer-events-none'
                            }`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </nav>
            )}
        </DashboardLayout>
    );
}
