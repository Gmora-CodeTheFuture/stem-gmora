import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import DashboardLayout from '@/Layouts/DashboardLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { PageProps } from '@/types';

interface Props extends PageProps {
    instructors: Array<{ id: string; full_name: string }>;
}

export default function CreateCourse({ instructors }: Props) {
    const { data, setData, post, errors, processing } = useForm({
        title: '',
        subtitle: '',
        description: '',
        category: '',
        difficulty: 'beginner',
        language: 'en',
        price: 0,
        currency: 'USD',
        instructor_id: instructors[0]?.id ?? '',
        thumbnail_url: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('admin.courses.store'));
    };

    return (
        <DashboardLayout>
            <Head title="New course — Admin" />

            <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-6">
                    <Link
                        href={route('admin.courses.index')}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                    >
                        ← Courses
                    </Link>
                    <span className="text-surface-400">/</span>
                    <h1 className="text-xl font-semibold text-surface-900 dark:text-white">New course</h1>
                </div>

                <div className="card p-7">
                    {instructors.length === 0 ? (
                        <p className="text-sm text-surface-500">
                            No instructors exist yet. Give a user the instructor role first, then create the course.
                        </p>
                    ) : (
                        <form onSubmit={submit} className="space-y-6">
                            <div>
                                <InputLabel htmlFor="title" value="Title" />
                                <TextInput
                                    id="title"
                                    className="mt-1 block w-full"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    required
                                    isFocused
                                />
                                <InputError className="mt-2" message={errors.title} />
                            </div>

                            <div>
                                <InputLabel htmlFor="subtitle" value="Subtitle" />
                                <TextInput
                                    id="subtitle"
                                    className="mt-1 block w-full"
                                    value={data.subtitle}
                                    onChange={(e) => setData('subtitle', e.target.value)}
                                />
                                <InputError className="mt-2" message={errors.subtitle} />
                            </div>

                            <div>
                                <InputLabel htmlFor="description" value="Description" />
                                <textarea
                                    id="description"
                                    rows={5}
                                    className="input mt-1"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                />
                                <InputError className="mt-2" message={errors.description} />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-5">
                                <div>
                                    <InputLabel htmlFor="instructor_id" value="Instructor" />
                                    <select
                                        id="instructor_id"
                                        className="input mt-1"
                                        value={data.instructor_id}
                                        onChange={(e) => setData('instructor_id', e.target.value)}
                                    >
                                        {instructors.map((instructor) => (
                                            <option key={instructor.id} value={instructor.id}>
                                                {instructor.full_name}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError className="mt-2" message={errors.instructor_id} />
                                </div>

                                <div>
                                    <InputLabel htmlFor="category" value="Category" />
                                    <TextInput
                                        id="category"
                                        className="mt-1 block w-full"
                                        value={data.category}
                                        onChange={(e) => setData('category', e.target.value)}
                                        placeholder="Artificial Intelligence"
                                        required
                                    />
                                    <InputError className="mt-2" message={errors.category} />
                                </div>

                                <div>
                                    <InputLabel htmlFor="difficulty" value="Difficulty" />
                                    <select
                                        id="difficulty"
                                        className="input mt-1"
                                        value={data.difficulty}
                                        onChange={(e) => setData('difficulty', e.target.value)}
                                    >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>

                                <div>
                                    <InputLabel htmlFor="language" value="Language" />
                                    <TextInput
                                        id="language"
                                        className="mt-1 block w-full"
                                        value={data.language}
                                        onChange={(e) => setData('language', e.target.value)}
                                        required
                                    />
                                    <InputError className="mt-2" message={errors.language} />
                                </div>

                                <div>
                                    <InputLabel htmlFor="price" value="Price" />
                                    <TextInput
                                        id="price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="mt-1 block w-full"
                                        value={String(data.price)}
                                        onChange={(e) => setData('price', Number(e.target.value))}
                                        required
                                    />
                                    <InputError className="mt-2" message={errors.price} />
                                </div>

                                <div>
                                    <InputLabel htmlFor="currency" value="Currency" />
                                    <TextInput
                                        id="currency"
                                        className="mt-1 block w-full"
                                        value={data.currency}
                                        onChange={(e) => setData('currency', e.target.value.toUpperCase())}
                                        maxLength={3}
                                        required
                                    />
                                    <InputError className="mt-2" message={errors.currency} />
                                </div>
                            </div>

                            <div>
                                <InputLabel htmlFor="thumbnail_url" value="Thumbnail URL" />
                                <TextInput
                                    id="thumbnail_url"
                                    className="mt-1 block w-full"
                                    value={data.thumbnail_url}
                                    onChange={(e) => setData('thumbnail_url', e.target.value)}
                                    placeholder="https://…"
                                />
                                <InputError className="mt-2" message={errors.thumbnail_url} />
                            </div>

                            <div className="flex items-center gap-3">
                                <PrimaryButton disabled={processing}>
                                    {processing ? 'Creating…' : 'Create course'}
                                </PrimaryButton>
                                <p className="text-xs text-surface-400">
                                    Created as a draft. Add modules and lessons before publishing.
                                </p>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
