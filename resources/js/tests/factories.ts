import { User } from '@/types';

/** A minimally complete user, so page props typecheck in tests. */
export function testUser(overrides: Partial<User> = {}): User {
    return {
        id: 'u-test',
        full_name: 'Test Learner',
        email: 'learner@example.com',
        role: { id: 'r-1', name: 'student', display_name: 'Student' },
        role_id: 'r-1',
        locale: 'en',
        two_factor_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides,
    };
}

/** The shared props every page receives. */
export const pageProps = {
    auth: { user: testUser() },
    flash: {},
};
