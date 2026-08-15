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

test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

    test('gets a tab bar and an off-canvas menu', async ({ page }) => {
        await signIn(page);

        const drawer = page.getByRole('complementary', { name: 'Main navigation' });
        const tabBar = page.getByRole('navigation', { name: 'Primary' });

        // The tab bar carries the four main destinations.
        await expect(tabBar).toBeVisible();
        for (const href of ['/dashboard', '/dashboard/courses', '/dashboard/calendar', '/dashboard/notifications']) {
            await expect(tabBar.locator(`a[href="${href}"]`)).toBeVisible();
        }

        // The sidebar starts off-screen rather than covering the page.
        await expect(drawer).not.toBeInViewport();

        await page.getByLabel('Show menu').click();
        await expect(drawer).toBeInViewport();

        // Choosing a destination navigates and puts the menu away again.
        await drawer.getByRole('link', { name: 'Certificates' }).click();
        await expect(page).toHaveURL(/certificates/);
        await expect(drawer).not.toBeInViewport();
    });

    test('never scrolls sideways', async ({ page }) => {
        await signIn(page);

        for (const path of ['/dashboard', '/dashboard/courses', '/dashboard/calendar', '/support']) {
            await page.goto(path);
            const overflow = await page.evaluate(
                () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
            );

            expect(overflow, `${path} overflows horizontally`).toBeLessThanOrEqual(1);
        }
    });
});

test.describe('on a desktop', () => {
    test('has no tab bar, because the sidebar is always there', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await signIn(page);

        await expect(page.getByRole('complementary', { name: 'Main navigation' })).toBeInViewport();
        await expect(page.getByRole('navigation', { name: 'Primary' })).not.toBeVisible();
    });
});
