import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, BookOpen, Clock, Search, Users } from 'lucide-react';
import MarketingLayout from '@/Layouts/MarketingLayout';
import { Course, Paginated } from '@/types';

interface Props {
    courses: Paginated<Course>;
    categories: string[];
    filters: { search?: string; category?: string; difficulty?: string };
}

const difficulties = ['beginner', 'intermediate', 'advanced'];

export default function Courses({ courses, categories, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    // Debounced search — Inertia replaces the page state in place.
    useEffect(() => {
        if (search === (filters.search ?? '')) return;

        const timeout = setTimeout(() => {
            router.get(route('courses.index'), { ...filters, search: search || undefined }, {
                preserveState: true,
                replace: true,
            });
        }, 300);

        return () => clearTimeout(timeout);
    }, [search]);

    const applyFilter = (key: 'category' | 'difficulty', value: string) => {
        router.get(
            route('courses.index'),
            { ...filters, [key]: filters[key] === value ? undefined : value },
            { preserveState: true, replace: true },
        );
    };

    return (
        <MarketingLayout>
            <Head title="Courses — Gmora STEM" />

            <section className="pt-28 md:pt-36 pb-10 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800">
                <div className="container-wide text-center">
                    <h1 className="text-3xl md:text-5xl font-semibold text-surface-900 dark:text-white mb-4">
                        Explore the <span className="text-primary-600 dark:text-primary-400">Course Catalog</span>
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400 max-w-2xl mx-auto">
                        Project-driven STEM courses with hands-on builds, live labs, and verified certificates.
                    </p>

                    <div className="relative max-w-xl mx-auto mt-8">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search courses…"
                            aria-label="Search courses"
                            className="input pl-12"
                        />
                    </div>
                </div>
            </section>

            <section className="section pt-10">
                <div className="container-wide">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-2 mb-8">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => applyFilter('category', category)}
                                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                    filters.category === category
                                        ? 'bg-primary-600 border-primary-600 text-white'
                                        : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-primary-400'
                                }`}
                            >
                                {category}
                            </button>
                        ))}

                        <span className="w-px h-6 bg-surface-200 dark:bg-surface-700 mx-1" />

                        {difficulties.map((level) => (
                            <button
                                key={level}
                                onClick={() => applyFilter('difficulty', level)}
                                className={`px-3.5 py-1.5 rounded-full text-sm font-medium capitalize border transition-colors ${
                                    filters.difficulty === level
                                        ? 'bg-surface-900 border-surface-900 text-white dark:bg-white dark:border-white dark:text-surface-900'
                                        : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-surface-400'
                                }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>

                    {courses.data.length === 0 ? (
                        <div className="card p-12 text-center">
                            <BookOpen className="w-10 h-10 text-surface-300 mx-auto mb-3" />
                            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">No courses found</h2>
                            <p className="text-surface-500 mt-1">Try a different search or clear your filters.</p>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {courses.data.map((course, i) => (
                                <motion.div
                                    key={course.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(i * 0.05, 0.3) }}
                                >
                                    <Link href={route('courses.show', course.slug)} className="card-interactive block h-full overflow-hidden">
                                        <div className="aspect-video bg-primary-50 dark:bg-surface-800 flex items-center justify-center">
                                            {course.thumbnail_url ? (
                                                <img
                                                    src={course.thumbnail_url}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <BookOpen className="w-10 h-10 text-primary-400 dark:text-surface-600" />
                                            )}
                                        </div>

                                        <div className="p-5">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="badge-primary">{course.category}</span>
                                                <span className="badge-accent capitalize">{course.difficulty}</span>
                                            </div>

                                            <h3 className="font-semibold text-surface-900 dark:text-white leading-snug mb-1.5">
                                                {course.title}
                                            </h3>
                                            <p className="text-sm text-surface-500 line-clamp-2">{course.subtitle}</p>

                                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-surface-100 dark:border-surface-800 text-xs text-surface-500">
                                                <span className="inline-flex items-center gap-1">
                                                    <BarChart3 className="w-3.5 h-3.5" />
                                                    {course.total_lessons} lessons
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {Math.round(course.duration_minutes / 60)}h
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {course.total_enrollments}
                                                </span>
                                                <span className="ml-auto font-semibold text-surface-900 dark:text-white">
                                                    {Number(course.price) > 0
                                                        ? `${course.currency} ${course.price}`
                                                        : 'Free'}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {courses.last_page > 1 && (
                        <nav className="flex justify-center gap-1 mt-10" aria-label="Pagination">
                            {courses.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url ?? '#'}
                                    preserveScroll
                                    className={`px-3.5 py-2 rounded-lg text-sm ${
                                        link.active
                                            ? 'bg-primary-600 text-white'
                                            : link.url
                                              ? 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
                                              : 'text-surface-300 pointer-events-none'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </nav>
                    )}
                </div>
            </section>
        </MarketingLayout>
    );
}
