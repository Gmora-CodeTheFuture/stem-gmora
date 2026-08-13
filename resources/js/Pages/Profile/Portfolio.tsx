import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link } from '@inertiajs/react';
import { Shield, MapPin, Link as LinkIcon, Github, Linkedin, Award, Flame, Zap } from 'lucide-react';

export default function Portfolio({ portfolioUser }: { portfolioUser: any }) {
    return (
        <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
            <Head title={`${portfolioUser.full_name}'s Portfolio — Gmora STEM`} />
            
            {/* Header/Nav */}
            <div className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="font-bold text-xl text-primary-600 dark:text-primary-400">Gmora</Link>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    
                    {/* Left Sidebar */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="card p-6 text-center">
                            <div className="w-32 h-32 mx-auto rounded-full bg-surface-200 dark:bg-surface-800 mb-4 overflow-hidden border-4 border-white dark:border-surface-700 shadow-lg">
                                {portfolioUser.avatar_url ? (
                                    <img src={portfolioUser.avatar_url} alt={portfolioUser.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-surface-400 dark:text-surface-600">
                                        {portfolioUser.full_name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{portfolioUser.full_name}</h1>
                            {portfolioUser.headline && (
                                <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">{portfolioUser.headline}</p>
                            )}
                            
                            <div className="mt-6 flex flex-col gap-3">
                                {portfolioUser.github_url && (
                                    <a href={portfolioUser.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                                        <Github className="w-4 h-4" /> GitHub
                                    </a>
                                )}
                                {portfolioUser.linkedin_url && (
                                    <a href={portfolioUser.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                                        <Linkedin className="w-4 h-4" /> LinkedIn
                                    </a>
                                )}
                                {portfolioUser.website_url && (
                                    <a href={portfolioUser.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                                        <LinkIcon className="w-4 h-4" /> Website
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="card p-6">
                            <h2 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wider mb-4">Stats</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                                        <Shield className="w-5 h-5 text-indigo-500" />
                                        <span>Level</span>
                                    </div>
                                    <span className="font-bold text-surface-900 dark:text-white">{portfolioUser.stat?.level || 1}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                                        <Zap className="w-5 h-5 text-yellow-500" />
                                        <span>XP</span>
                                    </div>
                                    <span className="font-bold text-surface-900 dark:text-white">{portfolioUser.stat?.xp || 0}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                                        <Flame className="w-5 h-5 text-orange-500" />
                                        <span>Streak</span>
                                    </div>
                                    <span className="font-bold text-surface-900 dark:text-white">{portfolioUser.stat?.current_streak || 0} days</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Content */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Bio */}
                        {portfolioUser.bio && (
                            <div className="card p-6">
                                <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-3">About Me</h2>
                                <p className="text-surface-600 dark:text-surface-400 whitespace-pre-wrap">{portfolioUser.bio}</p>
                            </div>
                        )}

                        {/* Badges */}
                        <div className="card p-6">
                            <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-4">Badges & Achievements</h2>
                            {portfolioUser.badges && portfolioUser.badges.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {portfolioUser.badges.map((badge: any) => (
                                        <div key={badge.id} className="p-4 border border-surface-200 dark:border-surface-800 rounded-xl flex flex-col items-center text-center">
                                            <Award className="w-10 h-10 text-primary-500 mb-2" />
                                            <h3 className="font-bold text-sm text-surface-900 dark:text-white">{badge.name}</h3>
                                            <p className="text-xs text-surface-500 mt-1">{badge.description}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-surface-500 dark:text-surface-400 text-sm">No badges earned yet.</p>
                            )}
                        </div>

                        {/* Certificates */}
                        <div className="card p-6">
                            <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-4">Certificates</h2>
                            {portfolioUser.certificates && portfolioUser.certificates.length > 0 ? (
                                <div className="space-y-4">
                                    {portfolioUser.certificates.map((cert: any) => (
                                        <div key={cert.id} className="p-4 border border-surface-200 dark:border-surface-800 rounded-xl flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-surface-900 dark:text-white">{cert.course.title}</h3>
                                                <p className="text-sm text-surface-500">Issued: {new Date(cert.issued_at).toLocaleDateString()}</p>
                                            </div>
                                            <a href={`/verify/${cert.certificate_code}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-primary-600 dark:text-primary-400 hover:underline">
                                                Verify
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-surface-500 dark:text-surface-400 text-sm">No certificates earned yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
