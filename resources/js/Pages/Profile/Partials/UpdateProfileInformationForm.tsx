import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Check, Github, Globe, Linkedin } from 'lucide-react';
import { FormEventHandler } from 'react';

function FieldHint({ children }: { children: React.ReactNode }) {
    return <p className="mt-1.5 text-xs text-surface-500 dark:text-surface-400 leading-relaxed">{children}</p>;
}

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
    const initial = user.full_name?.trim()?.charAt(0)?.toUpperCase() || '?';

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
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
        patch(route('profile.update'), { preserveScroll: true });
    };

    return (
        <section className={className}>
            <div className="px-6 sm:px-7 pt-6 sm:pt-7 pb-5 border-b border-surface-100 dark:border-surface-800">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary-600 text-white flex items-center justify-center text-xl font-semibold shrink-0 shadow-sm">
                        {user.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt=""
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            initial
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                            Your profile
                        </h2>
                        <p className="mt-1 text-sm text-surface-600 dark:text-surface-300">
                            This is how you appear across courses, discussions, and your portfolio.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={submit}>
                <div className="px-6 sm:px-7 py-6 space-y-8">
                    <fieldset className="space-y-4">
                        <legend className="text-sm font-semibold text-surface-900 dark:text-white mb-1">
                            Account
                        </legend>
                        <p className="text-xs text-surface-500 dark:text-surface-400 -mt-1 mb-3">
                            Used for login and certificates.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="full_name" value="Full name" />
                                <TextInput
                                    id="full_name"
                                    className="mt-1.5 block w-full"
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
                                    className="mt-1.5 block w-full"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                    autoComplete="username"
                                />
                                <InputError className="mt-2" message={errors.email} />
                            </div>
                        </div>

                        {mustVerifyEmail && user.email_verified_at === null && (
                            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
                                <p className="text-sm text-amber-900 dark:text-amber-100">
                                    Your email is unverified.{' '}
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="font-medium underline underline-offset-2 hover:no-underline"
                                    >
                                        Resend verification email
                                    </Link>
                                </p>
                                {status === 'verification-link-sent' && (
                                    <p className="mt-1.5 text-sm font-medium text-green-700 dark:text-green-400">
                                        A new link was sent to your inbox.
                                    </p>
                                )}
                            </div>
                        )}
                    </fieldset>

                    <fieldset className="space-y-4">
                        <legend className="text-sm font-semibold text-surface-900 dark:text-white mb-1">
                            About you
                        </legend>
                        <p className="text-xs text-surface-500 dark:text-surface-400 -mt-1 mb-3">
                            Optional — shown on your public portfolio when enabled.
                        </p>

                        <div>
                            <InputLabel htmlFor="headline" value="Headline" />
                            <TextInput
                                id="headline"
                                className="mt-1.5 block w-full"
                                value={data.headline}
                                onChange={(e) => setData('headline', e.target.value)}
                                placeholder="e.g. Aspiring Robotics Engineer"
                            />
                            <FieldHint>A short line under your name — role, focus, or goal.</FieldHint>
                            <InputError className="mt-2" message={errors.headline} />
                        </div>

                        <div>
                            <InputLabel htmlFor="bio" value="Bio" />
                            <textarea
                                id="bio"
                                className="mt-1.5 block w-full input min-h-[7rem] resize-y"
                                value={data.bio}
                                onChange={(e) => setData('bio', e.target.value)}
                                rows={4}
                                placeholder="Tell the community about yourself..."
                            />
                            <FieldHint>A few sentences about your interests and learning goals.</FieldHint>
                            <InputError className="mt-2" message={errors.bio} />
                        </div>
                    </fieldset>

                    <fieldset className="space-y-4">
                        <legend className="text-sm font-semibold text-surface-900 dark:text-white mb-1">
                            Links
                        </legend>
                        <p className="text-xs text-surface-500 dark:text-surface-400 -mt-1 mb-3">
                            Optional profiles and portfolio links.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="github_url" value="GitHub" />
                                <div className="relative mt-1.5">
                                    <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                                    <TextInput
                                        id="github_url"
                                        type="url"
                                        className="block w-full !pl-10"
                                        value={data.github_url}
                                        onChange={(e) => setData('github_url', e.target.value)}
                                        placeholder="https://github.com/username"
                                    />
                                </div>
                                <InputError className="mt-2" message={errors.github_url} />
                            </div>

                            <div>
                                <InputLabel htmlFor="linkedin_url" value="LinkedIn" />
                                <div className="relative mt-1.5">
                                    <Linkedin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                                    <TextInput
                                        id="linkedin_url"
                                        type="url"
                                        className="block w-full !pl-10"
                                        value={data.linkedin_url}
                                        onChange={(e) => setData('linkedin_url', e.target.value)}
                                        placeholder="https://linkedin.com/in/username"
                                    />
                                </div>
                                <InputError className="mt-2" message={errors.linkedin_url} />
                            </div>

                            <div className="sm:col-span-2">
                                <InputLabel htmlFor="website_url" value="Website" />
                                <div className="relative mt-1.5">
                                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                                    <TextInput
                                        id="website_url"
                                        type="url"
                                        className="block w-full !pl-10"
                                        value={data.website_url}
                                        onChange={(e) => setData('website_url', e.target.value)}
                                        placeholder="https://yourportfolio.com"
                                    />
                                </div>
                                <InputError className="mt-2" message={errors.website_url} />
                            </div>
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend className="text-sm font-semibold text-surface-900 dark:text-white mb-3">
                            Visibility
                        </legend>
                        <label className="flex items-start gap-3 rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-900/50 px-4 py-3.5 cursor-pointer hover:border-surface-300 dark:hover:border-surface-600 transition-colors">
                            <input
                                type="checkbox"
                                name="is_public"
                                checked={data.is_public}
                                onChange={(e) => setData('is_public', e.target.checked)}
                                className="mt-0.5 rounded border-surface-300 dark:border-surface-600 dark:bg-surface-900 text-primary-600 shadow-sm focus:ring-primary-500"
                            />
                            <span className="min-w-0">
                                <span className="block text-sm font-medium text-surface-900 dark:text-white">
                                    Public portfolio
                                </span>
                                <span className="block text-xs text-surface-600 dark:text-surface-300 mt-0.5 leading-relaxed">
                                    Anyone with the link can view your profile page. Turn off to keep it private.
                                </span>
                            </span>
                        </label>
                    </fieldset>
                </div>

                <div className="sticky bottom-0 px-6 sm:px-7 py-4 border-t border-surface-100 dark:border-surface-800 bg-white/95 dark:bg-surface-900/95 backdrop-blur-sm flex items-center gap-3 flex-wrap">
                    <button type="submit" className="btn-primary" disabled={processing}>
                        {processing ? 'Saving…' : 'Save profile'}
                    </button>
                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out duration-150"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out duration-150"
                        leaveTo="opacity-0"
                    >
                        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400">
                            <Check className="w-4 h-4" />
                            Saved
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
