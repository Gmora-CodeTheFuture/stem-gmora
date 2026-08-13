import { Link, router, usePage } from '@inertiajs/react';
import { FormEventHandler, ReactNode, useEffect, useRef, useState } from 'react';
import {
    Award, Bell, BookOpen, Calendar, ClipboardCheck, GraduationCap, Home,
    LogOut, Menu, Moon, Search, Settings, Sun, X,
    LayoutDashboard, Users, CreditCard, Trophy, Wrench, PenSquare, UserCheck,
} from 'lucide-react';
import { PageProps } from '@/types';

interface DashboardLayoutProps {
    /** Page title, rendered by the page itself when it needs one. */
    header?: ReactNode;
    children: ReactNode;
    noScroll?: boolean;
}

const GRADING_ROLES = ['instructor', 'teaching_assistant', 'course_manager', 'platform_admin', 'super_admin'];
const SIDEBAR_KEY = 'sidebar:open';

export default function DashboardLayout({ header, children, noScroll = false }: DashboardLayoutProps) {
    const { auth, flash, notifications_count } = usePage<PageProps>().props;

    // Collapsed state persists, so the sidebar stays how the user left it.
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(SIDEBAR_KEY) !== 'false';
        }
        return true;
    });
    const [isDark, setIsDark] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [query, setQuery] = useState('');

    const searchRef = useRef<HTMLInputElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
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

    // Click outside to close menu
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

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
    const isAdmin = ['platform_admin', 'super_admin'].includes(auth?.user?.role?.name ?? '');
    const isTutor = ['instructor', 'course_manager'].includes(auth?.user?.role?.name ?? '');
    const isStudent = !isAdmin && !isTutor;
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

    const tutorNav = isTutor ? [
        { name: 'Overview', href: '/tutor', icon: LayoutDashboard, exact: true },
        { name: 'My Courses', href: '/tutor/courses', icon: PenSquare },
        { name: 'Grading', href: '/tutor/grading', icon: GraduationCap },
    ] : [];

    const adminNav = isAdmin ? [
        { name: 'Overview', href: '/admin', icon: LayoutDashboard, exact: true },
        { name: 'Users', href: '/admin/users', icon: Users },
        { name: 'All Courses', href: '/admin/courses', icon: BookOpen },
        { name: 'Enrollments', href: '/admin/enrollments', icon: UserCheck },
        { name: 'Payments', href: '/admin/payments', icon: CreditCard },
        { name: 'Badges', href: '/admin/badges', icon: Trophy },
    ] : [];

    const path = typeof window === 'undefined' ? '' : window.location.pathname;
    const isActive = (href: string, exact = false) =>
        exact ? path === href : path === href || path.startsWith(href + '/');

    const message = flash?.success || flash?.error || flash?.warning || flash?.info;
    const tone = flash?.error ? 'error' : flash?.warning ? 'warning' : flash?.success ? 'success' : 'info';

    const navLink = (item: { name: string; href: string; icon: typeof Home; exact?: boolean; badge?: number }) => (
        <Link
            key={item.name}
            href={item.href}
            title={!sidebarOpen ? item.name : undefined}
            aria-current={isActive(item.href, item.exact) ? 'page' : undefined}
            className={`flex items-center relative py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                sidebarOpen ? 'mx-3 px-3 gap-3' : 'mx-3 justify-center'
            } ${
                isActive(item.href, item.exact)
                    ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-8 before:w-1 before:bg-primary-600 dark:before:bg-primary-500 before:rounded-r-full'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-200'
            }`}
        >
            <item.icon
                className={`shrink-0 transition-colors ${
                    sidebarOpen ? 'w-5 h-5' : 'w-6 h-6'
                } ${isActive(item.href, item.exact) ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 dark:text-surface-500 group-hover:text-surface-600 dark:group-hover:text-surface-300'}`}
                strokeWidth={isActive(item.href, item.exact) ? 2.5 : 2}
            />
            
            {sidebarOpen && (
                <span className="flex-1 truncate">{item.name}</span>
            )}

            {item.badge !== undefined && item.badge > 0 && sidebarOpen && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[20px] h-5 rounded-full flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                </span>
            )}
            
            {item.badge !== undefined && item.badge > 0 && !sidebarOpen && (
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-surface-900"></span>
            )}
        </Link>
    );

    return (
        <div className={`bg-surface-50 dark:bg-surface-950 font-sans selection:bg-primary-200 dark:selection:bg-primary-900/40 text-surface-900 dark:text-surface-100 transition-colors duration-200 ${noScroll ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-40 h-full flex flex-col bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 transition-[width,transform] duration-200 ease-in-out
                    ${sidebarOpen ? 'w-[248px]' : 'w-[72px] -translate-x-full lg:translate-x-0'}`}
            >
                {/* Brand / Toggle Header */}
                <div className={`h-[72px] flex items-center shrink-0 ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'}`}>
                    <button
                        onClick={toggleSidebar}
                        className="btn-icon shrink-0"
                        aria-label={sidebarOpen ? 'Collapse menu' : 'Expand menu'}
                        aria-expanded={sidebarOpen}
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {sidebarOpen && (
                        <Link href="/dashboard" className="text-2xl font-bold tracking-tight text-primary-900 dark:text-primary-300 overflow-hidden whitespace-nowrap fade-in">
                            gmora
                        </Link>
                    )}
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin overflow-x-hidden">
                    {isStudent && (
                        <>
                            <div className="space-y-1">{navigation.map(navLink)}</div>

                            <div className={`pt-6 pb-2 ${sidebarOpen ? 'px-6' : 'px-0 text-center'}`}>
                                {sidebarOpen ? (
                                    <p className="text-xs font-semibold text-surface-500 whitespace-nowrap">Your Work</p>
                                ) : (
                                    <div className="w-4 h-px bg-surface-200 dark:bg-surface-800 mx-auto"></div>
                                )}
                            </div>

                            <div className="space-y-1">{yourWork.map(navLink)}</div>
                        </>
                    )}

                    {/* Tutor section */}
                    {isTutor && tutorNav.length > 0 && (
                        <>
                            <div className={`pt-6 pb-2 ${sidebarOpen ? 'px-6' : 'px-0 text-center'}`}>
                                {sidebarOpen ? (
                                    <p className="text-xs font-semibold text-surface-500 whitespace-nowrap">Teaching</p>
                                ) : (
                                    <div className="w-4 h-px bg-surface-200 dark:bg-surface-800 mx-auto"></div>
                                )}
                            </div>
                            <div className="space-y-1">{tutorNav.map(navLink)}</div>
                        </>
                    )}

                    {/* Admin section */}
                    {isAdmin && adminNav.length > 0 && (
                        <>
                            <div className={`pt-6 pb-2 ${sidebarOpen ? 'px-6' : 'px-0 text-center'}`}>
                                {sidebarOpen ? (
                                    <p className="text-xs font-semibold text-surface-500 whitespace-nowrap">Administration</p>
                                ) : (
                                    <div className="w-4 h-px bg-surface-200 dark:bg-surface-800 mx-auto"></div>
                                )}
                            </div>
                            <div className="space-y-1">{adminNav.map(navLink)}</div>
                        </>
                    )}
                </nav>

                <div className="p-3 border-t border-surface-200 dark:border-surface-800">
                    <Link
                        href={route('courses.index')}
                        className={`flex items-center py-2.5 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors ${
                            sidebarOpen ? 'px-3 gap-3' : 'justify-center'
                        }`}
                        title={!sidebarOpen ? 'Browse catalog' : undefined}
                    >
                        <BookOpen className="w-[18px] h-[18px] shrink-0" />
                        {sidebarOpen && <span className="whitespace-nowrap">Browse catalog</span>}
                    </Link>
                </div>
            </aside>

            {/* Mobile scrim */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                    onClick={toggleSidebar}
                    aria-hidden
                />
            )}

            {/* ── Main Content Area ───────────────────────────────── */}
            <div className={`transition-[margin] duration-200 ease-in-out ${sidebarOpen ? 'lg:ml-[248px]' : 'ml-0 lg:ml-[72px]'} ${noScroll ? 'h-screen overflow-hidden flex flex-col' : 'flex-1'}`}>
                
                {/* ── Top Bar (Mobile menu toggle + Topic + Island) ───────── */}
                <div className="fixed top-0 right-0 z-30 h-[72px] flex items-center justify-between px-4 sm:px-6 lg:px-10 pointer-events-none transition-all duration-200" style={{ left: sidebarOpen ? '248px' : '72px' }}>
                    
                    <div className="pointer-events-auto flex items-center gap-4 min-w-0 pr-4">
                        {/* Mobile Hamburger */}
                        {!sidebarOpen && (
                            <button
                                onClick={toggleSidebar}
                                className="btn-icon lg:hidden shrink-0"
                                aria-label="Show menu"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                        
                        {/* Page Topic / Header */}
                        {header && (
                            <h1 className="text-xl md:text-2xl font-bold text-surface-900 dark:text-white truncate">
                                {header}
                            </h1>
                        )}
                    </div>
                    
                    {/* Island (top-right): search + profile */}
                    <div 
                        className={`flex items-center justify-between p-1 rounded-full bg-white/90 dark:bg-surface-900/90 backdrop-blur border border-surface-200 dark:border-surface-800 shadow-card pointer-events-auto ml-auto transition-[width] duration-300 ease-out overflow-visible ${
                            searchOpen ? 'w-[320px]' : 'w-[84px]'
                        }`}
                    >
                        {!searchOpen ? (
                            <button onClick={() => setSearchOpen(true)} className="btn-icon shrink-0" aria-label="Search">
                                <Search className="w-[18px] h-[18px]" />
                            </button>
                        ) : (
                            <form onSubmit={search} className="flex-1 flex items-center pl-2 min-w-0 fade-in">
                                <Search className="w-4 h-4 text-surface-400 shrink-0" />
                                <input
                                    ref={searchRef}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search courses…"
                                    className="flex-1 bg-transparent border-0 text-sm py-1.5 px-2 focus:ring-0 min-w-0 dark:text-white placeholder:text-surface-400"
                                />
                                <button type="button" onClick={() => setSearchOpen(false)} className="p-1 mr-1 text-surface-400 hover:text-surface-600 shrink-0">
                                    <X className="w-4 h-4" />
                                </button>
                            </form>
                        )}

                        <div className="relative shrink-0" ref={menuRef}>
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
                                    <div className="absolute right-0 mt-2 w-60 card p-2 shadow-lg z-50">
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
                </div>

                {/* ── Page Content ────────────────────────────────── */}
                <div className={`max-w-[1200px] mx-auto w-full px-4 sm:px-6 lg:px-10 pt-[88px] overflow-x-hidden ${noScroll ? 'flex-1 flex flex-col min-h-0 pb-4' : 'pb-16'}`}>

                    {message && !dismissed && (
                        <div
                            role="status"
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl mb-6 text-sm border shrink-0 ${
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
