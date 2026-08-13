import { Link, router, usePage } from '@inertiajs/react';
import { FormEventHandler, ReactNode, useEffect, useRef, useState } from 'react';
import {
    Award, Bell, BookOpen, Calendar, ClipboardCheck, GraduationCap, Home,
    LogOut, Menu, Moon, Search, Settings, Sun, X,
} from 'lucide-react';
import { PageProps } from '@/types';

interface DashboardLayoutProps {
    /** Page title, rendered by the page itself when it needs one. */
    header?: ReactNode;
    children: ReactNode;
}

const GRADING_ROLES = ['instructor', 'teaching_assistant', 'course_manager', 'platform_admin', 'super_admin'];
const SIDEBAR_KEY = 'sidebar:open';

export default function DashboardLayout({ header, children }: DashboardLayoutProps) {
    const { auth, flash, notifications_count } = usePage<PageProps>().props;

    // Collapsed state persists, so the sidebar stays how the user left it.
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isDark, setIsDark] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [query, setQuery] = useState('');

    const searchRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
        setSidebarOpen(localStorage.getItem(SIDEBAR_KEY) !== 'false');
    }, []);

    useEffect(() => {
        if (searchOpen) searchRef.current?.focus();
    }, [searchOpen]);

    // Escape closes whichever overlay is open.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSearchOpen(false);
                setMenuOpen(false);
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen((open) => {
            localStorage.setItem(SIDEBAR_KEY, String(!open));

            return !open;
        });
    };

    const toggleTheme = () => {
        const next = !isDark;
        setIsDark(next);
        document.documentElement.classList.toggle('dark', next);
        localStorage.setItem('theme', next ? 'dark' : 'light');
    };

    const search: FormEventHandler = (e) => {
        e.preventDefault();
        setSearchOpen(false);
        router.get(route('dashboard.courses'), { search: query, filter: 'all' });
    };

    const canGrade = GRADING_ROLES.includes(auth?.user?.role?.name ?? '');
    const unread = notifications_count ?? 0;

    const navigation = [
        { name: 'Home', href: '/dashboard', icon: Home, exact: true },
        { name: 'Courses', href: '/dashboard/courses', icon: BookOpen },
        { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
        { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, badge: unread },
    ];

    const yourWork = [
        { name: 'Assignments', href: '/dashboard/assignments', icon: ClipboardCheck },
        { name: 'Certificates', href: '/dashboard/certificates', icon: Award },
        ...(canGrade ? [{ name: 'Grading', href: '/instructor/grading', icon: GraduationCap }] : []),
    ];

    const path = typeof window === 'undefined' ? '' : window.location.pathname;
    const isActive = (href: string, exact = false) =>
        exact ? path === href : path === href || path.startsWith(href + '/');

    const message = flash?.success || flash?.error || flash?.warning || flash?.info;
    const tone = flash?.error ? 'error' : flash?.warning ? 'warning' : flash?.success ? 'success' : 'info';

    const navLink = (item: { name: string; href: string; icon: typeof Home; exact?: boolean; badge?: number }) => (
        <Link
            key={item.name}
            href={item.href}
            aria-current={isActive(item.href, item.exact) ? 'page' : undefined}
            className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive(item.href, item.exact)
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                    : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
            }`}
        >
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            <span className="flex-1 truncate">{item.name}</span>
            {!!item.badge && item.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-primary-600 text-white">
                    {item.badge > 99 ? '99+' : item.badge}
                </span>
            )}
        </Link>
    );

    return (
        <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
            {/* ── Brand + sidebar toggle (top-left, no bar) ───── */}
            <div className="fixed top-0 left-0 z-50 h-[72px] flex items-center gap-3 px-4">
                <button
                    onClick={toggleSidebar}
                    className="btn-icon"
                    aria-label={sidebarOpen ? 'Hide menu' : 'Show menu'}
                    aria-expanded={sidebarOpen}
                >
                    <Menu className="w-5 h-5" />
                </button>

                <Link href="/dashboard" className="text-2xl font-bold tracking-tight text-primary-900 dark:text-primary-300">
                    gmora
                </Link>
            </div>

            {/* ── Island (top-right): search + profile only ───── */}
            <div className="fixed top-4 right-4 z-50 flex items-center gap-1 p-1 rounded-full bg-white/90 dark:bg-surface-900/90 backdrop-blur border border-surface-200 dark:border-surface-800 shadow-card">
                <button onClick={() => setSearchOpen(true)} className="btn-icon" aria-label="Search">
                    <Search className="w-[18px] h-[18px]" />
                </button>

                <div className="relative">
                    <button
                        onClick={() => setMenuOpen((open) => !open)}
                        className="w-9 h-9 rounded-full bg-primary-600 text-white text-sm font-medium flex items-center justify-center"
                        aria-label="Account menu"
                        aria-expanded={menuOpen}
                    >
                        {auth?.user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </button>

                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 -z-10" onClick={() => setMenuOpen(false)} aria-hidden />
                            <div className="absolute right-0 mt-2 w-60 card p-2">
                                <div className="px-3 py-2.5 mb-1 border-b border-surface-100 dark:border-surface-800">
                                    <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                                        {auth?.user?.full_name}
                                    </p>
                                    <p className="text-xs text-surface-500 truncate">{auth?.user?.email}</p>
                                </div>

                                <Link
                                    href="/profile"
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800"
                                >
                                    <Settings className="w-4 h-4" />
                                    Settings
                                </Link>

                                <button
                                    onClick={toggleTheme}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800"
                                >
                                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                    {isDark ? 'Light mode' : 'Dark mode'}
                                </button>

                                <button
                                    onClick={() => router.post(route('logout'))}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign out
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Search overlay ──────────────────────────────── */}
            {searchOpen && (
                <div
                    className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-start justify-center pt-[18vh] px-4"
                    onClick={() => setSearchOpen(false)}
                >
                    <form
                        onSubmit={search}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-xl card p-2 flex items-center gap-2"
                    >
                        <Search className="w-5 h-5 text-surface-400 ml-3 shrink-0" />
                        <input
                            ref={searchRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search courses…"
                            aria-label="Search courses"
                            className="flex-1 bg-transparent border-0 py-2.5 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:ring-0"
                        />
                        <button type="submit" className="btn-primary py-2 px-4">
                            Search
                        </button>
                    </form>
                </div>
            )}

            {/* Mobile scrim */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                    onClick={toggleSidebar}
                    aria-hidden
                />
            )}

            {/* ── Sidebar ─────────────────────────────────────── */}
            <aside
                className={`fixed top-[72px] left-0 z-40 h-[calc(100vh-72px)] w-[248px] flex flex-col
                    bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800
                    transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
                    <div className="space-y-1">{navigation.map(navLink)}</div>

                    <p className="px-6 pt-6 pb-2 text-xs font-semibold text-surface-500">Your Work</p>

                    <div className="space-y-1">{yourWork.map(navLink)}</div>
                </nav>

                <div className="p-3 border-t border-surface-200 dark:border-surface-800">
                    <Link
                        href={route('courses.index')}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                    >
                        <BookOpen className="w-[18px] h-[18px]" />
                        Browse catalog
                    </Link>
                </div>
            </aside>

            {/* ── Content ─────────────────────────────────────── */}
            <div className={`transition-[padding] duration-200 ${sidebarOpen ? 'lg:pl-[248px]' : 'pl-0'}`}>
                <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 pt-[88px] pb-16">
                    {header && (
                        <h1 className="text-2xl font-semibold text-surface-900 dark:text-white mb-6">{header}</h1>
                    )}

                    {message && !dismissed && (
                        <div
                            role="status"
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl mb-6 text-sm border ${
                                tone === 'error'
                                    ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900'
                                    : tone === 'warning'
                                      ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                                      : tone === 'success'
                                        ? 'bg-accent-50 text-accent-700 border-accent-100 dark:bg-accent-950/40 dark:text-accent-300 dark:border-accent-900'
                                        : 'bg-primary-50 text-primary-700 border-primary-100 dark:bg-primary-950/40 dark:text-primary-300 dark:border-primary-900'
                            }`}
                        >
                            <span className="flex-1">{message}</span>
                            <button onClick={() => setDismissed(true)} aria-label="Dismiss">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {children}
                </div>
            </div>
        </div>
    );
}
