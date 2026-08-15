import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import UsersIndex from './Index';
import { pageProps, testUser } from '@/tests/factories';

/**
 * Admin tables are read on phones too. A six-column table at 390px shows two
 * columns and hides the row's actions behind a horizontal scroll nobody finds,
 * so every cell carries the heading it belongs to and the table opts into the
 * stacked-card treatment. These assertions keep that wiring in place.
 */

const paginated = <T,>(data: T[]) => ({
    data,
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: data.length,
    links: [],
});

const row = {
    ...testUser({ id: 'u-1', full_name: 'Demo Student', email: 'demo@example.com' }),
    enrollments_count: 2,
};

function renderPage() {
    return render(
        <UsersIndex
            {...pageProps}
            users={paginated([row]) as never}
            roles={[{ id: 'r-1', name: 'student', display_name: 'Student' }] as never}
            filters={{}}
        />,
    );
}

describe('Users table on small screens', () => {
    it('opts the table into the stacked treatment', () => {
        const { container } = renderPage();

        expect(container.querySelector('table')).toHaveClass('table-stack');
    });

    it('labels every cell with the column it belongs to', () => {
        const { container } = renderPage();

        const headings = [...container.querySelectorAll('thead th')].map((th) => th.textContent?.trim());
        const cells = [...container.querySelectorAll('tbody tr:first-child td')];

        expect(cells.length).toBe(headings.length);

        cells.forEach((cell, i) => {
            // The first cell leads the card and the actions cell becomes its
            // footer; everything between states which column it is.
            if (i === 0) {
                expect(cell).toHaveAttribute('data-label', '');
            } else if (headings[i]?.toLowerCase() === 'actions') {
                expect(cell).toHaveAttribute('data-actions');
            } else {
                expect(cell).toHaveAttribute('data-label', headings[i]!);
            }
        });
    });

    it('still shows the row actions', () => {
        renderPage();

        expect(screen.getByTitle(/edit/i)).toBeInTheDocument();
    });
});
