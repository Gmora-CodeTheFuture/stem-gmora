import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';
import { BookOpen, Clock, Award } from 'lucide-react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen flex bg-surface-50 dark:bg-surface-950">
            {/* Left Panel */}
            <div className="hidden lg:flex lg:w-[45%] bg-[#1E3A8A] text-white p-12 flex-col justify-between relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10">
                    {/* Header/Logo */}
                    <div className="flex items-center gap-2 mb-12">
                        <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                        </div>
                        <span className="font-bold tracking-widest text-sm uppercase">Gmora</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/20 text-[10px] font-bold tracking-wider mb-6 bg-white/5 uppercase">
                        <span className="text-orange-400">★</span> Transforming STEM Education
                    </div>

                    <h1 className="text-5xl lg:text-6xl font-bold mb-6 tracking-tight leading-tight">
                        GMORA <span className="text-white/60">STEM</span>
                    </h1>

                    <p className="text-white/80 text-lg max-w-md mb-12 leading-relaxed">
                        Hands-on learning experiences with cutting-edge technology that prepare students for the future of innovation.
                    </p>

                    <div className="space-y-8">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                <BookOpen className="w-5 h-5 text-white/90" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-0.5">Expert STEM Courses</h3>
                                <p className="text-sm text-white/60">Science, Technology, Engineering & more</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                <Clock className="w-5 h-5 text-white/90" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-0.5">Learn at your own pace</h3>
                                <p className="text-sm text-white/60">Lifetime access with certificate on completion</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                <Award className="w-5 h-5 text-white/90" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-0.5">Accredited Programs</h3>
                                <p className="text-sm text-white/60">Industry-recognised STEM certifications</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 mt-12 flex items-center gap-4">
                    <div className="flex -space-x-2">
                        <div className="w-9 h-9 rounded-full border-2 border-[#1E3A8A] flex items-center justify-center text-[10px] font-bold bg-white/20">KM</div>
                        <div className="w-9 h-9 rounded-full border-2 border-[#1E3A8A] flex items-center justify-center text-[10px] font-bold bg-white/20">PR</div>
                        <div className="w-9 h-9 rounded-full border-2 border-[#1E3A8A] flex items-center justify-center text-[10px] font-bold bg-white/20">TW</div>
                    </div>
                    <div>
                        <p className="text-sm italic text-white/90 font-medium">"Best investment I made this year."</p>
                        <p className="text-xs text-white/50 mt-0.5">— Kavindu M.</p>
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div className="w-full lg:w-[55%] flex items-center justify-center p-8 bg-white dark:bg-surface-950">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>
        </div>
    );
}
