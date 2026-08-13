// ─── Base Entities ──────────────────────────────────────────────

export interface User {
    id: string;
    full_name: string;
    email: string;
    email_verified_at?: string;
    avatar_url?: string;
    bio?: string;
    headline?: string;
    github_url?: string;
    linkedin_url?: string;
    website_url?: string;
    is_public?: boolean;
    role: Role;
    role_id: string;
    locale: string;
    preferences?: Record<string, unknown>;
    two_factor_enabled: boolean;
    last_login_at?: string;
    created_at: string;
    updated_at: string;
}

export interface Role {
    id: string;
    name: string;
    display_name: string;
    description?: string;
}

export interface Course {
    id: string;
    instructor_id: string;
    instructor?: User;
    title: string;
    slug: string;
    subtitle?: string;
    description?: string;
    category: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    language: string;
    price: number;
    currency: string;
    thumbnail_url?: string;
    preview_video_url?: string;
    status: 'draft' | 'pending_review' | 'published' | 'archived';
    duration_minutes: number;
    total_lessons: number;
    total_enrollments: number;
    average_rating?: number;
    modules?: Module[];
    created_at: string;
    updated_at: string;
}

export interface Module {
    id: string;
    course_id: string;
    title: string;
    description?: string;
    order_index: number;
    is_published: boolean;
    lessons?: Lesson[];
}

export interface Lesson {
    id: string;
    module_id?: string;
    title: string;
    description?: string;
    type: 'youtube' | 'live' | 'pdf' | 'quiz';
    order_index: number;
    duration_seconds: number;
    is_free_preview?: boolean;
    is_published?: boolean;
    live_session?: LiveSession | null;
    /**
     * Catalog/learning responses never carry `content_ref` — they expose only
     * whether a video exists. The ID itself arrives with a video ticket.
     */
    has_video?: boolean;
    quiz?: { id: string; title: string } | null;
    progress?: Pick<Progress, 'status' | 'watch_percentage'> | null;
}

/** [v2] Response of POST /api/v1/learning/lessons/{id}/video-token */
export interface VideoTicket {
    video_id: string;
    ticket: string;
    expires_at: string;
    watermark: string;
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

export interface LiveSession {
    id: string;
    lesson_id: string;
    title: string;
    scheduled_start: string;
    duration_minutes: number;
    zoom_join_url?: string;
}

// ─── Learning ───────────────────────────────────────────────────

export interface Enrollment {
    id: string;
    user_id: string;
    course_id: string;
    course?: Course;
    status: 'active' | 'completed' | 'refunded' | 'suspended';
    enrolled_at: string;
    completed_at?: string;
    progress?: Progress[];
}

export interface Progress {
    id: string;
    enrollment_id: string;
    lesson_id: string;
    status: 'not_started' | 'in_progress' | 'completed';
    watch_percentage: number;
    completed_at?: string;
}

export interface Quiz {
    id: string;
    course_id: string;
    lesson_id?: string;
    title: string;
    description?: string;
    time_limit_seconds?: number;
    shuffle_questions: boolean;
    max_attempts: number;
    passing_score: number;
    is_published: boolean;
    questions?: Question[];
}

export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'code' | 'matching' | 'ordering' | 'essay';

/**
 * The shape a client actually receives (Question::forStudent). The answer key
 * and the `is_correct` flags on options are stripped until results are shown.
 */
export interface Question {
    id: string;
    type: QuestionType;
    body: string;
    points: number;
    order_index: number;
    options: Array<{ index: number; text: string }>;
    /** Present only on the results page. */
    correct_answer?: unknown;
    explanation?: string;
}

/** A question as rendered on the results page. */
export interface GradedQuestion extends Question {
    given_answer: unknown;
    is_correct: boolean | null;
}

export type QuizAnswer = number[] | string | Record<string, string>;

export interface QuizAttempt {
    id: string;
    user_id: string;
    quiz_id: string;
    answers: Record<string, unknown>;
    score?: number;
    points_earned: number;
    points_possible: number;
    status: 'in_progress' | 'submitted' | 'graded';
    started_at: string;
    submitted_at?: string;
}

export interface Assignment {
    id: string;
    course_id: string;
    lesson_id?: string;
    title: string;
    description?: string;
    deadline_at?: string;
    rubric?: Array<{ name: string; max_marks: number; description: string }>;
    max_marks: number;
    is_published: boolean;
}

export interface Submission {
    id: string;
    assignment_id: string;
    user_id: string;
    type: 'file' | 'repo' | 'link';
    file_url?: string;
    repo_url?: string;
    link_url?: string;
    notes?: string;
    marks_awarded?: number;
    feedback?: string;
    status: 'pending' | 'graded' | 'returned';
    graded_at?: string;
}

// ─── Commerce ───────────────────────────────────────────────────

export interface Payment {
    id: string;
    user_id: string;
    course_id: string;
    provider: 'stripe' | 'payhere' | 'paypal';
    amount: number;
    currency: string;
    discount_amount: number;
    status: 'pending' | 'completed' | 'refunded' | 'failed';
}

export interface Certificate {
    id: string;
    user_id: string;
    course_id: string;
    course?: Course;
    certificate_code: string;
    pdf_url?: string;
    issued_at: string;
}

// ─── Platform ───────────────────────────────────────────────────

export interface LoginSession {
    id: string;
    device_label?: string;
    ip_address?: string;
    location?: string;
    last_seen_at?: string;
    is_current?: boolean;
}

export interface Notification {
    id: string;
    type: string;
    data: Record<string, unknown>;
    read_at?: string;
    created_at: string;
}

// ─── Inertia Page Props ─────────────────────────────────────────

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: {
        user: User;
    };
    flash: {
        success?: string;
        error?: string;
        warning?: string;
        info?: string;
    };
    notifications_count?: number;
};
