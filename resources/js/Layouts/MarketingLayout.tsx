import { Link, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { PropsWithChildren, useState } from 'react';
import { Menu, X, Search } from 'lucide-react';
import { PageProps } from '@/types';

/**
 * The public shell. The menubar belongs to the homepage only — every other
 * page in the product navigates by the sidebar, and a signed-in user should
 * never meet a second navigation.
 */
export default function MarketingLayout({
    children,
    nav = false,
}: PropsWithChildren<{ nav?: boolean }>) {
    const { auth } = usePage<PageProps>().props;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Every entry must resolve — Programs, Mentorship and Community sat here
    // pointing at routes that were never built, so the main navigation of the
    // public site served three 404s.
    const navLinks = [
        { name: 'What is STEM', href: '/#stem' },
        { name: 'Our vision', href: '/#vision' },
        { name: 'Courses', href: '/courses' },
        { name: 'Blog', href: '/blog' },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-white text-surface-900 font-sans">
            {/* ── Navigation ────────────────────────────────────── */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-surface-200 h-16">
                <nav className="max-w-[1440px] mx-auto px-4 md:px-6 h-full flex items-center justify-between">
                    
                    {/* Left: Logo and Links */}
                    <div className="flex items-center gap-8 h-full">
                        <Link href="/" className="flex items-center">
                            <span className="text-2xl font-bold tracking-tighter text-[#1E3A8A]">gmora</span>
                        </Link>
                        
                        <div className={`items-center h-full ${nav ? 'hidden lg:flex' : 'hidden'}`}>
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className="px-4 h-full flex items-center text-sm font-semibold text-surface-600 hover:text-surface-900 hover:bg-surface-50 transition-colors border-b-2 border-transparent hover:border-surface-300"
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right: Search and Auth */}
                    <div className="hidden md:flex items-center gap-4">
                        <div className={`relative w-64 ${nav ? '' : 'hidden'}`}>
                            <Search className="w-4 h-4 text-surface-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                                type="text"
                                placeholder="Search"
                                className="w-full pl-9 pr-4 py-1.5 bg-white border border-surface-300 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-surface-900 focus:border-surface-900"
                            />
                        </div>

                        {auth?.user ? (
                            <Link href="/dashboard" className="px-5 py-1.5 rounded-full bg-surface-900 text-white text-sm font-bold hover:bg-surface-800 transition-colors">
                                Dashboard
                            </Link>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/login"
                                    className="px-4 py-1.5 text-sm font-bold text-surface-900 hover:bg-surface-50 rounded-full transition-colors"
                                >
                                    Sign In
                                </Link>
                                <Link 
                                    href="/register" 
                                    className="px-5 py-1.5 rounded-full bg-surface-900 text-white text-sm font-bold hover:bg-surface-800 transition-colors"
                                >
                                    Register
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Menu"
                        className={`p-2 rounded-lg text-surface-600 ${nav ? 'lg:hidden' : 'hidden'}`}
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </nav>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {nav && mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="lg:hidden bg-white border-b border-surface-200 absolute top-16 left-0 right-0"
                        >
                            <div className="px-4 py-4 space-y-2">
                                <div className="relative mb-4">
                                    <Search className="w-4 h-4 text-surface-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input 
                                        type="text"
                                        placeholder="Search"
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-surface-300 rounded-full text-sm focus:outline-none"
                                    />
                                </div>
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className="block px-4 py-3 rounded-lg text-sm font-bold text-surface-700 hover:bg-surface-50"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        {link.name}
                                    </Link>
                                ))}
                                <hr className="border-surface-200 my-2" />
                                {auth?.user ? (
                                    <Link href="/dashboard" className="block w-full text-center py-2.5 rounded-full bg-surface-900 text-white text-sm font-bold">
                                        Dashboard
                                    </Link>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        <Link href="/register" className="block w-full text-center py-2.5 rounded-full bg-surface-900 text-white text-sm font-bold">
                                            Register
                                        </Link>
                                        <Link href="/login" className="block w-full text-center py-2.5 rounded-full border border-surface-300 text-surface-900 text-sm font-bold">
                                            Sign In
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* ── Main Content ──────────────────────────────────── */}
            <main className="flex-1 pt-16">
                {children}
            </main>

            {/* ── Footer ────────────────────────────────────────── */}
            <footer className="bg-surface-900 text-white py-12 border-t-4 border-primary-500 mt-20">
                <div className="max-w-[1440px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center mb-4">
                            <span className="text-2xl font-bold tracking-tighter text-[#1E3A8A]">gmora</span>
                        </Link>
                        <p className="text-sm text-surface-400">
                            The World's STEM Education Platform. Learn, build, and innovate with us.
                        </p>
                    </div>
                    {/* Only destinations that exist. Careers, Terms and Privacy
                        were placeholders pointing at "#" — they belong here once
                        the pages are written, not before. */}
                    <div>
                        <h4 className="font-bold mb-4">Platform</h4>
                        <ul className="space-y-2 text-sm text-surface-400">
                            <li><Link href="/courses" className="hover:text-white">Courses</Link></li>
                            <li><Link href="/#stem" className="hover:text-white">What is STEM</Link></li>
                            <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Company</h4>
                        <ul className="space-y-2 text-sm text-surface-400">
                            <li><Link href="/#vision" className="hover:text-white">Our vision</Link></li>
                            <li><a href="mailto:hello@gmorastem.com" className="hover:text-white">Contact</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-4">Learners</h4>
                        <ul className="space-y-2 text-sm text-surface-400">
                            <li><Link href="/login" className="hover:text-white">Sign in</Link></li>
                            <li><Link href="/register" className="hover:text-white">Create an account</Link></li>
                        </ul>
                    </div>
                </div>
            </footer>
        </div>
    );
}
