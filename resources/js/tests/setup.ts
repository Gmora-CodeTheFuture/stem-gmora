import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * Ziggy's `route()` is injected globally by Blade at runtime. Tests only care
 * that a URL is produced, so a readable stand-in is enough.
 */
globalThis.route = ((name: string, params?: unknown) => {
    const suffix = params === undefined ? '' : `/${String(typeof params === 'object' ? Object.values(params as object)[0] : params)}`;

    return `/${name.replace(/\./g, '/')}${suffix}`;
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
