import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';

export default function TwoFactorChallenge() {
    const [useRecovery, setUseRecovery] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        code: '',
        recovery_code: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('two-factor.verify'));
    };

    const toggle = () => {
        reset('code', 'recovery_code');
        setUseRecovery((value) => !value);
    };

    return (
        <GuestLayout>
            <Head title="Two-factor authentication" />

            <div className="flex items-center gap-3 mb-2">
                <span className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </span>
                <h1 className="text-lg font-semibold text-surface-900 dark:text-white">Two-factor authentication</h1>
            </div>

            <p className="text-sm text-surface-500 mb-6">
                {useRecovery
                    ? 'Enter one of the recovery codes you saved when you set up two-factor authentication.'
                    : 'Enter the 6-digit code from your authenticator app to finish signing in.'}
            </p>

            <form onSubmit={submit} className="space-y-5">
                {useRecovery ? (
                    <div>
                        <InputLabel htmlFor="recovery_code" value="Recovery code" />
                        <TextInput
                            id="recovery_code"
                            className="mt-1 block w-full font-mono"
                            value={data.recovery_code}
                            onChange={(e) => setData('recovery_code', e.target.value)}
                            autoComplete="one-time-code"
                            isFocused
                            required
                        />
                        <InputError className="mt-2" message={errors.recovery_code} />
                    </div>
                ) : (
                    <div>
                        <InputLabel htmlFor="code" value="Authentication code" />
                        <TextInput
                            id="code"
                            className="mt-1 block w-full font-mono tracking-[0.4em] text-lg"
                            value={data.code}
                            onChange={(e) => setData('code', e.target.value)}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="000000"
                            maxLength={6}
                            isFocused
                            required
                        />
                        <InputError className="mt-2" message={errors.code} />
                    </div>
                )}

                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={toggle}
                        className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-primary-600 transition-colors"
                    >
                        <KeyRound className="w-3.5 h-3.5" />
                        {useRecovery ? 'Use an authenticator code' : 'Use a recovery code'}
                    </button>

                    <PrimaryButton disabled={processing}>
                        {processing ? 'Verifying…' : 'Verify'}
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
