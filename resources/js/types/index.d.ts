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
    assigned_instructor_id?: string | null;
    assigned_instructor?: Pick<User, 'id' | 'full_name' | 'email'> | null;
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
    /** Brand accent for the course (hex, e.g. #b9790a). */
    color?: string | null;
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
    assignments?: Assignment[];
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
    type: 'youtube' | 'live' | 'pdf' | 'quiz' | 'html';
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
    /** Only the course builder receives this, so the author can edit it. */
    content_ref?: string | null;
    has_presentation?: boolean;
    has_pdf?: boolean;
    /** Multi-format assets under this topic (student or tutor shape). */
    materials?: Array<{
        id: string;
        type: 'youtube' | 'pdf' | 'html' | 'live';
        title: string;
        order_index: number;
        has_video?: boolean;
        has_pdf?: boolean;
        has_presentation?: boolean;
        legacy?: boolean;
        scheduled_start?: string | null;
        duration_minutes?: number | null;
        zoom_join_url?: string | null;
        zoom_meeting_id?: string | null;
        zoom_passcode?: string | null;
        recording_url?: string | null;
        content_ref?: string | null;
        original_filename?: string | null;
        is_ready?: boolean;
    }>;
    quiz?: Quiz | null;
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
    zoom_meeting_id?: string;
    zoom_passcode?: string;
    recording_url?: string;
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

/**
 * Author-facing question shape (includes the answer key).
 */
export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'code' | 'matching' | 'ordering' | 'essay';

export interface AuthorQuestion {
    id: string;
    type: QuestionType;
    body: string;
    points: number;
    order_index: number;
    options?: Array<{ text: string; is_correct?: boolean }>;
    correct_answer?: number[] | string[] | null;
    explanation?: string | null;
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
    questions?: AuthorQuestion[];
}

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

export interface AssignmentQuestion {
    id: string;
    assignment_id: string;
    type: 'mcq' | 'short_answer' | 'normal';
    body: string;
    options?: Array<{ index?: number; text: string; is_correct?: boolean }>;
    correct_answer?: unknown;
    points: number;
    order_index: number;
}

export interface Assignment {
    id: string;
    course_id: string;
    lesson_id?: string;
    module_id?: string | null;
    order_index?: number;
    title: string;
    description?: string;
    deadline_at?: string;
    publish_at?: string | null;
    rubric?: Array<{ name: string; max_marks: number; description: string }>;
    max_marks: number;
    is_published: boolean;
    is_required?: boolean;
    questions?: AssignmentQuestion[];
}

export interface Submission {
    id: string;
    assignment_id: string;
    user_id: string;
    type: 'file' | 'repo' | 'link' | 'answers';
    file_url?: string;
    repo_url?: string;
    link_url?: string;
    notes?: string;
    answers?: Record<string, unknown>;
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
