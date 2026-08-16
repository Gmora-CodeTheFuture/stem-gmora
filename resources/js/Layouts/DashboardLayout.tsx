import axios from 'axios';
import { Link, router, usePage } from '@inertiajs/react';
import { FormEventHandler, ReactNode, useEffect, useRef, useState } from 'react';
import {
    Award, Bell, BookOpen, Calendar, ClipboardCheck, GraduationCap, Home,
    LifeBuoy, LogOut, Menu, Moon, Search, Settings, Sun, X,
    LayoutDashboard, Users, CreditCard, Trophy, Wrench, PenSquare, UserCheck, ShieldCheck, BarChart3,
    PlayCircle, MessageSquare, CheckCircle2
} from 'lucide-react';
import { PageProps } from '@/types';

interface DashboardLayoutProps {
    /** Page title, rendered by the page itself when it needs one. */
    header?: ReactNode;
    children: ReactNode;
    noScroll?: boolean;
}

const SIDEBAR_KEY = 'sidebar:open';

export default function DashboardLayout({ header, children, noScroll = false }: DashboardLayoutProps) {
    const { auth, flash, notifications_count } = usePage<PageProps>().props;

    // Two separate ideas that used to share one flag. On a desktop the sidebar
    // is expanded or collapsed to a rail, and that choice persists. On a phone
    // there is no room for either, so it is a drawer that starts closed on
    // every page — persisting it would greet mobile users with a full-screen
    // menu over their content.
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(SIDEBAR_KEY) !== 'false';
        }
        return true;
    });
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any>(null);
    const [isSearching, setIsSearching] = useState(false);

    const searchRef = useRef<HTMLInputElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    // `sidebarOpen` only means "collapsed to a rail" on a desktop. The drawer is
    // always full width, so without this a user who collapsed the rail would
    // find an icons-only menu with no labels on their phone.
    const [isDesktop, setIsDesktop] = useState(true);

    useEffect(() => {
        const query = window.matchMedia('(min-width: 1024px)');
        const sync = () => setIsDesktop(query.matches);

        sync();
        query.addEventListener('change', sync);

        return () => query.removeEventListener('change', sync);
    }, []);

    /** Labels and section headings are visible unless the desktop rail is collapsed. */
    const expanded = !isDesktop || sidebarOpen;

    useEffect(() => {
        if (searchOpen) searchRef.current?.focus();
    }, [searchOpen]);

    useEffect(() => {
        if (query.trim().length < 2) {
            setResults(null);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(() => {
            axios.get(route('dashboard.search'), { params: { q: query } })
                .then(res => {
                    setResults(res.data);
                })
                .finally(() => {
                    setIsSearching(false);
                });
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Escape closes whichever overlay is open.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSearchOpen(false);
                setMenuOpen(false);
                setMobileNavOpen(false);
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Tapping a link in the drawer should take you there and get out of the way.
    useEffect(() => router.on('navigate', () => setMobileNavOpen(false)), []);

    // While the drawer is over the page, the page behind it must not scroll.
    useEffect(() => {
        if (!mobileNavOpen) return;

        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previous;
        };
    }, [mobileNavOpen]);

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
        // The search is now handled inline via dropdown.
    };

    const isAdmin = auth?.user?.role?.name === 'admin';
    // Two roles: you either learn here or you run the place. Authoring and
    // administration are the same job now, so they share one list.
    const isStudent = !isAdmin;
    const unread = notifications_count ?? 0;

    const navigation = [
        { name: 'Home', href: '/dashboard', icon: Home, exact: true },
        { name: 'Courses', href: '/dashboard/courses', icon: BookOpen },
        { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
        { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, badge: unread },
    ];

    const yourWork = [
        { name: 'Support', href: '/support', icon: LifeBuoy },
        { name: 'Assignments', href: '/dashboard/assignments', icon: ClipboardCheck },
        { name: 'Certificates', href: '/dashboard/certificates', icon: Award },
        { name: 'Leaderboard', href: '/dashboard/leaderboard', icon: Trophy },
    ];

    // Ordered by how the work actually flows: build it, review it, then the
    // people and the platform around it.
    const adminNav = isAdmin ? [
        { name: 'Overview', href: '/admin', icon: LayoutDashboard, exact: true },
        { name: 'Courses', href: '/tutor/courses', icon: BookOpen },
        { name: 'Grading', href: '/tutor/grading', icon: GraduationCap },
        { name: 'Approvals', href: '/admin/approvals', icon: ClipboardCheck },
        { name: 'Users', href: '/admin/users', icon: Users },
        { name: 'Enrollments', href: '/admin/enrollments', icon: UserCheck },
        { name: 'Support queue', href: '/admin/support', icon: LifeBuoy },
        { name: 'Badges', href: '/admin/badges', icon: Trophy },
        { name: 'Blog', href: '/admin/posts', icon: PenSquare },
        { name: 'Website copy', href: '/admin/content', icon: Wrench },
        { name: 'Payments', href: '/admin/payments', icon: CreditCard },
        { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
        { name: 'Security', href: '/admin/security', icon: ShieldCheck },
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
            title={!expanded ? item.name : undefined}
            aria-current={isActive(item.href, item.exact) ? 'page' : undefined}
            className={`flex items-center relative py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                expanded ? 'mx-3 px-3 gap-3' : 'mx-3 justify-center'
            } ${
                isActive(item.href, item.exact)
                    ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-8 before:w-1 before:bg-primary-600 dark:before:bg-primary-500 before:rounded-r-full'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-200'
            }`}
        >
            <item.icon
                className={`shrink-0 transition-colors ${
                    expanded ? 'w-5 h-5' : 'w-6 h-6'
                } ${isActive(item.href, item.exact) ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 dark:text-surface-500 group-hover:text-surface-600 dark:group-hover:text-surface-300'}`}
                strokeWidth={isActive(item.href, item.exact) ? 2.5 : 2}
            />
            
            {expanded && (
                <span className="flex-1 truncate">{item.name}</span>
            )}

            {item.badge !== undefined && item.badge > 0 && expanded && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[20px] h-5 rounded-full flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                </span>
            )}
            
            {item.badge !== undefined && item.badge > 0 && !expanded && (
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-surface-900"></span>
            )}
        </Link>
    );

    return (
        <div className={`bg-surface-50 dark:bg-surface-950 font-sans selection:bg-primary-200 dark:selection:bg-primary-900/40 text-surface-900 dark:text-surface-100 transition-colors duration-200 ${noScroll ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full flex flex-col bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 transition-[width,transform] duration-200 ease-in-out
                    w-[264px] ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0 ${sidebarOpen ? 'lg:w-[248px]' : 'lg:w-[72px]'}`}
                aria-label="Main navigation"
            >
                {/* Brand / Toggle Header */}
                <div className={`h-[88px] flex items-center shrink-0 ${expanded ? 'px-3 gap-2' : 'justify-center'}`}>
                    {/* On a desktop this collapses the rail; in the mobile drawer
                        the same corner is where a close button belongs. */}
                    <button
                        onClick={() => (isDesktop ? toggleSidebar() : setMobileNavOpen(false))}
                        className="btn-icon shrink-0 relative z-10"
                        aria-label={isDesktop ? (expanded ? 'Collapse menu' : 'Expand menu') : 'Close menu'}
                        aria-expanded={isDesktop ? sidebarOpen : mobileNavOpen}
                    >
                        {isDesktop ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    </button>

                    {expanded && (
                        <Link
                            href="/dashboard"
                            className="flex-1 flex items-center justify-center -ml-9 pointer-events-auto overflow-hidden whitespace-nowrap fade-in"
                        >
                            <img src="/logo.svg" alt="Gmora STEM" className="h-16 w-auto object-contain dark:hidden block" />
                            <img src="/logo-dark.svg" alt="Gmora STEM" className="h-16 w-auto object-contain hidden dark:block" />
                        </Link>
                    )}
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin overflow-x-hidden">
                    {isStudent && (
                        <>
                            <div className="space-y-1">{navigation.map(navLink)}</div>

                            <div className={`pt-6 pb-2 ${expanded ? 'px-6' : 'px-0 text-center'}`}>
                                {expanded ? (
                                    <p className="text-xs font-semibold text-surface-500 whitespace-nowrap">Your Work</p>
                                ) : (
                                    <div className="w-4 h-px bg-surface-200 dark:bg-surface-800 mx-auto"></div>
                                )}
                            </div>

                            <div className="space-y-1">{yourWork.map(navLink)}</div>
                        </>
                    )}

                    {/* Admin section */}
                    {isAdmin && adminNav.length > 0 && (
                        <>
                            <div className={`pt-6 pb-2 ${expanded ? 'px-6' : 'px-0 text-center'}`}>
                                {expanded ? (
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
                            expanded ? 'px-3 gap-3' : 'justify-center'
                        }`}
                        title={!expanded ? 'Browse catalog' : undefined}
                    >
                        <BookOpen className="w-[18px] h-[18px] shrink-0" />
                        {expanded && <span className="whitespace-nowrap">Browse catalog</span>}
                    </Link>
                </div>
            </aside>

            {/* Drawer scrim — mobile only; the desktop rail never covers content. */}
            {mobileNavOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                    onClick={() => setMobileNavOpen(false)}
                    aria-hidden
                />
            )}

            {/* ── Main Content Area ───────────────────────────────── */}
            <div className={`transition-[margin] duration-200 ease-in-out ${sidebarOpen ? 'lg:ml-[248px]' : 'ml-0 lg:ml-[72px]'} ${noScroll ? 'h-screen overflow-hidden flex flex-col' : 'flex-1'}`}>
                
                {/* ── Top Bar (Mobile menu toggle + Topic + Island) ───────── */}
                <div
                    className={`fixed top-0 right-0 left-0 z-30 h-[72px] flex items-center justify-between px-4 sm:px-6 lg:px-10 pointer-events-none transition-all duration-200 ${
                        sidebarOpen ? 'lg:left-[248px]' : 'lg:left-[72px]'
                    }`}
                >
                    
                    <div className="pointer-events-auto flex items-center gap-4 min-w-0 pr-4">
                        {/* Opens the drawer. Always present on mobile, since the
                            sidebar is off-canvas there whatever the rail state. */}
                        <button
                            onClick={() => setMobileNavOpen(true)}
                            className="btn-icon lg:hidden shrink-0 bg-white/90 dark:bg-surface-900/90 backdrop-blur border border-surface-200 dark:border-surface-800"
                            aria-label="Show menu"
                            aria-expanded={mobileNavOpen}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        
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
                            searchOpen ? 'w-[260px] sm:w-[320px]' : 'w-[84px]'
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
                                    placeholder="Search courses, lessons, discussions…"
                                    className="flex-1 bg-transparent border-0 text-[16px] sm:text-sm py-1.5 px-2 focus:ring-0 min-w-0 dark:text-white placeholder:text-surface-400"
                                />
                                <button type="button" onClick={() => { setSearchOpen(false); setQuery(''); }} className="p-1 mr-1 text-surface-400 hover:text-surface-600 shrink-0">
                                    <X className="w-4 h-4" />
                                </button>
                                
                                {searchOpen && query.trim().length >= 2 && (
                                    <div className="absolute top-full right-0 mt-3 w-full sm:w-[400px] max-h-[80vh] overflow-y-auto bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-xl rounded-2xl z-50 p-2 fade-in">
                                        {isSearching ? (
                                            <div className="p-4 text-center text-surface-500 text-sm">Searching...</div>
                                        ) : results?.total === 0 ? (
                                            <div className="p-4 text-center text-surface-500 text-sm">No results found for "{query}"</div>
                                        ) : results ? (
                                            <div className="space-y-4 p-2">
                                                {/* Courses */}
                                                {results.results?.courses?.length > 0 && (
                                                    <div>
                                                        <h3 className="text-[10px] font-bold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2 px-2">Courses</h3>
                                                        <div className="space-y-1">
                                                            {results.results.courses.map((course: any) => (
                                                                <Link 
                                                                    key={course.id} 
                                                                    href={course.is_enrolled ? route('learn.show', course.slug) : route('courses.show', course.slug)}
                                                                    onClick={() => setSearchOpen(false)}
                                                                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors group"
                                                                >
                                                                    <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                                                                        <BookOpen className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 text-left">
                                                                        <div className="text-sm font-medium text-surface-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{course.title}</div>
                                                                        <div className="text-xs text-surface-500 truncate">{course.category}</div>
                                                                    </div>
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Lessons */}
                                                {results.results?.lessons?.length > 0 && (
                                                    <div>
                                                        <h3 className="text-[10px] font-bold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2 px-2">Lessons</h3>
                                                        <div className="space-y-1">
                                                            {results.results.lessons.map((lesson: any) => (
                                                                <Link 
                                                                    key={lesson.id} 
                                                                    href={route('learn.lesson', [lesson.course_slug, lesson.id])}
                                                                    onClick={() => setSearchOpen(false)}
                                                                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors group"
                                                                >
                                                                    <div className="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0">
                                                                        <PlayCircle className="w-4 h-4 text-surface-500" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 text-left">
                                                                        <div className="text-sm font-medium text-surface-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{lesson.title}</div>
                                                                        <div className="text-xs text-surface-500 truncate">{lesson.course_title}</div>
                                                                    </div>
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Discussions */}
                                                {results.results?.discussions?.length > 0 && (
                                                    <div>
                                                        <h3 className="text-[10px] font-bold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2 px-2">Discussions</h3>
                                                        <div className="space-y-1">
                                                            {results.results.discussions.map((thread: any) => (
                                                                <Link 
                                                                    key={thread.id} 
                                                                    href={route('discussions.show', thread.id)}
                                                                    onClick={() => setSearchOpen(false)}
                                                                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors group"
                                                                >
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${thread.is_solved ? 'bg-accent-50 dark:bg-accent-950 text-accent-600 dark:text-accent-400' : 'bg-surface-100 dark:bg-surface-800 text-surface-500'}`}>
                                                                        {thread.is_solved ? <CheckCircle2 className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 text-left">
                                                                        <div className="text-sm font-medium text-surface-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{thread.title}</div>
                                                                        <div className="text-xs text-surface-500 truncate">{thread.course_title}</div>
                                                                    </div>
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                )}
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
                {/* The extra bottom padding on mobile clears the tab bar. */}
                <div className={`max-w-[1200px] mx-auto w-full px-4 sm:px-6 lg:px-10 pt-[88px] overflow-x-hidden ${noScroll ? 'flex-1 flex flex-col min-h-0 pb-4' : 'pb-28 lg:pb-16'}`}>

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

            {/* ── Mobile tab bar ──────────────────────────────────
                The four places people move between constantly. Everything else
                stays in the drawer — a tab bar stops being useful the moment it
                becomes a second menu. */}
            <nav
                className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-surface-900/95 backdrop-blur border-t border-surface-200 dark:border-surface-800 pb-[env(safe-area-inset-bottom)]"
                aria-label="Primary"
            >
                <div className="flex items-stretch">
                    {navigation.map((item) => {
                        const active = isActive(item.href, item.exact);

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                                    active
                                        ? 'text-primary-600 dark:text-primary-400'
                                        : 'text-surface-500 dark:text-surface-400'
                                }`}
                            >
                                <span className="relative">
                                    <item.icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />

                                    {item.badge !== undefined && item.badge > 0 && (
                                        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1 min-w-[16px] h-4 rounded-full flex items-center justify-center">
                                            {item.badge > 9 ? '9+' : item.badge}
                                        </span>
                                    )}
                                </span>

                                {item.name}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
