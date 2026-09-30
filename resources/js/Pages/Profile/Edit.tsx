import { Head, Link } from '@inertiajs/react';
import { ChevronRight, Shield } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <DashboardLayout header="Settings">
            <Head title="Settings — Gmora STEM" />

            <div className="max-w-3xl">
                <p className="mb-8 text-sm text-surface-600 dark:text-surface-300">
                    Manage your profile, password, and account security.
                </p>

                <div className="space-y-6">
                    <Link
                        href={route('profile.security')}
                        className="card p-5 flex items-center gap-4 hover:border-primary-300 dark:hover:border-primary-700 transition-colors group"
                    >
                        <span className="w-11 h-11 rounded-2xl bg-primary-50 dark:bg-primary-950 flex items-center justify-center shrink-0">
                            <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </span>
                        <span className="flex-1 min-w-0">
                            <span className="block text-base font-semibold text-surface-900 dark:text-white">
                                Security
                            </span>
                            <span className="block text-sm text-surface-600 dark:text-surface-300 mt-0.5">
                                Two-factor authentication and signed-in devices
                            </span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 shrink-0">
                            Open
                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                        </span>
                    </Link>

                    <div className="card overflow-hidden">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                        />
                    </div>

                    <div className="card p-6 sm:p-7">
                        <UpdatePasswordForm />
                    </div>

                    <div className="card p-6 sm:p-7 border-red-200/80 dark:border-red-900/50">
                        <DeleteUserForm />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
