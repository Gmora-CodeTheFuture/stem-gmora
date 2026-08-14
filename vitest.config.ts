import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Component tests run against jsdom without Laravel's Vite plugin, which
 * expects a PHP dev server.
 */
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': new URL('./resources/js', import.meta.url).pathname },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./resources/js/tests/setup.tsx'],
        include: ['resources/js/**/*.test.{ts,tsx}'],
        css: false,
    },
});
