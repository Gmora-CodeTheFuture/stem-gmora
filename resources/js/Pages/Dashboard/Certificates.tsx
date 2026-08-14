import { Head, Link } from '@inertiajs/react';
import { Award, Download, ExternalLink } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

interface CertificateRow {
    id: string;
    certificate_code: string;
    issued_at: string;
    has_pdf: boolean;
    course: { id: string; title: string; slug: string; category: string } | null;
}

interface Props extends PageProps {
    certificates: CertificateRow[];
}

export default function Certificates({ certificates }: Props) {
    return (
        <DashboardLayout header="Certificates">
            <Head title="Certificates — Gmora STEM" />

            {certificates.length === 0 ? (
                <div className="card p-12 text-center">
                    <Award className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1.5">
                        No certificates yet
                    </h2>
                    <p className="text-sm text-surface-500 mb-6 max-w-sm mx-auto">
                        Complete every lesson in a course and your certificate is issued automatically.
                    </p>
                    <Link href={route('dashboard.courses')} className="btn-primary">
                        Back to my courses
                    </Link>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {certificates.map((certificate) => (
                        <article key={certificate.id} className="card p-6">
                            <span className="w-11 h-11 rounded-2xl bg-accent-50 dark:bg-accent-950 flex items-center justify-center mb-4">
                                <Award className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                            </span>

                            <h2 className="font-semibold text-surface-900 dark:text-white leading-snug">
                                {certificate.course?.title}
                            </h2>
                            <p className="text-sm text-surface-500 mt-1">
                                Issued{' '}
                                {new Date(certificate.issued_at).toLocaleDateString(undefined, {
                                    dateStyle: 'long',
                                })}
                            </p>

                            <p className="text-xs font-mono text-surface-400 mt-4 pt-4 border-t border-surface-100 dark:border-surface-800">
                                {certificate.certificate_code}
                            </p>

                            <div className="flex items-center gap-2 mt-4">
                                <a
                                    href={route('certificates.download', certificate.id)}
                                    className="btn-primary flex-1"
                                >
                                    <Download className="w-4 h-4" />
                                    Download PDF
                                </a>
                                <Link
                                    href={route('certificate.verify', certificate.certificate_code)}
                                    className="btn-secondary"
                                    title="Public verification page"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
