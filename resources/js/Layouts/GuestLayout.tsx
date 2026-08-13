import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';
import { GraduationCap } from 'lucide-react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-surface-50 dark:bg-surface-950">
            <Link href="/" className="flex items-center gap-2.5 mb-8">
                <span className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" />
                </span>
                <span className="text-xl font-semibold text-surface-900 dark:text-white">Gmora</span>
            </Link>

            <div className="w-full sm:max-w-md card p-7">{children}</div>

            <p className="text-xs text-surface-400 mt-6">Learn. Build. Innovate.</p>
        </div>
    );
}
