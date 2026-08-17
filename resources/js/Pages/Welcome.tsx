import { Head, Link } from '@inertiajs/react';
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

    return (
        <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white font-sans relative overflow-hidden">
            <Head title="Gmora STEM — The Great Expanse" />
            
            <header className="absolute top-0 left-0 w-full z-50 border-b border-black/10 bg-white/80 backdrop-blur-md">
                <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between font-sans text-sm uppercase tracking-widest text-black/70">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="font-sans text-black font-bold text-xl tracking-normal normal-case">
                            GMORA.STEM
                        </Link>
                        <nav className="hidden md:flex gap-6">
                            <Link href="#stem" className="hover:text-black transition-colors">Curriculum</Link>
                            <Link href="#vision" className="hover:text-black transition-colors">Directives</Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/login" className="hover:text-black transition-colors">Sys Login</Link>
                        <Link href="/register" className="bg-[#0a0a0a] text-white px-4 py-1.5 hover:bg-black/80 transition-colors font-bold">
                            Initialize
                        </Link>
                    </div>
                </div>
            </header>

            {/* Global Grid Background for content below hero */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-40 bg-grid-pattern"></div>

            <main className="relative z-10 pt-16">
                <ParallaxComponent>
                    {/* The rest of the page sits inside ParallaxComponent so it flows below the visual layers */}
                    <div className="bg-white">
                        
                        {/* ── Brutalist Call to Action inside Hero spacing ────────────────── */}
                        <div className="bg-black text-white w-full border-b border-white/10 relative z-10">
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
                        <section className="bg-white/50 backdrop-blur-sm relative z-10">
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
                        <section id="stem" className="py-32 relative z-10 border-y border-black/10 bg-white/80 backdrop-blur-sm">
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
                                        <div key={d.name} className="bg-white p-8 md:p-12 group hover:bg-black/[0.02] transition-colors relative">
                                            <div className="absolute top-4 right-4 font-sans text-[10px] text-black/30 tracking-widest">
                                                DATA.{d.letter}
                                            </div>
                                            <div className="font-sans text-7xl font-bold text-outline opacity-20 mb-6 group-hover:opacity-40 transition-opacity">
                                                {d.letter}
                                            </div>
                                            <h3 className="font-sans text-xl md:text-2xl font-bold uppercase tracking-wide mb-4">
                                                {d.name}
                                            </h3>
                                            <p className="font-sans text-sm text-black/50 leading-relaxed">
                                                {d.body}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* ── Closing Terminal ──────────────────────────────── */}
                        <section className="py-32 relative z-10 bg-white">
                            <div className="max-w-[1440px] mx-auto px-6">
                                <div className="border border-black/20 p-1 md:p-2 bg-white/50 backdrop-blur-md max-w-4xl mx-auto">
                                    <div className="border border-black/10 p-8 md:p-16 flex flex-col items-center text-center relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-8 border-b border-black/10 bg-black/5 flex items-center px-4">
                                            <div className="flex gap-2">
                                                <div className="w-2 h-2 bg-black/20"></div>
                                                <div className="w-2 h-2 bg-black/20"></div>
                                                <div className="w-2 h-2 bg-black/20"></div>
                                            </div>
                                        </div>
                                        
                                        <h2 className="font-sans text-4xl md:text-5xl font-bold uppercase tracking-tight mt-12 mb-6">
                                            {content.cta.title}
                                        </h2>
                                        <p className="font-sans text-sm text-black/60 max-w-xl mx-auto mb-10">
                                            {content.cta.subtitle}
                                        </p>
                                        
                                        <Link href="/register" className="font-sans uppercase tracking-widest font-bold bg-[#0a0a0a] text-white px-10 py-4 flex items-center gap-4 hover:bg-black/90 transition-colors">
                                            {content.cta.button}
                                            <ArrowRight className="w-5 h-5" />
                                        </Link>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-center gap-8 mt-20 font-sans text-xs text-black/40 tracking-widest uppercase">
                                    <span className="flex items-center gap-2">
                                        <span className="w-1 h-1 bg-black/40 rounded-full"></span>
                                        {content.contact.email}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <span className="w-1 h-1 bg-black/40 rounded-full"></span>
                                        {content.contact.support_email}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <span className="w-1 h-1 bg-black/40 rounded-full"></span>
                                        {content.contact.location}
                                    </span>
                                </div>
                            </div>
                        </section>

                    </div>
                </ParallaxComponent>
            </main>
        </div>
    );
}
