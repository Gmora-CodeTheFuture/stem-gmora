import { Head, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Award, BookOpen, Users, ArrowRight, PlayCircle, Sigma, Cpu, FlaskConical, Wrench
} from 'lucide-react';
import { ParallaxComponent } from '@/Components/ui/parallax-scrolling';

interface HomeContent {
    hero: { badge: string; title: string; highlight: string; subtitle: string; primary_cta: string; secondary_cta: string };
    stem: { title: string; body: string; science: string; technology: string; engineering: string; maths: string };
    vision: { title: string; body: string; point_one: string; point_two: string; point_three: string };
    contact: { email: string; support_email: string; location: string };
    cta: { title: string; subtitle: string; button: string };
}

interface Props {
    content: HomeContent;
    figures: { courses: number; lessons: number; learners: number; certificates: number };
}

export default function Welcome({ content, figures }: Props) {
    const [isNavVisible, setIsNavVisible] = useState(true);
    const [navTheme, setNavTheme] = useState<'light'|'dark'>('dark');

    useEffect(() => {
        let scrollTimeout: NodeJS.Timeout;
        const handleScroll = () => {
            // Check if at the very top, keep it visible
            if (window.scrollY < 50) {
                setIsNavVisible(true);
                return;
            }
            setIsNavVisible(false);
            clearTimeout(scrollTimeout);
            
            scrollTimeout = setTimeout(() => {
                setIsNavVisible(true);
            }, 150);
        };

        window.addEventListener('scroll', handleScroll);

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const theme = entry.target.getAttribute('data-theme');
                    if (theme) setNavTheme(theme as 'light' | 'dark');
                }
            });
        }, { rootMargin: '-64px 0px -80% 0px' });

        document.querySelectorAll('[data-theme]').forEach(el => observer.observe(el));

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(scrollTimeout);
            observer.disconnect();
        };
    }, []);

    const stats = [
        { value: figures.courses, label: 'COURSES', icon: BookOpen },
        { value: figures.lessons, label: 'LESSONS', icon: PlayCircle },
        { value: figures.learners, label: 'LEARNERS', icon: Users },
        { value: figures.certificates, label: 'CERTIFICATES', icon: Award },
    ];

    const disciplines = [
        { letter: 'S', name: 'Science', body: content.stem.science, icon: FlaskConical },
        { letter: 'T', name: 'Technology', body: content.stem.technology, icon: Cpu },
        { letter: 'E', name: 'Engineering', body: content.stem.engineering, icon: Wrench },
        { letter: 'M', name: 'Mathematics', body: content.stem.maths, icon: Sigma },
    ];

    const navClasses = navTheme === 'dark' 
        ? 'bg-black/90 border-white/10 text-white' 
        : 'bg-white border-black/10 text-black/70';
        
    const logoSrc = navTheme === 'dark' ? '/logo-dark.svg' : '/logo.svg';
    const linkHoverClass = navTheme === 'dark' ? 'hover:text-white/70' : 'hover:text-black';
    const buttonClass = navTheme === 'dark'
        ? 'bg-white text-black hover:bg-white/80'
        : 'bg-[#0a0a0a] text-white hover:bg-black/80';

    return (
        <div className="min-h-screen bg-black text-black selection:bg-black selection:text-white font-sans relative overflow-hidden">
            <Head title="Gmora STEM — The Great Expanse" />
            
            <header className={`fixed top-0 left-0 w-full z-50 border-b backdrop-blur-md transition-all duration-500 ${navClasses} ${isNavVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between font-sans text-sm uppercase tracking-widest">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center">
                            <img src={logoSrc} alt="Gmora STEM" className="h-12 w-auto object-contain transition-opacity duration-300" />
                        </Link>
                        <nav className="hidden md:flex gap-6">
                            <Link href="#stem" className={`transition-colors duration-300 ${linkHoverClass}`}>Curriculum</Link>
                            <Link href="#vision" className={`transition-colors duration-300 ${linkHoverClass}`}>Directives</Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/login" className={`transition-colors duration-300 ${linkHoverClass}`}>Sys Login</Link>
                        <Link href="/register" className={`px-4 py-1.5 transition-colors duration-300 font-bold ${buttonClass}`}>
                            Initialize
                        </Link>
                    </div>
                </div>
            </header>

            {/* Global Grid Background for content below hero */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-40 bg-grid-pattern"></div>

            <main className="relative z-10 pt-16">
                <div data-theme="dark" className="absolute top-0 left-0 w-full h-[100vh] pointer-events-none"></div>
                <ParallaxComponent>
                    {/* The rest of the page sits inside ParallaxComponent so it flows below the visual layers */}
                    <div className="bg-white">
                        
                        {/* ── Brutalist Call to Action inside Hero spacing ────────────────── */}
                        <div data-theme="dark" className="bg-black text-white w-full border-b border-white/10 relative z-10">
                            <div className="max-w-[1440px] mx-auto px-6 py-20 relative z-10">
                                <div className="max-w-4xl">
                                    <div className="flex items-center gap-4 mb-8 text-white/40">
                                    <svg width="120" height="30" viewBox="0 0 120 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0 15H20L30 5L40 25L50 15H120" stroke="currentColor" strokeWidth="1" />
                                        <circle cx="30" cy="5" r="2" fill="currentColor" />
                                        <circle cx="40" cy="25" r="2" fill="currentColor" />
                                    </svg>
                                    <span className="font-sans text-xs tracking-[0.2em]">{content.hero.badge}</span>
                                </div>

                                <h1 className="font-sans text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-[0.85] mb-8">
                                    Master <span className="text-outline">The Future</span><br/>
                                    With STEM <span className="text-outline">Education</span>
                                </h1>

                                <p className="font-sans text-sm md:text-base text-white/60 max-w-xl leading-relaxed mb-12 border-l border-white/20 pl-4">
                                    {content.hero.subtitle}
                                </p>

                                <div className="flex flex-wrap items-center gap-6 font-sans font-bold uppercase tracking-wider text-sm">
                                    <Link href="/register" className="bg-white text-black px-8 py-4 hover:bg-white/80 transition-colors">
                                        {content.hero.primary_cta}
                                    </Link>
                                    <Link href="/courses" className="relative px-8 py-4 text-white hover:text-white/70 transition-colors group">
                                        <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white group-hover:border-white/50 transition-colors"></span>
                                        <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white group-hover:border-white/50 transition-colors"></span>
                                        <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white group-hover:border-white/50 transition-colors"></span>
                                        <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white group-hover:border-white/50 transition-colors"></span>
                                        {content.hero.secondary_cta}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                        {/* ── Figures ────────────────── */}
                        <section data-theme="light" className="bg-white/50 backdrop-blur-sm relative z-10">
                            <div className="max-w-[1440px] mx-auto grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/10">
                                {stats.map((stat, i) => (
                                    <div key={stat.label} className="p-8 md:p-12 flex flex-col relative group bg-white">
                                        <span className="font-sans text-xs text-black/40 mb-8 tracking-widest">SEC_0{i + 1}</span>
                                        <div className="mt-auto">
                                            <div className="font-sans text-4xl md:text-5xl font-bold mb-2 tabular-nums">
                                                {stat.value}
                                            </div>
                                            <div className="font-sans text-xs tracking-[0.15em] text-black/60 uppercase">
                                                {stat.label}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* ── What STEM is (Technical Grid) ─────────────────── */}
                        <section data-theme="light" id="stem" className="py-32 relative z-10 border-y border-black/10 bg-white/80 backdrop-blur-sm">
                            <div className="max-w-[1440px] mx-auto px-6">
                                <div className="max-w-2xl mb-20">
                                    <h2 className="font-sans text-3xl md:text-5xl font-bold uppercase tracking-tight mb-6">
                                        {content.stem.title}
                                    </h2>
                                    <p className="font-sans text-sm text-black/60 leading-relaxed border-l border-black/20 pl-4">
                                        {content.stem.body}
                                    </p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-px bg-black/10 border border-black/10">
                                    {disciplines.map((d, i) => (
                                        <div key={d.name} className="bg-white p-8 md:p-12 group hover:bg-black transition-colors duration-500 relative overflow-hidden">
                                            <div 
                                                className="font-sans text-[120px] leading-none font-bold text-transparent opacity-10 mb-6 group-hover:opacity-20 transition-all duration-500 z-0 stem-letter"
                                            >
                                                {d.letter}
                                            </div>
                                            <div className="relative z-10">
                                                <h3 className="font-sans text-xl md:text-2xl font-bold uppercase tracking-wide mb-4 text-black group-hover:text-white transition-colors duration-500">
                                                    {d.name}
                                                </h3>
                                                <p className="font-sans text-sm text-black/50 group-hover:text-white/60 leading-relaxed transition-colors duration-500">
                                                    {d.body}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* ── Closing CTA ──────────────────────────────── */}
                        <section data-theme="light" className="py-32 relative z-10 bg-white">
                            <div className="max-w-4xl mx-auto px-6 flex flex-col items-center text-center">
                                <h2 className="font-sans text-5xl md:text-6xl font-bold uppercase tracking-tight mb-8">
                                    {content.cta.title}
                                </h2>
                                <p className="font-sans text-base text-black/60 max-w-xl mx-auto mb-12 leading-relaxed">
                                    {content.cta.subtitle}
                                </p>
                                
                                <Link href="/register" className="font-sans uppercase tracking-widest font-bold bg-[#0a0a0a] text-white px-12 py-5 flex items-center gap-4 hover:bg-black/90 transition-all hover:scale-105 duration-300">
                                    {content.cta.button}
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                            </div>
                        </section>

                        {/* ── Footer ──────────────────────────────── */}
                        <footer data-theme="dark" className="bg-black text-white pt-20 pb-12 relative z-10 border-t border-white/10">
                            <div className="max-w-[1440px] mx-auto px-6">
                                <div className="grid md:grid-cols-2 gap-12 border-b border-white/10 pb-12 mb-12">
                                    <div>
                                        <img src="/logo-dark.svg" alt="Gmora STEM" className="h-16 w-auto mb-6" />
                                        <p className="font-sans text-sm text-white/50 max-w-sm leading-relaxed">
                                            Gmora STEM is a premier educational platform dedicated to advancing the future of science, technology, engineering, and mathematics.
                                        </p>
                                    </div>
                                    <div className="flex flex-col md:items-end justify-center font-sans text-xs text-white/40 tracking-widest uppercase space-y-4">
                                        <span className="flex items-center gap-3">
                                            {content.contact.email}
                                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        </span>
                                        <span className="flex items-center gap-3">
                                            {content.contact.support_email}
                                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        </span>
                                        <span className="flex items-center gap-3">
                                            {content.contact.location}
                                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 font-sans text-xs text-white/40 tracking-widest uppercase">
                                    <span>© {new Date().getFullYear()} Gmora. All rights reserved.</span>
                                    <div className="flex gap-8">
                                        <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
                                        <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
                                    </div>
                                </div>
                            </div>
                        </footer>

                    </div>
                </ParallaxComponent>
            </main>
        </div>
    );
}
