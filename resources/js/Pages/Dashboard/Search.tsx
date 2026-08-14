import { Head, Link, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { BookOpen, CheckCircle2, MessageSquare, PlayCircle, Search as SearchIcon } from 'lucide-react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import { PageProps } from '@/types';

interface Results {
    courses: Array<{
        id: string;
        title: string;
        subtitle?: string;
        category: string;
        slug: string;
        is_enrolled: boolean;
    }>;
    lessons: Array<{
        id: string;
        title: string;
        type: string;
        course_title?: string;
        course_slug?: string;
    }>;
    discussions: Array<{
        id: string;
        title: string;
        excerpt: string;
        course_title?: string;
        replies_count: number;
        is_solved: boolean;
        author?: string;
    }>;
}

interface Props extends PageProps {
    query: string;
    results: Results;
    total: number;
}

export default function Search({ query, results, total }: Props) {
    const [term, setTerm] = useState(query);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        router.get(route('dashboard.search'), { q: term }, { preserveState: true });
    };

    return (
        <DashboardLayout header="Search">
            <Head title={query ? `${query} — search` : 'Search'} />

            <form onSubmit={submit} className="relative max-w-2xl mb-6">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                    type="search"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Search courses, lessons and discussions…"
                    aria-label="Search"
                    autoFocus
                    className="input pl-11 rounded-full"
                />
            </form>

            {query.length < 2 ? (
                <p className="text-sm text-surface-500">Type at least two characters to search.</p>
            ) : total === 0 ? (
                <div className="card p-12 text-center">
                    <SearchIcon className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                    <h2 className="text-base font-semibold text-surface-900 dark:text-white mb-1.5">
                        Nothing matched “{query}”
                    </h2>
                    <p className="text-sm text-surface-500">
                        Lessons and discussions only appear for courses you're enrolled in.
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    <p className="text-sm text-surface-500">
                        {total} result{total === 1 ? '' : 's'} for “{query}”
                    </p>

                    {results.courses.length > 0 && (
                        <section>
                            <h2 className="text-sm font-semibold text-surface-900 dark:text-white mb-3">Courses</h2>
                            <div className="card divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden">
                                {results.courses.map((course) => (
                                    <Link
                                        key={course.id}
                                        href={
                                            course.is_enrolled
                                                ? route('learn.show', course.slug)
                                                : route('courses.show', course.slug)
                                        }
                                        className="flex items-center gap-4 p-4 hover:bg-surface-50 dark:hover:bg-surface-800/60 transition-colors"
                                    >
                                        <span className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950 flex items-center justify-center shrink-0">
                                            <BookOpen className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-medium text-surface-900 dark:text-white truncate">
                                                {course.title}
                                            </span>
                                            <span className="block text-xs text-surface-500 truncate">
                                                {course.subtitle ?? course.category}
                                            </span>
                                        </span>
                                        {course.is_enrolled && <span className="badge-primary">Enrolled</span>}
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {results.lessons.length > 0 && (
                        <section>
                            <h2 className="text-sm font-semibold text-surface-900 dark:text-white mb-3">Lessons</h2>
                            <div className="card divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden">
                                {results.lessons.map((lesson) => (
                                    <Link
                                        key={lesson.id}
                                        href={
                                            lesson.course_slug
                                                ? route('learn.lesson', [lesson.course_slug, lesson.id])
                                                : '#'
                                        }
                                        className="flex items-center gap-4 p-4 hover:bg-surface-50 dark:hover:bg-surface-800/60 transition-colors"
                                    >
                                        <span className="w-9 h-9 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0">
                                            <PlayCircle className="w-4 h-4 text-surface-500" />
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-medium text-surface-900 dark:text-white truncate">
                                                {lesson.title}
                                            </span>
                                            <span className="block text-xs text-surface-500 truncate">
                                                {lesson.course_title}
                                            </span>
                                        </span>
                                        <span className="badge-muted capitalize">{lesson.type}</span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {results.discussions.length > 0 && (
                        <section>
                            <h2 className="text-sm font-semibold text-surface-900 dark:text-white mb-3">
                                Discussions
                            </h2>
                            <div className="card divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden">
                                {results.discussions.map((thread) => (
                                    <Link
                                        key={thread.id}
                                        href={route('discussions.show', thread.id)}
                                        className="flex items-start gap-4 p-4 hover:bg-surface-50 dark:hover:bg-surface-800/60 transition-colors"
                                    >
                                        <span
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                thread.is_solved
                                                    ? 'bg-accent-50 dark:bg-accent-950 text-accent-600 dark:text-accent-400'
                                                    : 'bg-surface-100 dark:bg-surface-800 text-surface-500'
                                            }`}
                                        >
                                            {thread.is_solved ? (
                                                <CheckCircle2 className="w-4 h-4" />
                                            ) : (
                                                <MessageSquare className="w-4 h-4" />
                                            )}
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-medium text-surface-900 dark:text-white truncate">
                                                {thread.title}
                                            </span>
                                            <span className="block text-xs text-surface-500 line-clamp-1">
                                                {thread.excerpt}
                                            </span>
                                            <span className="block text-xs text-surface-400 mt-1">
                                                {thread.course_title} · {thread.author} · {thread.replies_count}{' '}
                                                {thread.replies_count === 1 ? 'reply' : 'replies'}
                                            </span>
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </DashboardLayout>
    );
}
