import { Head, Link } from '@inertiajs/react';
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

            <div className="max-w-3xl space-y-5">
                <div className="card p-6 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <h2 className="text-base font-semibold text-surface-900 dark:text-white">Security</h2>
                        <p className="text-sm text-surface-500 mt-1">
                            Two-factor authentication and the devices signed in to your account.
                        </p>
                    </div>
                    <Link href={route('profile.security')} className="btn-secondary py-2">
                        Open security settings
                    </Link>
                </div>

                <div className="card p-7">
                    <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} />
                </div>

                <div className="card p-7">
                    <UpdatePasswordForm />
                </div>

                <div className="card p-7">
                    <DeleteUserForm />
                </div>
            </div>
        </DashboardLayout>
    );
}
