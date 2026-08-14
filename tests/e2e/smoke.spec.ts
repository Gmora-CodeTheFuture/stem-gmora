import { expect, test } from '@playwright/test';

/**
 * The paths that must never be broken: a visitor can reach the marketing site,
 * a student can sign in and use their dashboard, and protected areas stay shut.
 */

const student = { email: 'student@gmorastem.com', password: 'password' };

async function signIn(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.getByLabel('Email').fill(student.email);
    await page.getByLabel('Password', { exact: true }).fill(student.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL('**/dashboard');
}

test.describe('visitor', () => {
    test('can read the marketing site', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        await page.goto('/courses');
        await expect(page).toHaveTitle(/courses/i);

        await page.goto('/blog');
        await expect(page).toHaveTitle(/blog/i);
    });

    test('is redirected away from the dashboard', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/login/);
    });
});

test.describe('student', () => {
    test('signs in and lands on their dashboard', async ({ page }) => {
        await signIn(page);

        await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
    });

    test('can move around the dashboard', async ({ page }) => {
        await signIn(page);

        // Located by href: the unread badge is part of the link's accessible
        // name, so matching on text alone is brittle.
        for (const [href, expected] of [
            ['/dashboard/courses', /courses/i],
            ['/dashboard/calendar', /calendar/i],
            ['/dashboard/notifications', /notifications/i],
        ] as const) {
            await page.locator(`nav a[href="${href}"]`).first().click();
            await expect(page).toHaveURL(new RegExp(href));
            await expect(page).toHaveTitle(expected);
        }
    });

    test('cannot reach the admin area', async ({ page }) => {
        await signIn(page);

        const response = await page.goto('/admin');

        expect(response?.status()).toBe(403);
    });
});
