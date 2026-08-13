import { Head, useForm, Link } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import { PageProps, User, Role } from '@/types';
import { FormEventHandler } from 'react';

interface Props extends PageProps {
    targetUser: User;
    roles: Role[];
}

export default function EditUser({ targetUser, roles }: Props) {
    const { data, setData, patch, errors, processing } = useForm({
        full_name: targetUser.full_name,
        email: targetUser.email,
        role_id: targetUser.role_id,
        bio: targetUser.bio || '',
        headline: (targetUser as any).headline || '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(`/admin/users/${targetUser.id}`);
    };

    return (
        <DashboardLayout>
            <Head title={`Edit ${targetUser.full_name} — Admin`} />

            <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <Link href="/admin/users" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">← Users</Link>
                    <span className="text-surface-400">/</span>
                    <h1 className="text-xl font-semibold text-surface-900 dark:text-white">Edit {targetUser.full_name}</h1>
                </div>

                <div className="card p-7">
                    <form onSubmit={submit} className="space-y-6">
                        <div>
                            <InputLabel htmlFor="full_name" value="Full Name" />
                            <TextInput id="full_name" className="mt-1 block w-full" value={data.full_name}
                                onChange={(e) => setData('full_name', e.target.value)} required />
                            <InputError className="mt-2" message={errors.full_name} />
                        </div>

                        <div>
                            <InputLabel htmlFor="email" value="Email" />
                            <TextInput id="email" type="email" className="mt-1 block w-full" value={data.email}
                                onChange={(e) => setData('email', e.target.value)} required />
                            <InputError className="mt-2" message={errors.email} />
                        </div>

                        <div>
                            <InputLabel htmlFor="role_id" value="Role" />
                            <select
                                id="role_id"
                                value={data.role_id}
                                onChange={(e) => setData('role_id', e.target.value)}
                                className="mt-1 block w-full border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 focus:border-primary-500 dark:focus:border-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600 rounded-md shadow-sm"
                            >
                                {roles.map((role) => (
                                    <option key={role.id} value={role.id}>{role.display_name}</option>
                                ))}
                            </select>
                            <InputError className="mt-2" message={errors.role_id} />
                        </div>

                        <div>
                            <InputLabel htmlFor="headline" value="Headline" />
                            <TextInput id="headline" className="mt-1 block w-full" value={data.headline}
                                onChange={(e) => setData('headline', e.target.value)}
                                placeholder="e.g. Senior Instructor" />
                        </div>

                        <div>
                            <InputLabel htmlFor="bio" value="Bio" />
                            <textarea
                                id="bio"
                                className="mt-1 block w-full border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 focus:border-primary-500 dark:focus:border-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600 rounded-md shadow-sm"
                                value={data.bio}
                                onChange={(e) => setData('bio', e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <PrimaryButton disabled={processing}>Save Changes</PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
