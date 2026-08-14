import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Search from './Search';
import { pageProps } from '@/tests/factories';

const base = { ...pageProps };
const empty = { courses: [], lessons: [], discussions: [] };

describe('Search', () => {
    it('asks for a longer query before searching', () => {
        render(<Search {...base} query="a" results={empty} total={0} />);

        expect(screen.getByText(/at least two characters/i)).toBeInTheDocument();
    });

    it('explains why a search may look empty', () => {
        render(<Search {...base} query="robotics" results={empty} total={0} />);

        expect(screen.getByText(/Nothing matched/)).toBeInTheDocument();
        // The scoping rule is stated rather than leaving the user puzzled.
        expect(screen.getByText(/only appear for courses you're enrolled in/i)).toBeInTheDocument();
    });

    it('groups results by type', () => {
        render(
            <Search
                {...base}
                query="ai"
                total={3}
                results={{
                    courses: [
                        { id: 'c1', title: 'AI Fundamentals', category: 'AI', slug: 'ai', is_enrolled: true },
                    ],
                    lessons: [
                        { id: 'l1', title: 'Gradient descent', type: 'youtube', course_title: 'AI', course_slug: 'ai' },
                    ],
                    discussions: [
                        {
                            id: 'd1',
                            title: 'Why does it diverge?',
                            excerpt: 'My loss goes up.',
                            course_title: 'AI',
                            replies_count: 1,
                            is_solved: false,
                            author: 'Ada',
                        },
                    ],
                }}
            />,
        );

        expect(screen.getByRole('heading', { name: 'Courses' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Lessons' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Discussions' })).toBeInTheDocument();
        expect(screen.getByText('Enrolled')).toBeInTheDocument();
    });
});
