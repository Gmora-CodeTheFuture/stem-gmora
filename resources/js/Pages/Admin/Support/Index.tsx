import { Head, Link, router } from '@inertiajs/react';
import { LifeBuoy, MessageSquare } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import SegmentedControl from '@/Components/SegmentedControl';
import SystemSelect from '@/Components/SystemSelect';
import { Paginated, PageProps } from '@/types';

interface TicketRow {
    id: string;
    reference: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    messages_count: number;
    last_reply_at: string | null;
    requester: { id: string; full_name: string; email: string } | null;
    assignee: { id: string; full_name: string } | null;
}

interface Props extends PageProps {
    tickets: Paginated<TicketRow>;
    filters: { status: string; assignee: string };
    staff: Array<{ id: string; full_name: string }>;
    counts: { open: number; pending: number; unassigned: number };
}

const STATUSES = ['open', 'pending', 'resolved', 'closed', 'all'];

const PRIORITY_STYLE: Record<string, string> = {
    high: 'badge bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
    normal: 'badge-muted',
    low: 'badge-muted',
};

function when(iso: string | null): string {
    if (!iso) return '';

    const hours = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);

    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;

    return `${Math.round(hours / 24)}d ago`;
}

export default function SupportQueue({ tickets, filters, staff, counts }: Props) {
    const apply = (patch: Record<string, string>) =>
        router.get(route('admin.support.index'), { ...filters, ...patch }, { preserveState: true, replace: true });

    const set = (ticket: TicketRow, patch: Record<string, string | null>) =>
        router.patch(route('admin.support.update', ticket.id), patch, { preserveScroll: true });

    return (
        <DashboardLayout header="Support queue">
            <Head title="Support queue — Admin" />

            <div className="flex items-center gap-6 mb-5 text-sm">
                <span className="text-surface-500">
                    <span className="font-semibold text-surface-900 dark:text-white">{counts.open}</span> open
                </span>
                <span className="text-surface-500">
                    <span className="font-semibold text-surface-900 dark:text-white">{counts.pending}</span> waiting
                    on students
                </span>
                <span className="text-surface-500">
                    <span className="font-semibold text-surface-900 dark:text-white">{counts.unassigned}</span>{' '}
                    unassigned
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-5">
                <SegmentedControl
                    aria-label="Ticket status"
                    value={filters.status}
                    onChange={(status) => apply({ status })}
                    items={STATUSES.map((status) => ({
                        key: status,
                        label: <span className="capitalize">{status}</span>,
                    }))}
                />

                <SystemSelect
                    value={filters.assignee || '__any__'}
                    onValueChange={(assignee) =>
                        apply({ assignee: assignee === '__any__' ? '' : assignee })
                    }
                    aria-label="Filter by assignee"
                    triggerClassName="rounded-full max-w-[220px]"
                    options={[
                        { value: '__any__', label: 'Anyone' },
                        { value: 'unassigned', label: 'Unassigned' },
                        ...staff.map((member) => ({
                            value: member.id,
                            label: member.full_name,
                        })),
                    ]}
                />
            </div>

            {tickets.data.length === 0 ? (
                <div className="card p-12 text-center">
                    <LifeBuoy className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1.5">
                        Queue is clear
                    </h2>
                    <p className="text-sm text-surface-500">Nothing matching this filter.</p>
                </div>
            ) : (
                <div className="card divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden">
                    {tickets.data.map((ticket) => (
                        <div key={ticket.id} className="p-4 flex items-start gap-4 flex-wrap">
                            <span className="flex-1 min-w-[220px]">
                                <span className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-mono text-surface-400">{ticket.reference}</span>
                                    <Link
                                        href={route('support.show', ticket.id)}
                                        className="text-sm font-medium text-surface-900 dark:text-white hover:text-primary-600"
                                    >
                                        {ticket.subject}
                                    </Link>
                                    <span className={PRIORITY_STYLE[ticket.priority] ?? 'badge-muted'}>
                                        {ticket.priority}
                                    </span>
                                </span>
                                <span className="block text-xs text-surface-400 mt-1">
                                    {ticket.requester?.full_name} · {ticket.category} ·{' '}
                                    {when(ticket.last_reply_at)}
                                    <span className="inline-flex items-center gap-1 ml-2">
                                        <MessageSquare className="w-3 h-3" />
                                        {ticket.messages_count}
                                    </span>
                                </span>
                            </span>

                            <SystemSelect
                                value={ticket.assignee?.id ?? '__none__'}
                                onValueChange={(v) =>
                                    set(ticket, { assigned_to: v === '__none__' ? null : v })
                                }
                                aria-label={`Assign ${ticket.reference}`}
                                triggerClassName="py-1.5 max-w-[170px] text-sm"
                                options={[
                                    { value: '__none__', label: 'Unassigned' },
                                    ...staff.map((member) => ({
                                        value: member.id,
                                        label: member.full_name,
                                    })),
                                ]}
                            />

                            <SystemSelect
                                value={ticket.priority}
                                onValueChange={(priority) => set(ticket, { priority })}
                                aria-label={`Priority for ${ticket.reference}`}
                                triggerClassName="py-1.5 max-w-[120px] text-sm capitalize"
                                options={['low', 'normal', 'high'].map((priority) => ({
                                    value: priority,
                                    label: priority,
                                }))}
                            />

                            <SystemSelect
                                value={ticket.status}
                                onValueChange={(status) => set(ticket, { status })}
                                aria-label={`Status for ${ticket.reference}`}
                                triggerClassName="py-1.5 max-w-[130px] text-sm capitalize"
                                options={['open', 'pending', 'resolved', 'closed'].map((status) => ({
                                    value: status,
                                    label: status,
                                }))}
                            />
                        </div>
                    ))}
                </div>
            )}

            {tickets.last_page > 1 && (
                <nav className="flex justify-center gap-1 mt-6" aria-label="Pagination">
                    {tickets.links.map((link, i) => (
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
