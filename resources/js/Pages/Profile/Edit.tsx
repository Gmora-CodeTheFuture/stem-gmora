import { Head } from '@inertiajs/react';
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
