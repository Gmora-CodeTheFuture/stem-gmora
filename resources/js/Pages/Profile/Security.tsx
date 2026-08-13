import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { LogOut, Monitor, ShieldCheck, ShieldOff } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { PageProps } from '@/types';

interface SessionRow {
    id: string;
    device_label?: string;
    ip_address?: string;
    location?: string;
    last_seen_at?: string;
    created_at: string;
    is_current: boolean;
}

interface Props extends PageProps {
    sessions: SessionRow[];
    twoFactor: { enabled: boolean; required: boolean; recovery_codes_remaining: number };
}

function relative(iso?: string): string {
    if (!iso) return 'unknown';

    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);

    if (minutes < 1) return 'active now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;

    return `${Math.round(minutes / 1440)}d ago`;
}

export default function Security({ sessions, twoFactor }: Props) {
    const [confirming, setConfirming] = useState(false);
    const form = useForm({ password: '' });

    const revokeOthers: FormEventHandler = (e) => {
        e.preventDefault();
        form.delete(route('profile.sessions.destroy-others'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setConfirming(false);
            },
        });
    };

    return (
        <DashboardLayout header="Security">
            <Head title="Security — Gmora STEM" />

            <div className="max-w-3xl space-y-5">
                {/* Two-factor */}
                <div className="card p-6">
                    <div className="flex items-start gap-4 flex-wrap">
                        <span
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                twoFactor.enabled
                                    ? 'bg-accent-50 dark:bg-accent-950'
                                    : 'bg-surface-100 dark:bg-surface-800'
                            }`}
                        >
                            {twoFactor.enabled ? (
                                <ShieldCheck className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                            ) : (
                                <ShieldOff className="w-5 h-5 text-surface-500" />
                            )}
                        </span>

                        <div className="flex-1 min-w-[200px]">
                            <h2 className="text-base font-semibold text-surface-900 dark:text-white">
                                Two-factor authentication
                            </h2>
                            <p className="text-sm text-surface-500 mt-1">
                                {twoFactor.enabled
                                    ? `On · ${twoFactor.recovery_codes_remaining} recovery codes remaining.`
                                    : twoFactor.required
                                      ? 'Required for your role. Set it up to keep using staff features.'
                                      : 'Add a second step to your sign-in with an authenticator app.'}
                            </p>
                        </div>

                        <Link href={route('two-factor.setup')} className="btn-secondary py-2">
                            {twoFactor.enabled ? 'Manage' : 'Set up'}
                        </Link>
                    </div>
                </div>

                {/* Active sessions */}
                <div className="card p-6">
                    <div className="flex items-center justify-between gap-3 mb-1">
                        <h2 className="text-base font-semibold text-surface-900 dark:text-white">Active devices</h2>
                        <span className="text-sm text-surface-400">{sessions.length} signed in</span>
                    </div>
                    <p className="text-sm text-surface-500 mb-5">
                        Signing a device out also stops any lesson video playing on it.
                    </p>

                    <ul className="divide-y divide-surface-100 dark:divide-surface-800">
                        {sessions.map((session) => (
                            <li key={session.id} className="py-4 flex items-center gap-4">
                                <span className="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0">
                                    <Monitor className="w-4 h-4 text-surface-500" />
                                </span>

                                <span className="flex-1 min-w-0">
                                    <span className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-surface-900 dark:text-white truncate">
                                            {session.device_label}
                                        </span>
                                        {session.is_current && <span className="badge-accent">This device</span>}
                                    </span>
                                    <span className="block text-xs text-surface-400 mt-0.5">
                                        {session.ip_address} · {relative(session.last_seen_at)}
                                    </span>
                                </span>

                                {!session.is_current && (
                                    <button
                                        onClick={() =>
                                            router.delete(route('profile.sessions.destroy', session.id), {
                                                preserveScroll: true,
                                            })
                                        }
                                        className="btn-ghost py-2 text-sm shrink-0"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign out
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>

                    <div className="mt-5 pt-5 border-t border-surface-100 dark:border-surface-800">
                        {confirming ? (
                            <form onSubmit={revokeOthers} className="max-w-sm">
                                <InputLabel htmlFor="password" value="Confirm your password" />
                                <TextInput
                                    id="password"
                                    type="password"
                                    className="mt-1 block w-full"
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                    isFocused
                                    required
                                />
                                <InputError className="mt-2" message={form.errors.password} />

                                <div className="flex items-center gap-3 mt-4">
                                    <button type="submit" disabled={form.processing} className="btn-primary py-2">
                                        Sign out other devices
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirming(false)}
                                        className="btn-ghost py-2"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <button onClick={() => setConfirming(true)} className="btn-secondary py-2">
                                Sign out all other devices
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
