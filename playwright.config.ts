import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end smoke tests. They drive the real application, so they need a
 * running server and a seeded database — `php artisan serve` plus the demo
 * accounts from DatabaseSeeder.
 */
export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? 'github' : 'list',
    // The database is remote in development, so allow generous budgets.
    timeout: 60_000,
    expect: { timeout: 15_000 },
    use: {
        baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8000',
        trace: 'on-first-retry',
        actionTimeout: 20_000,
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
