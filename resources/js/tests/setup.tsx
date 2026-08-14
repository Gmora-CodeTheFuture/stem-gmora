import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, vi } from 'vitest';

/**
 * Inertia and the dashboard shell are stubbed once, globally, so a page
 * component can be rendered on its own: these tests are about what a page
 * shows, not about navigation or layout chrome.
 */
vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ children, href, ...rest }: { children: ReactNode; href: string }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
    router: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    usePage: () => ({ props: { auth: { user: null }, flash: {} } }),
    useForm: (initial: Record<string, unknown>) => ({
        data: initial,
        setData: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        reset: vi.fn(),
        processing: false,
        errors: {},
    }),
}));

vi.mock('@/Layouts/DashboardLayout', () => ({
    default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/Layouts/MarketingLayout', () => ({
    default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

/**
 * Ziggy's `route()` is injected globally by Blade at runtime. Tests only care
 * that a URL is produced, so a readable stand-in is enough.
 */
globalThis.route = ((name: string, params?: unknown) => {
    const first = typeof params === 'object' && params !== null ? Object.values(params)[0] : params;

    return `/${name.replace(/\./g, '/')}${first === undefined ? '' : `/${String(first)}`}`;
}) as unknown as typeof globalThis.route;

// jsdom has no matchMedia, which the theme bootstrap reads.
window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
})) as unknown as typeof window.matchMedia;

afterEach(() => cleanup());
