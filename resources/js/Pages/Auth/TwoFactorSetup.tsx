import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { AlertTriangle, Check, Copy, ShieldCheck } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { PageProps } from '@/types';

interface Props extends PageProps {
    enabled: boolean;
    required: boolean;
    secret?: string;
    qrCode?: string;
    recoveryCodesRemaining?: number;
}

export default function TwoFactorSetup({ enabled, required, secret, qrCode, recoveryCodesRemaining }: Props) {
    const page = usePage<PageProps & { recoveryCodes?: string[] }>().props;
    const recoveryCodes = (page as { recoveryCodes?: string[] }).recoveryCodes;

    const form = useForm({ code: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('two-factor.enable'), { onSuccess: () => form.reset('code') });
    };

    return (
        <DashboardLayout header="Two-factor authentication">
            <Head title="Two-factor authentication" />

            <div className="max-w-2xl space-y-5">
                {required && !enabled && (
                    <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-sm">
                            Your role can publish content and change accounts, so two-factor authentication is
                            required before you can continue.
                        </p>
                    </div>
                )}

                {recoveryCodes && recoveryCodes.length > 0 && (
                    <div className="card p-6">
                        <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1">
                            Save your recovery codes
                        </h2>
                        <p className="text-sm text-surface-500 mb-4">
                            Each code works once, and they are the only way back in if you lose your device. This is
                            the last time they are shown.
                        </p>

                        <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
                            {recoveryCodes.map((code) => (
                                <li
                                    key={code}
                                    className="px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-100"
                                >
                                    {code}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => navigator.clipboard?.writeText(recoveryCodes.join('\n'))}
                            className="btn-secondary mt-4 py-2"
                        >
                            <Copy className="w-4 h-4" />
                            Copy all
                        </button>
                    </div>
                )}

                {enabled ? (
                    <div className="card p-6">
                        <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-accent-50 dark:bg-accent-950 flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                            </span>
                            <div>
                                <h2 className="text-base font-semibold text-surface-900 dark:text-white">
                                    Two-factor authentication is on
                                </h2>
                                <p className="text-sm text-surface-500">
                                    {recoveryCodesRemaining} recovery code
                                    {recoveryCodesRemaining === 1 ? '' : 's'} remaining.
                                </p>
                            </div>
                        </div>

                        <Link href={route('profile.security')} className="btn-secondary mt-5">
                            Manage in security settings
                        </Link>
                    </div>
                ) : (
                    <div className="card p-6">
                        <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1">
                            Set up your authenticator
                        </h2>
                        <p className="text-sm text-surface-500 mb-5">
                            Scan this code with Google Authenticator, 1Password, or any TOTP app, then enter the
                            6-digit code it shows.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-6">
                            {qrCode && (
                                <img
                                    src={qrCode}
                                    alt="Two-factor QR code"
                                    className="w-[220px] h-[220px] rounded-xl bg-white p-2 border border-surface-200 dark:border-surface-700 shrink-0"
                                />
                            )}

                            <div className="flex-1">
                                <p className="text-xs text-surface-400 mb-1.5">Or enter this key manually:</p>
                                <code className="block px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 font-mono text-sm break-all">
                                    {secret}
                                </code>

                                <form onSubmit={submit} className="mt-5">
                                    <InputLabel htmlFor="code" value="6-digit code" />
                                    <TextInput
                                        id="code"
                                        className="mt-1 block w-full font-mono tracking-[0.3em]"
                                        value={form.data.code}
                                        onChange={(e) => form.setData('code', e.target.value)}
                                        inputMode="numeric"
                                        maxLength={6}
                                        placeholder="000000"
                                        required
                                    />
                                    <InputError className="mt-2" message={form.errors.code} />

                                    <PrimaryButton className="mt-4" disabled={form.processing}>
                                        <Check className="w-4 h-4" />
                                        {form.processing ? 'Verifying…' : 'Turn on two-factor'}
                                    </PrimaryButton>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
