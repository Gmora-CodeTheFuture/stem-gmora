import { Head, Link } from '@inertiajs/react';
import { CreditCard, TrendingUp, RotateCcw, Search } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps, Paginated } from '@/types';
import { useState } from 'react';
import { router } from '@inertiajs/react';

interface Payment {
    id: string;
    amount: number;
    currency: string;
    provider: string;
    status: string;
    created_at: string;
    user: { id: string; full_name: string; email: string };
    course: { id: string; title: string };
}

interface Props extends PageProps {
    payments: Paginated<Payment>;
    summary: { total_revenue: number; monthly_revenue: number; total_refunds: number };
    filters: { search?: string; status?: string };
}

export default function PaymentsIndex({ payments, summary, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    return (
        <DashboardLayout>
            <Head title="Payments — Admin" />

            <h1 className="text-2xl font-semibold text-surface-900 dark:text-white mb-6">Payments</h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="card p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        <span className="text-xs font-semibold text-surface-500 uppercase">Total Revenue</span>
                    </div>
                    <p className="text-2xl font-bold text-surface-900 dark:text-white">${summary.total_revenue.toLocaleString()}</p>
                </div>
                <div className="card p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-5 h-5 text-blue-500" />
                        <span className="text-xs font-semibold text-surface-500 uppercase">This Month</span>
                    </div>
                    <p className="text-2xl font-bold text-surface-900 dark:text-white">${summary.monthly_revenue.toLocaleString()}</p>
                </div>
                <div className="card p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <RotateCcw className="w-5 h-5 text-red-500" />
                        <span className="text-xs font-semibold text-surface-500 uppercase">Refunds</span>
                    </div>
                    <p className="text-2xl font-bold text-surface-900 dark:text-white">${summary.total_refunds.toLocaleString()}</p>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-surface-200 dark:border-surface-800 text-left">
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Course</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                        {payments.data.map((payment) => (
                            <tr key={payment.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                <td className="px-6 py-4">
                                    <p className="font-medium text-surface-900 dark:text-white">{payment.user.full_name}</p>
                                    <p className="text-xs text-surface-500">{payment.user.email}</p>
                                </td>
                                <td className="px-6 py-4 text-surface-600 dark:text-surface-400">{payment.course.title}</td>
                                <td className="px-6 py-4 font-medium text-surface-900 dark:text-white">
                                    {payment.currency} {payment.amount}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${
                                        payment.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                        payment.status === 'refunded' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                        'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                                    }`}>
                                        {payment.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-surface-500 text-xs">{new Date(payment.created_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {payments.last_page > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    {payments.links.map((link, i) => (
                        <Link key={i} href={link.url || '#'}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${link.active ? 'bg-primary-600 text-white' : link.url ? 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800' : 'text-surface-300 cursor-not-allowed'}`}
                            dangerouslySetInnerHTML={{ __html: link.label }} />
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
