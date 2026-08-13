import { Head, Link } from '@inertiajs/react';
import { Award, ShieldCheck, ShieldX } from 'lucide-react';
import MarketingLayout from '@/Layouts/MarketingLayout';
import { Certificate } from '@/types';

interface Props {
    code: string;
    certificate: (Certificate & { user?: { full_name: string } }) | null;
}

export default function VerifyCertificate({ code, certificate }: Props) {
    return (
        <MarketingLayout>
            <Head title="Verify certificate — Gmora STEM" />

            <section className="pt-28 md:pt-36 pb-20 min-h-[70vh] bg-gradient-to-b from-primary-950 to-surface-950">
                <div className="container-wide max-w-xl">
                    <div className="glass-card p-8 text-center">
                        {certificate ? (
                            <>
                                <div className="w-16 h-16 rounded-2xl bg-accent-500/15 flex items-center justify-center mx-auto mb-5">
                                    <ShieldCheck className="w-8 h-8 text-accent-400" />
                                </div>

                                <h1 className="text-2xl font-bold font-display text-white mb-1">
                                    Certificate verified
                                </h1>
                                <p className="text-surface-400 text-sm mb-8">
                                    This certificate was issued by Gmora STEM and has not been revoked.
                                </p>

                                <dl className="text-left space-y-4 border-t border-white/10 pt-6">
                                    <div>
                                        <dt className="text-xs uppercase tracking-wider text-surface-400 font-semibold">
                                            Awarded to
                                        </dt>
                                        <dd className="text-white font-medium mt-0.5">
                                            {certificate.user?.full_name}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs uppercase tracking-wider text-surface-400 font-semibold">
                                            Course
                                        </dt>
                                        <dd className="text-white font-medium mt-0.5">
                                            {certificate.course?.title}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs uppercase tracking-wider text-surface-400 font-semibold">
                                            Issued
                                        </dt>
                                        <dd className="text-white font-medium mt-0.5">
                                            {new Date(certificate.issued_at).toLocaleDateString(undefined, {
                                                dateStyle: 'long',
                                            })}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs uppercase tracking-wider text-surface-400 font-semibold">
                                            Certificate ID
                                        </dt>
                                        <dd className="text-white font-mono text-sm mt-0.5">
                                            {certificate.certificate_code}
                                        </dd>
                                    </div>
                                </dl>

                                {certificate.course?.slug && (
                                    <Link
                                        href={route('courses.show', certificate.course.slug)}
                                        className="btn-secondary w-full mt-8"
                                    >
                                        <Award className="w-4 h-4" />
                                        View the course
                                    </Link>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-5">
                                    <ShieldX className="w-8 h-8 text-red-400" />
                                </div>

                                <h1 className="text-2xl font-bold font-display text-white mb-2">
                                    No certificate found
                                </h1>
                                <p className="text-surface-400 text-sm">
                                    We have no record of the certificate ID{' '}
                                    <span className="font-mono text-surface-200">{code}</span>. Check the code and
                                    try again.
                                </p>

                                <Link href={route('home')} className="btn-secondary mt-8">
                                    Back to home
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
