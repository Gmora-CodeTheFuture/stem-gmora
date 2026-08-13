import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}: {
    mustVerifyEmail: boolean;
    status?: string;
    className?: string;
}) {
    const user = usePage().props.auth.user;

        const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            full_name: user.full_name || '',
            email: user.email || '',
            bio: user.bio || '',
            headline: user.headline || '',
            github_url: user.github_url || '',
            linkedin_url: user.linkedin_url || '',
            website_url: user.website_url || '',
            is_public: user.is_public || false,
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-surface-900 dark:text-white">
                    Profile Information
                </h2>

                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                    Update your account's profile information and email address.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
                <div>
                    <InputLabel htmlFor="full_name" value="Name" />

                    <TextInput
                        id="full_name"
                        className="mt-1 block w-full"
                        value={data.full_name}
                        onChange={(e) => setData('full_name', e.target.value)}
                        required
                        isFocused
                        autoComplete="name"
                    />

                    <InputError className="mt-2" message={errors.full_name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        className="mt-1 block w-full"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                    />

                    <InputError className="mt-2" message={errors.email} />
                </div>

                <div>
                    <InputLabel htmlFor="headline" value="Headline" />
                    <TextInput
                        id="headline"
                        className="mt-1 block w-full"
                        value={data.headline}
                        onChange={(e) => setData('headline', e.target.value)}
                        placeholder="e.g. Aspiring Robotics Engineer"
                    />
                    <InputError className="mt-2" message={errors.headline} />
                </div>

                <div>
                    <InputLabel htmlFor="bio" value="Bio" />
                    <textarea
                        id="bio"
                        className="mt-1 block w-full border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 focus:border-primary-500 dark:focus:border-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600 rounded-md shadow-sm"
                        value={data.bio}
                        onChange={(e) => setData('bio', e.target.value)}
                        rows={4}
                        placeholder="Tell the community about yourself..."
                    ></textarea>
                    <InputError className="mt-2" message={errors.bio} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <InputLabel htmlFor="github_url" value="GitHub URL" />
                        <TextInput
                            id="github_url"
                            type="url"
                            className="mt-1 block w-full"
                            value={data.github_url}
                            onChange={(e) => setData('github_url', e.target.value)}
                            placeholder="https://github.com/username"
                        />
                        <InputError className="mt-2" message={errors.github_url} />
                    </div>

                    <div>
                        <InputLabel htmlFor="linkedin_url" value="LinkedIn URL" />
                        <TextInput
                            id="linkedin_url"
                            type="url"
                            className="mt-1 block w-full"
                            value={data.linkedin_url}
                            onChange={(e) => setData('linkedin_url', e.target.value)}
                            placeholder="https://linkedin.com/in/username"
                        />
                        <InputError className="mt-2" message={errors.linkedin_url} />
                    </div>
                    
                    <div className="md:col-span-2">
                        <InputLabel htmlFor="website_url" value="Personal Website" />
                        <TextInput
                            id="website_url"
                            type="url"
                            className="mt-1 block w-full"
                            value={data.website_url}
                            onChange={(e) => setData('website_url', e.target.value)}
                            placeholder="https://yourportfolio.com"
                        />
                        <InputError className="mt-2" message={errors.website_url} />
                    </div>
                </div>

                <div className="block mt-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            name="is_public"
                            checked={data.is_public}
                            onChange={(e) => setData('is_public', e.target.checked)}
                            className="rounded dark:bg-surface-900 border-surface-300 dark:border-surface-700 text-primary-600 shadow-sm focus:ring-primary-500 dark:focus:ring-primary-600 dark:focus:ring-offset-surface-800"
                        />
                        <span className="ms-2 text-sm text-surface-600 dark:text-surface-400">Make my portfolio page public to everyone</span>
                    </label>
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <p className="mt-2 text-sm text-surface-800 dark:text-surface-100">
                            Your email address is unverified.
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="rounded-md text-sm text-surface-500 dark:text-surface-400 underline hover:text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                            >
                                Click here to re-send the verification email.
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2 text-sm font-medium text-green-600">
                                A new verification link has been sent to your
                                email address.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>Save</PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-surface-500 dark:text-surface-400">
                            Saved.
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
