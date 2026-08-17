import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';
import { BookOpen, Clock, Award } from 'lucide-react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen flex bg-black">
            {/* Left Panel */}
            <div className="hidden lg:flex lg:w-[45%] bg-black text-white p-12 flex-col relative overflow-hidden">
                {/* Header/Logo */}
                <div className="relative z-10">
                    <img src="/logo-dark.svg" alt="Gmora STEM" className="h-12 w-auto object-contain block" />
                </div>

                {/* Hero Robot Background */}
                <img src="/images/robot_solid.png" alt="Hero Robot" className="absolute inset-0 m-auto w-3/4 h-3/4 object-contain object-center z-0 pointer-events-none" />
            </div>

            {/* Right Panel */}
            <div className="w-full lg:w-[55%] flex items-center justify-center p-8 bg-black">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>
        </div>
    );
}
