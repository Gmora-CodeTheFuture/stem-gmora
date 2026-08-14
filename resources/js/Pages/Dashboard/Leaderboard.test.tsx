import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Leaderboard from './Leaderboard';
import { pageProps } from '@/tests/factories';

const baseProps = {
    ...pageProps,
    board: 'xp' as const,
    courses: [],
    selectedCourse: '',
};

describe('Leaderboard', () => {
    it('names public learners and links to their profile', () => {
        render(
            <Leaderboard
                {...baseProps}
                rows={[
                    { rank: 1, user_id: 'u-1', name: 'Ada Lovelace', score: 900, caption: 'Level 4', is_you: false },
                ]}
                you={null}
            />,
        );

        expect(screen.getByRole('link', { name: 'Ada Lovelace' })).toBeInTheDocument();
    });

    it('hides the identity of private learners but keeps their rank', () => {
        render(
            <Leaderboard
                {...baseProps}
                rows={[
                    { rank: 1, user_id: null, name: 'Private learner', score: 900, caption: 'Level 4', is_you: false },
                    { rank: 2, user_id: 'u-2', name: 'Visible Learner', score: 400, caption: 'Level 3', is_you: false },
                ]}
                you={null}
            />,
        );

        expect(screen.getByText('Private learner')).toBeInTheDocument();
        // A private learner must not be clickable through to a profile.
        expect(screen.queryByRole('link', { name: 'Private learner' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Visible Learner' })).toBeInTheDocument();
    });

    it('marks the viewer and reports their standing', () => {
        render(
            <Leaderboard
                {...baseProps}
                rows={[{ rank: 3, user_id: 'me', name: 'Me', score: 120, caption: 'Level 2', is_you: true }]}
                you={{ rank: 3, score: 120 }}
            />,
        );

        expect(screen.getByText('You')).toBeInTheDocument();
        expect(screen.getByText(/#3/)).toBeInTheDocument();
    });

    it('explains itself when there is nothing to rank', () => {
        render(<Leaderboard {...baseProps} rows={[]} you={null} />);

        expect(screen.getByText('Nothing to rank yet')).toBeInTheDocument();
    });
});
