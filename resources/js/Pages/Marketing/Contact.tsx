import { Head } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Mail, MapPin, MessageSquare, Send } from 'lucide-react';
import MarketingLayout from '@/Layouts/MarketingLayout';

export default function Contact() {
    const [sent, setSent] = useState(false);

    // The contact endpoint lands with the notifications milestone; until then
    // this form confirms locally rather than pretending to deliver.
    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        setSent(true);
    };

    return (
        <MarketingLayout>
            <Head title="Contact — Gmora STEM" />

            <section className="pt-28 md:pt-36 pb-14 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800">
                <div className="container-wide text-center max-w-2xl">
                    <h1 className="text-3xl md:text-5xl font-semibold text-surface-900 dark:text-white mb-4">
                        Get in <span className="text-primary-600 dark:text-primary-400">touch</span>
                    </h1>
                    <p className="text-surface-500 dark:text-surface-400">
                        Questions about a course, a school partnership, or joining as an instructor? We read
                        everything.
                    </p>
                </div>
            </section>

            <section className="section pt-12">
                <div className="container-wide grid lg:grid-cols-[1fr_320px] gap-8 max-w-5xl items-start">
                    <div className="card p-7">
                        {sent ? (
                            <div className="text-center py-10">
                                <div className="w-14 h-14 rounded-2xl bg-accent-50 dark:bg-accent-950/50 flex items-center justify-center mx-auto mb-4">
                                    <Send className="w-7 h-7 text-accent-500" />
                                </div>
                                <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                                    Thanks — message noted
                                </h2>
                                <p className="text-surface-500 mt-1.5 max-w-sm mx-auto text-sm">
                                    Email delivery is wired up in the notifications milestone. In the meantime,
                                    reach us directly at hello@gmorastem.com.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={submit} className="space-y-5">
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium mb-1.5">
                                            Name
                                        </label>
                                        <input id="name" name="name" required className="input" />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                                            Email
                                        </label>
                                        <input id="email" name="email" type="email" required className="input" />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="subject" className="block text-sm font-medium mb-1.5">
                                        Subject
                                    </label>
                                    <input id="subject" name="subject" required className="input" />
                                </div>

                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium mb-1.5">
                                        Message
                                    </label>
                                    <textarea id="message" name="message" rows={6} required className="input" />
                                </div>

                                <button type="submit" className="btn-primary">
                                    <Send className="w-4 h-4" />
                                    Send message
                                </button>
                            </form>
                        )}
                    </div>

                    <aside className="space-y-4">
                        {[
                            { icon: Mail, label: 'Email', value: 'hello@gmorastem.com' },
                            { icon: MessageSquare, label: 'Support', value: 'support@gmorastem.com' },
                            { icon: MapPin, label: 'Based in', value: 'Colombo, Sri Lanka' },
                        ].map((item) => (
                            <div key={item.label} className="card p-5 flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center shrink-0">
                                    <item.icon className="w-4.5 h-4.5 text-primary-500" />
                                </div>
                                <div>
                                    <div className="text-xs uppercase tracking-wider text-surface-400 font-semibold">
                                        {item.label}
                                    </div>
                                    <div className="text-sm text-surface-800 dark:text-surface-100 mt-0.5">
                                        {item.value}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </aside>
                </div>
            </section>
        </MarketingLayout>
    );
}
