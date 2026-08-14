import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SupportIndex from './Index';
import { pageProps } from '@/tests/factories';

const base = {
    ...pageProps,
    categories: ['general', 'billing'],
    courses: [{ id: 'c-1', title: 'AI Fundamentals' }],
};

const ticket = (overrides = {}) => ({
    id: 't-1',
    reference: 'GS-ABCDE',
    subject: 'Video will not play',
    category: 'technical',
    priority: 'normal',
    status: 'open',
    messages_count: 2,
    last_reply_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    is_closed: false,
    ...overrides,
});

describe('Support index', () => {
    it('lists tickets with their reference and status', () => {
        render(<SupportIndex {...base} tickets={[ticket()]} />);

        expect(screen.getByText('GS-ABCDE')).toBeInTheDocument();
        expect(screen.getByText('Video will not play')).toBeInTheDocument();
        expect(screen.getByText('open')).toBeInTheDocument();
    });

    it('opens straight into the composer when there is nothing yet', () => {
        render(<SupportIndex {...base} tickets={[]} />);

        // A first-time user should not have to hunt for the button.
        expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /raise ticket/i })).toBeInTheDocument();
    });

    it('offers the learner’s own courses as context', () => {
        render(<SupportIndex {...base} tickets={[]} />);

        expect(screen.getByRole('option', { name: 'AI Fundamentals' })).toBeInTheDocument();
    });
});
