import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Award, BookOpen, Edit, Flame, Mail, Shield } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { Certificate, Course, Enrollment, PageProps, Role, User } from '@/types';

interface TargetUser extends User {
    role: Role;
    stat?: { xp: number; level: number; current_streak: number; longest_streak: number } | null;
    badges?: Array<{ id: string; name: string; description: string; pivot?: { earned_at: string } }>;
    enrollments?: Array<Enrollment & { course?: Course }>;
    certificates?: Array<Certificate & { course?: Course }>;
}

interface Props extends PageProps {
    targetUser: TargetUser;
}

export default function UserShow({ targetUser }: Props) {
    const stat = targetUser.stat;

    return (
        <DashboardLayout>
            <Head title={`${targetUser.full_name} — Admin`} />

            <Link
                href={route('admin.users.index')}
                className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                All users
            </Link>

            {/* Identity */}
            <div className="card p-6 mb-5">
                <div className="flex items-start gap-4 flex-wrap">
                    <span className="w-14 h-14 rounded-full bg-primary-600 text-white text-lg font-medium flex items-center justify-center shrink-0">
                        {targetUser.full_name?.charAt(0)?.toUpperCase()}
                    </span>

                    <div className="flex-1 min-w-[200px]">
                        <h1 className="text-xl font-semibold text-surface-900 dark:text-white">
                            {targetUser.full_name}
                        </h1>
                        <p className="inline-flex items-center gap-1.5 text-sm text-surface-500 mt-1">
                            <Mail className="w-3.5 h-3.5" />
                            {targetUser.email}
                        </p>
                        {targetUser.headline && (
                            <p className="text-sm text-surface-500 mt-1">{targetUser.headline}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="badge-primary">
                            <Shield className="w-3 h-3" />
                            {targetUser.role?.display_name}
                        </span>
                        <Link href={route('admin.users.edit', targetUser.id)} className="btn-secondary py-2">
                            <Edit className="w-4 h-4" />
                            Edit
                        </Link>
                    </div>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-surface-100 dark:border-surface-800">
                    <div>
                        <dt className="text-xs text-surface-400">Level</dt>
                        <dd className="text-lg font-semibold text-surface-900 dark:text-white">{stat?.level ?? 1}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-surface-400">XP</dt>
                        <dd className="text-lg font-semibold text-surface-900 dark:text-white">{stat?.xp ?? 0}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-surface-400">Current streak</dt>
                        <dd className="text-lg font-semibold text-surface-900 dark:text-white inline-flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-primary-600" />
                            {stat?.current_streak ?? 0}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-surface-400">Verified</dt>
                        <dd className="text-lg font-semibold text-surface-900 dark:text-white">
                            {targetUser.email_verified_at ? 'Yes' : 'No'}
                        </dd>
                    </div>
                </dl>
            </div>

            <div className="grid lg:grid-cols-2 gap-5 items-start">
                <div className="card p-6">
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-4">Enrollments</h2>

                    {targetUser.enrollments?.length ? (
                        <ul className="divide-y divide-surface-100 dark:divide-surface-800">
                            {targetUser.enrollments.map((enrollment) => (
                                <li key={enrollment.id} className="py-3 flex items-center gap-3">
                                    <BookOpen className="w-4 h-4 text-surface-400 shrink-0" />
                                    <span className="flex-1 text-sm text-surface-900 dark:text-white truncate">
                                        {enrollment.course?.title}
                                    </span>
                                    <span className="badge-muted capitalize">{enrollment.status}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-surface-500">No enrollments.</p>
                    )}
                </div>

                <div className="space-y-5">
                    <div className="card p-6">
                        <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-4">Certificates</h2>

                        {targetUser.certificates?.length ? (
                            <ul className="divide-y divide-surface-100 dark:divide-surface-800">
                                {targetUser.certificates.map((certificate) => (
                                    <li key={certificate.id} className="py-3">
                                        <p className="text-sm text-surface-900 dark:text-white">
                                            {certificate.course?.title}
                                        </p>
                                        <p className="text-xs font-mono text-surface-400 mt-0.5">
                                            {certificate.certificate_code}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-surface-500">No certificates issued.</p>
                        )}
                    </div>

                    <div className="card p-6">
                        <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-4">Badges</h2>

                        {targetUser.badges?.length ? (
                            <ul className="space-y-3">
                                {targetUser.badges.map((badge) => (
                                    <li key={badge.id} className="flex items-start gap-3">
                                        <span className="w-9 h-9 rounded-xl bg-accent-50 dark:bg-accent-950 flex items-center justify-center shrink-0">
                                            <Award className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                                        </span>
                                        <span>
                                            <span className="block text-sm font-medium text-surface-900 dark:text-white">
                                                {badge.name}
                                            </span>
                                            <span className="block text-xs text-surface-500">{badge.description}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-surface-500">No badges earned yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
