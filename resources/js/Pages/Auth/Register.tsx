import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        full_name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Register" />

            <div className="mb-8">
                <h2 className="text-3xl font-bold text-surface-900 dark:text-white mb-2">Create an account</h2>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                    Sign up to start your STEM learning journey.
                </p>
            </div>

            <button type="button" className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm font-bold text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors mb-6">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
            </button>

            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-surface-200 dark:border-surface-800"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="bg-white dark:bg-surface-950 px-2 text-surface-400">or sign up with email</span>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div>
                    <InputLabel htmlFor="full_name" value="Full Name" className="font-bold mb-1.5" />

                    <TextInput
                        id="full_name"
                        name="full_name"
                        value={data.full_name}
                        className="mt-1 block w-full bg-transparent placeholder:text-surface-400"
                        autoComplete="name"
                        placeholder="John Doe"
                        isFocused={true}
                        onChange={(e) => setData('full_name', e.target.value)}
                        required
                    />

                    <InputError message={errors.full_name} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Email Address" className="font-bold mb-1.5" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full bg-transparent placeholder:text-surface-400"
                        autoComplete="username"
                        placeholder="you@example.com"
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <InputLabel htmlFor="password" value="Password" className="font-bold mb-1.5" />

                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="mt-1 block w-full bg-transparent placeholder:text-surface-400"
                            autoComplete="new-password"
                            placeholder="••••••••"
                            onChange={(e) => setData('password', e.target.value)}
                            required
                        />

                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel
                            htmlFor="password_confirmation"
                            value="Confirm"
                            className="font-bold mb-1.5"
                        />

                        <TextInput
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="mt-1 block w-full bg-transparent placeholder:text-surface-400"
                            autoComplete="new-password"
                            placeholder="••••••••"
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            required
                        />

                        <InputError
                            message={errors.password_confirmation}
                            className="mt-2"
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button 
                        type="submit" 
                        disabled={processing}
                        className="w-full flex items-center justify-center py-3 px-4 rounded-lg bg-[#1E3A8A] text-white font-bold hover:bg-[#152e75] transition-colors disabled:opacity-50"
                    >
                        Sign Up <span className="ml-2">→</span>
                    </button>
                </div>

                <div className="text-center text-sm text-surface-500 pt-4">
                    Already registered?{' '}
                    <Link href={route('login')} className="font-bold text-primary-600 dark:text-primary-400 hover:underline">
                        Log in here
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
