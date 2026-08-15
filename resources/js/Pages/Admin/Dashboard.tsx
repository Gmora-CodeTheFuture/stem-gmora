import { Head, Link } from '@inertiajs/react';
import { Users, BookOpen, CreditCard, UserCheck, Award, TrendingUp } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps, User, Course } from '@/types';

interface AdminDashboardProps extends PageProps {
    stats: {
        total_users: number;
        total_courses: number;
        published_courses: number;
        total_enrollments: number;
        active_enrollments: number;
        total_certificates: number;
        total_revenue: number;
        monthly_revenue: number;
    };
    signups: Array<{ date: string; count: number }>;
    recentUsers: User[];
    recentCourses: Array<Course & { instructor?: { full_name: string } }>;
}

export default function AdminDashboard({ stats, signups, recentUsers, recentCourses }: AdminDashboardProps) {
    const kpis = [
        { label: 'Total Users', value: stats.total_users, icon: Users, color: 'text-blue-500' },
        { label: 'Courses', value: `${stats.published_courses} / ${stats.total_courses}`, caption: 'published / total', icon: BookOpen, color: 'text-emerald-500' },
        { label: 'Active Enrollments', value: stats.active_enrollments, caption: `${stats.total_enrollments} total`, icon: UserCheck, color: 'text-violet-500' },
        { label: 'Revenue (Total)', value: `$${stats.total_revenue.toLocaleString()}`, caption: `$${stats.monthly_revenue.toLocaleString()} this month`, icon: CreditCard, color: 'text-amber-500' },
        { label: 'Certificates', value: stats.total_certificates, icon: Award, color: 'text-rose-500' },
    ];

    const maxSignup = Math.max(...signups.map((d) => d.count), 1);

    return (
        <DashboardLayout>
            <Head title="Admin Dashboard — Gmora STEM" />

            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-surface-900 dark:text-white">Platform Overview</h1>
                <p className="text-surface-500 mt-1">Manage your entire learning platform from here.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className="card p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">{kpi.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-surface-900 dark:text-white">{kpi.value}</p>
                        {kpi.caption && <p className="text-xs text-surface-400 mt-1">{kpi.caption}</p>}
                    </div>
                ))}
            </div>

            {/* Signup Chart */}
            <div className="card p-6 mb-10">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-surface-500" />
                    <h2 className="text-sm font-semibold text-surface-900 dark:text-white">New Signups (Last 30 Days)</h2>
                </div>
                <div className="flex items-end gap-[3px] h-24">
                    {signups.map((day) => (
                        <div
                            key={day.date}
                            className="flex-1 bg-primary-500 dark:bg-primary-600 rounded-t transition-all hover:bg-primary-400"
                            style={{ height: `${Math.max((day.count / maxSignup) * 100, 4)}%` }}
                            title={`${day.date}: ${day.count} signups`}
                        />
                    ))}
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Recent Users */}
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-surface-900 dark:text-white">Recent Users</h2>
                        <Link href="/admin/users" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">View all →</Link>
                    </div>
                    <div className="space-y-3">
                        {recentUsers.map((user) => (
                            <div key={user.id} className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-surface-200 dark:bg-surface-800 flex items-center justify-center text-sm font-bold text-surface-500">
                                    {user.full_name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{user.full_name}</p>
                                    <p className="text-xs text-surface-500 truncate">{user.email}</p>
                                </div>
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 font-medium">
                                    {user.role?.display_name || user.role?.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Courses */}
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-surface-900 dark:text-white">Recent Courses</h2>
                        <Link href="/tutor/courses" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">View all →</Link>
                    </div>
                    <div className="space-y-3">
                        {recentCourses.map((course) => (
                            <div key={course.id} className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-surface-200 dark:bg-surface-800 flex items-center justify-center">
                                    <BookOpen className="w-4 h-4 text-surface-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{course.title}</p>
                                    <p className="text-xs text-surface-500">{course.instructor?.full_name} · {course.total_enrollments} students</p>
                                </div>
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                    course.status === 'published' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                    course.status === 'draft' ? 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400' :
                                    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                }`}>
                                    {course.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
