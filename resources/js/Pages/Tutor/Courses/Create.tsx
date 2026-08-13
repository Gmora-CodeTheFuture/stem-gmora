import { Head, useForm, Link } from '@inertiajs/react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import { PageProps } from '@/types';
import { FormEventHandler } from 'react';

export default function CreateCourse({ auth }: PageProps) {
    const { data, setData, post, errors, processing } = useForm({
        title: '',
        subtitle: '',
        description: '',
        category: '',
        difficulty: 'beginner',
        language: 'en',
        price: 0.00,
        currency: 'USD',
        thumbnail_url: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/tutor/courses');
    };

    return (
        <DashboardLayout>
            <Head title="Create Course — Tutor" />

            <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-6">
                    <Link href="/tutor/courses" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">← My Courses</Link>
                    <span className="text-surface-400">/</span>
                    <h1 className="text-xl font-semibold text-surface-900 dark:text-white">Create New Course</h1>
                </div>

                <div className="card p-7">
                    <form onSubmit={submit} className="space-y-6">
                        <div>
                            <InputLabel htmlFor="title" value="Title *" />
                            <TextInput id="title" className="mt-1 block w-full" value={data.title} onChange={(e) => setData('title', e.target.value)} required placeholder="e.g. Introduction to Quantum Physics" />
                            <InputError className="mt-2" message={errors.title} />
                        </div>

                        <div>
                            <InputLabel htmlFor="subtitle" value="Subtitle" />
                            <TextInput id="subtitle" className="mt-1 block w-full" value={data.subtitle} onChange={(e) => setData('subtitle', e.target.value)} placeholder="A brief one-liner about the course" />
                            <InputError className="mt-2" message={errors.subtitle} />
                        </div>

                        <div>
                            <InputLabel htmlFor="description" value="Description" />
                            <textarea id="description" className="mt-1 block w-full border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 focus:border-primary-500 dark:focus:border-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600 rounded-md shadow-sm"
                                value={data.description} onChange={(e) => setData('description', e.target.value)} rows={4} placeholder="What will students learn?" />
                            <InputError className="mt-2" message={errors.description} />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <InputLabel htmlFor="category" value="Category *" />
                                <TextInput id="category" className="mt-1 block w-full" value={data.category} onChange={(e) => setData('category', e.target.value)} required placeholder="e.g. Mathematics" />
                                <InputError className="mt-2" message={errors.category} />
                            </div>
                            <div>
                                <InputLabel htmlFor="difficulty" value="Difficulty *" />
                                <select id="difficulty" value={data.difficulty} onChange={(e) => setData('difficulty', e.target.value)}
                                    className="mt-1 block w-full border-surface-300 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 focus:border-primary-500 focus:ring-primary-500 rounded-md shadow-sm">
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <InputLabel htmlFor="price" value="Price *" />
                                <TextInput id="price" type="number" step="0.01" className="mt-1 block w-full" value={data.price} onChange={(e) => setData('price', parseFloat(e.target.value))} required />
                                <InputError className="mt-2" message={errors.price} />
                            </div>
                            <div>
                                <InputLabel htmlFor="currency" value="Currency *" />
                                <TextInput id="currency" className="mt-1 block w-full" value={data.currency} onChange={(e) => setData('currency', e.target.value)} required />
                                <InputError className="mt-2" message={errors.currency} />
                            </div>
                            <div>
                                <InputLabel htmlFor="language" value="Language *" />
                                <TextInput id="language" className="mt-1 block w-full" value={data.language} onChange={(e) => setData('language', e.target.value)} required placeholder="e.g. en" />
                                <InputError className="mt-2" message={errors.language} />
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="thumbnail_url" value="Thumbnail URL" />
                            <TextInput id="thumbnail_url" className="mt-1 block w-full" value={data.thumbnail_url} onChange={(e) => setData('thumbnail_url', e.target.value)} placeholder="https://..." />
                            <InputError className="mt-2" message={errors.thumbnail_url} />
                        </div>

                        <div className="pt-2">
                            <PrimaryButton disabled={processing}>Create Course & Continue</PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
