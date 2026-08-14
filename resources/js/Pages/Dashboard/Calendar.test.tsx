import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { router } from '@inertiajs/react';
import { describe, expect, it } from 'vitest';
import Calendar from './Calendar';
import { pageProps } from '@/tests/factories';

const today = new Date();
const iso = today.toISOString();
const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

const base = {
    ...pageProps,
    month,
    monthLabel: 'This month',
    rangeStart: today.toISOString().slice(0, 10),
    rangeEnd: today.toISOString().slice(0, 10),
    canManage: false,
    manageableCourses: [],
};

type Registration = {
    open: boolean;
    registered: boolean;
    going: number;
    capacity: number | null;
    spots_left: number | null;
    full: boolean;
};

const item = (registration?: Registration) => ({
    id: 'e-1',
    source: 'event' as const,
    type: 'workshop' as const,
    title: 'Robotics workshop',
    description: null,
    starts_at: iso,
    ends_at: null,
    location: 'Online',
    url: null,
    course: null,
    editable: true,
    registration,
});

describe('Calendar registration', () => {
    it('offers a register button when sign-ups are open', async () => {
        render(
            <Calendar
                {...base}
                items={[
                    item({ open: true, registered: false, going: 3, capacity: 10, spots_left: 7, full: false }),
                ]}
            />,
        );

        expect(screen.getByText(/3 going/)).toBeInTheDocument();
        expect(screen.getByText(/7 of 10 left/)).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Register' }));

        expect(router.post).toHaveBeenCalledWith('/events/register/e-1', {}, expect.anything());
    });

    it('shows a cancel path once you are going', () => {
        render(
            <Calendar
                {...base}
                items={[
                    item({ open: true, registered: true, going: 1, capacity: null, spots_left: null, full: false }),
                ]}
            />,
        );

        expect(screen.getByText(/You're going/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        // Unlimited capacity should not claim a number of spots.
        expect(screen.queryByText(/left/)).not.toBeInTheDocument();
    });

    it('hides registration controls for items that do not take sign-ups', () => {
        render(<Calendar {...base} items={[item()]} />);

        expect(screen.queryByRole('button', { name: 'Register' })).not.toBeInTheDocument();
    });
});
