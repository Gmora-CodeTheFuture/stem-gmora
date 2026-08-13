import { Link, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { PropsWithChildren, useState, useEffect } from 'react';
import { Menu, X, ChevronDown, GraduationCap, Moon, Sun } from 'lucide-react';
import { PageProps } from '@/types';

export default function MarketingLayout({ children }: PropsWithChildren) {
    const { auth } = usePage<PageProps>().props;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        setIsDark(!isDark);
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
    };

    const navLinks = [
        { name: 'Courses', href: '/courses' },
        { name: 'About', href: '/about' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'Blog', href: '/blog' },
        { name: 'Contact', href: '/contact' },
    ];

    return (
        <div className="min-h-screen flex flex-col">
            {/* ── Navigation ────────────────────────────────────── */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                    scrolled
                        ? 'bg-white/90 dark:bg-surface-950/90 backdrop-blur-xl shadow-sm border-b border-surface-200/50 dark:border-surface-800/50'
                        : 'bg-transparent'
                }`}
            >
                <nav className="container-wide flex items-center justify-between h-16 md:h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-shadow duration-300">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-bold font-display text-surface-900 dark:text-white leading-tight">
                                Gmora
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-500">
                                STEM
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-all duration-200"
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    {/* Right Actions */}
                    <div className="hidden md:flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-xl text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200"
                            aria-label="Toggle theme"
                        >
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>

                        {auth?.user ? (
                            <Link href="/dashboard" className="btn-primary text-sm">
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200"
                                >
                                    Sign in
                                </Link>
                                <Link href="/register" className="btn-primary text-sm">
                                    Get Started Free
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg text-surface-600 dark:text-surface-400"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </nav>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden bg-white dark:bg-surface-950 border-t border-surface-200 dark:border-surface-800"
                        >
                            <div className="container-wide py-4 space-y-2">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className="block px-4 py-3 rounded-xl text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-primary-50 dark:hover:bg-primary-950/50"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        {link.name}
                                    </Link>
                                ))}
                                <hr className="border-surface-200 dark:border-surface-700" />
                                <div className="flex flex-col gap-2 pt-2">
                                    {auth?.user ? (
                                        <Link href="/dashboard" className="btn-primary text-sm text-center">
                                            Dashboard
                                        </Link>
                                    ) : (
                                        <>
                                            <Link href="/login" className="btn-secondary text-sm text-center">
                                                Sign in
                                            </Link>
                                            <Link href="/register" className="btn-primary text-sm text-center">
                                                Get Started Free
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* ── Main Content ──────────────────────────────────── */}
            <main className="flex-1 pt-16 md:pt-20">
                {children}
            </main>

            {/* ── Footer ────────────────────────────────────────── */}
            <footer className="bg-surface-900 dark:bg-surface-950 text-surface-300 border-t border-surface-800">
                <div className="container-wide section pb-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
                        {/* Brand */}
                        <div className="col-span-2 md:col-span-1">
                            <Link href="/" className="flex items-center gap-2.5 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
                                    <GraduationCap className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold font-display text-white leading-tight">Gmora</span>
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-400">STEM</span>
                                </div>
                            </Link>
                            <p className="text-sm text-surface-400 leading-relaxed max-w-xs">
                                Empowering the next generation of innovators through accessible, world-class STEM education.
                            </p>
                        </div>

                        {/* Platform */}
                        <div>
                            <h4 className="text-sm font-semibold text-white mb-4">Platform</h4>
                            <ul className="space-y-3">
                                {['Courses', 'Pricing', 'Certificates', 'Live Classes'].map((item) => (
                                    <li key={item}>
                                        <Link href="#" className="text-sm text-surface-400 hover:text-primary-400 transition-colors duration-200">
                                            {item}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Company */}
                        <div>
                            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
                            <ul className="space-y-3">
                                {['About Us', 'Blog', 'Careers', 'Contact'].map((item) => (
                                    <li key={item}>
                                        <Link href="#" className="text-sm text-surface-400 hover:text-primary-400 transition-colors duration-200">
                                            {item}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Legal */}
                        <div>
                            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
                            <ul className="space-y-3">
                                {['Privacy Policy', 'Terms of Service', 'Refund Policy', 'Cookie Policy'].map((item) => (
                                    <li key={item}>
                                        <Link href="#" className="text-sm text-surface-400 hover:text-primary-400 transition-colors duration-200">
                                            {item}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-surface-800 gap-4">
                        <p className="text-sm text-surface-500">
                            &copy; {new Date().getFullYear()} Gmora STEM. All rights reserved.
                        </p>
                        <div className="flex items-center gap-4">
                            <button onClick={toggleTheme} className="text-surface-500 hover:text-surface-300 transition-colors">
                                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
