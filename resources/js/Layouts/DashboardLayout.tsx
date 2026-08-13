import { Link, usePage, router } from '@inertiajs/react';
import { PropsWithChildren, useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GraduationCap, LayoutDashboard, BookOpen, ClipboardCheck,
    Award, Settings, Bell, ChevronDown, LogOut,
    Menu, X, Moon, Sun, User, ChevronRight
} from 'lucide-react';
import { PageProps } from '@/types';

interface DashboardLayoutProps {
    header?: ReactNode;
    children: ReactNode;
}

export default function DashboardLayout({ header, children }: DashboardLayoutProps) {
    const { auth, flash, notifications_count } = usePage<PageProps>().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    const toggleTheme = () => {
        setIsDark(!isDark);
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
    };

    // Staff roles get the grading queue; Certificates and Calendar arrive with
    // their own milestones, so they are not linked until those routes exist.
    const canGrade = ['instructor', 'teaching_assistant', 'course_manager', 'platform_admin', 'super_admin']
        .includes(auth?.user?.role?.name ?? '');

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'My Courses', href: '/dashboard/courses', icon: BookOpen },
        { name: 'Assignments', href: '/dashboard/assignments', icon: ClipboardCheck },
        ...(canGrade ? [{ name: 'Grading', href: '/instructor/grading', icon: Award }] : []),
        { name: 'Settings', href: '/profile', icon: Settings },
    ];

    const currentPath = window.location.pathname;

    return (
        <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
            {/* ── Mobile Sidebar Overlay ─────────────────────── */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* ── Sidebar ───────────────────────────────────── */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 transform transition-transform duration-300 ease-out lg:translate-x-0 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-5 border-b border-surface-200 dark:border-surface-800">
                        <Link href="/" className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
                                <GraduationCap className="w-4.5 h-4.5 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-base font-bold font-display text-surface-900 dark:text-white leading-tight">Gmora</span>
                                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary-500">STEM</span>
                            </div>
                        </Link>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-surface-500">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
                        {navigation.map((item) => {
                            const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                                        isActive
                                            ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 shadow-sm'
                                            : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-200'
                                    }`}
                                >
                                    <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                                    {item.name}
                                    {isActive && <ChevronRight className="w-4 h-4 ml-auto text-primary-400" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="p-3 border-t border-surface-200 dark:border-surface-800">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white font-semibold text-sm">
                                {auth?.user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                                    {auth?.user?.full_name || 'User'}
                                </p>
                                <p className="text-xs text-surface-500 truncate">
                                    {auth?.user?.role?.display_name || 'Student'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ── Main Content ──────────────────────────────── */}
            <div className="lg:ml-64">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-surface-900/90 backdrop-blur-xl border-b border-surface-200 dark:border-surface-800">
                    <div className="flex items-center justify-between h-full px-4 md:px-6">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 rounded-lg text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            {header && <div className="text-lg font-semibold font-display text-surface-900 dark:text-white">{header}</div>}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleTheme}
                                className="p-2.5 rounded-xl text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200"
                            >
                                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>

                            {/* Notifications */}
                            <button className="relative p-2.5 rounded-xl text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200">
                                <Bell className="w-5 h-5" />
                                {(notifications_count ?? 0) > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-surface-900" />
                                )}
                            </button>

                            {/* User Menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white font-semibold text-xs">
                                        {auth?.user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-surface-500" />
                                </button>

                                <AnimatePresence>
                                    {userMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                            className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-xl py-2"
                                        >
                                            <div className="px-4 py-2 border-b border-surface-100 dark:border-surface-700">
                                                <p className="text-sm font-medium text-surface-900 dark:text-white">{auth?.user?.full_name}</p>
                                                <p className="text-xs text-surface-500">{auth?.user?.email}</p>
                                            </div>
                                            <Link
                                                href="/dashboard/settings"
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700"
                                                onClick={() => setUserMenuOpen(false)}
                                            >
                                                <User className="w-4 h-4" /> Profile & Settings
                                            </Link>
                                            <Link
                                                href="/logout"
                                                method="post"
                                                as="button"
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                onClick={() => setUserMenuOpen(false)}
                                            >
                                                <LogOut className="w-4 h-4" /> Sign Out
                                            </Link>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Flash Messages */}
                <AnimatePresence>
                    {flash?.success && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mx-4 md:mx-6 mt-4 px-4 py-3 rounded-xl bg-accent-50 dark:bg-accent-950/30 border border-accent-200 dark:border-accent-800 text-accent-700 dark:text-accent-300 text-sm"
                        >
                            {flash.success}
                        </motion.div>
                    )}
                    {flash?.error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mx-4 md:mx-6 mt-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm"
                        >
                            {flash.error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Page Content */}
                <div className="p-4 md:p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
