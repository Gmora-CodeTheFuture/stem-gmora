# Complete Implementation Plan for a Modular STEM Learning Platform
Laravel 12 · Inertia.js · React · PostgreSQL · Eloquent · Redis · YouTube (Unlisted) · Zoom
Version 3.0 • August 2026
**Revision focus: Laravel migration for cost efficiency + platform security hardening + unlisted-YouTube video delivery architecture**

> **What changed from v2.0:** This revision migrates the technology stack from Next.js + NestJS (two separate deployables across Vercel + Railway) to **Laravel + Inertia.js + React** (a single deployable application on one affordable VPS). The product scope, feature set, and security model remain identical — only the implementation technology changes. The move consolidates infrastructure cost from ~$40–60/mo (Vercel Pro + Railway + Neon) down to **~$6–12/mo** (single DigitalOcean/Hetzner VPS managed by Laravel Forge). All [v2] security and video-protection additions are preserved. Changes from the original Next.js/NestJS plan are called out inline with a **[v3]** tag.

---

## Chapter 1: Startup Overview

### 1.1 Vision
Gmora STEM exists to make hands-on STEM education accessible, project-driven, and AI-augmented. Rather than a single-course video library, Gmora STEM is designed from day one as a modular STEM education ecosystem — a platform capable of hosting many subjects (AI, robotics, programming, mathematics, electronics, cybersecurity) without re-architecting the system for each new course.
"Learn. Build. Innovate."

**[v2]** Gmora STEM stores no video files itself — all lecture video lives on YouTube as **unlisted** uploads, and is only ever reachable through the platform's own access-controlled player. This keeps VPS/object-storage costs near zero for video while giving the platform full control over *who* can see a lesson and *when*.

### 1.2 Mission
- Deliver project-based STEM learning that goes beyond passive video-watching.
- Blend two delivery formats — embedded YouTube (unlisted) videos and live Zoom classes — inside a single unified lesson model.
- Use AI as a first-class learning companion: tutoring, quiz generation, code review, and personalized study plans.
- Build a portfolio-and-certification layer so students leave with proof of competence, not just a watch history.
- **[v2]** Protect paid course content and student data with an auditable, layered security model, not a single perimeter control.
- Create a long-term platform investment that can support a single AI course today and a multi-subject STEM ecosystem tomorrow.

### 1.3 Goals
**Business & Product Goals:**
1. Launch a professional, credible first course (AI Fundamentals) within a 2–4 week MVP window.
2. Establish a technical foundation that supports 1,000+ concurrent learners without a rewrite.
3. Build a modular monolith (Laravel) that can later be split into services as specific domains (video, AI, payments) outgrow the shared backend.
4. Create a brand and community layer (projects, discussions, hackathons) that increases retention beyond course completion.
5. Reach revenue sustainability through course sales, subscriptions, and later, organizational/school licensing.
6. **[v2]** Keep infrastructure cost near-flat as video content grows, by never hosting video bytes on Gmora's own servers.

### 1.4 Target Audience
- **Primary:** secondary and early university students (roughly ages 14–22) interested in AI, robotics, and programming who want project-based, portfolio-building education.
- **Secondary:** self-taught adult learners and career-switchers seeking structured, certificate-backed STEM upskilling.
- **Future:** schools and STEM clubs seeking an organization dashboard to manage cohorts of students under one subscription.
- **Future:** independent instructors who want to publish STEM courses on the platform under a revenue-share model.

> **[v2] Note on minors:** a meaningful share of the audience is under 18. This raises the bar on data protection (Chapter 7) and on video-link hygiene (Chapter 8) — a leaked unlisted link is worse when it can circulate among minors, so link-obfuscation and session-scoping are treated as required, not optional.

### 1.5 Business Model
- **Course sales:** One-time purchase per course, with regional pricing (Stripe internationally, PayHere in Sri Lanka).
- **Subscriptions (Phase 3+):** Monthly/annual access to the full course catalog plus AI features.
- **Certification fees:** Optional paid verification tier for certificates issued after project review.
- **Organization licensing (Phase 4):** Per-seat or per-cohort pricing for schools and STEM clubs.
- **Instructor marketplace (Future):** Revenue share when third-party instructors publish courses on Gmora STEM.

### 1.6 Product Composition
Gmora STEM is organized as four products under one brand, sharing one authentication system, one database, and one design system:
- **Gmora STEM Website:** Marketing, blog, events, careers
- **Gmora LMS:** Courses, lessons, certificates
- **Gmora Community:** Discussions, showcases, hackathons
- **Gmora AI:** Tutor, quiz generator, study planner

### 1.7 Growth Roadmap at a Glance
- **Phase 1 (Launch):** Marketing site, auth, one course, hybrid video lessons, certificates, **[v2] core content-protection layer**.
- **Phase 2 (Community):** Forums, profiles, project showcase, leaderboards, blog.
- **Phase 3 (AI Learning):** AI tutor, quiz/flashcard generation, personalized paths, code review.
- **Phase 4 (Ecosystem):** Multi-instructor, live classes at scale, mobile apps, career portal, organization dashboards.

---

## Chapter 2: System Overview

### 2.1 Platform Architecture
*(Build Phase: Phase 1 — core shape must exist at launch)*
Gmora STEM is built as a **modular monolith**: one Laravel application internally organized into domain-separated modules via Laravel's Service Providers and directory-based module structure (Auth, Courses, Learning, Payments, Notifications, AI, Community, Admin, **[v2] Video Access**). The frontend is rendered via **Inertia.js + React** within the same application — no separate frontend deployment needed. This gives the simplicity of a single deployable service today, with clean seams that allow any module to be extracted into its own microservice later without rewriting business logic. **[v3]**

**Architecture Flow:**
1. **CDN / WAF (Cloudflare)**: Static assets, edge caching, DDoS protection, **[v2] bot management + WAF rules in front of every route.**
2. **Laravel + Inertia.js + React Frontend**: Server-side rendered initial page load, then SPA-like navigation via Inertia. **[v3]**
3. **Laravel Backend**: Routes, controllers, Form Requests for validation, middleware for rate limiting. **[v3]**
4. **Service Providers / Modules**: Auth, Course, Notification, **[v2] Video Access Token Service.**
5. **PostgreSQL**: Primary data store via Eloquent ORM. **[v3]**
6. **Redis**: Sessions, cache, queues (Laravel Queue), leaderboards, **[v2] short-lived video-token store.**
7. **Object Storage (Cloudflare R2 or S3)**: PDFs, images, certificates. No video files — video is never uploaded to storage.
8. **Video Streaming**: YouTube **unlisted** videos, only ever resolved server-side and served through a token-gated embed. **[v2]**

*Why this shape:* **[v3]** A single Laravel application handles both frontend rendering (via Inertia.js) and backend logic, deployable on a single VPS (~$6–12/mo via DigitalOcean/Hetzner with Laravel Forge). Video delivery is entirely offloaded to YouTube's CDN while access control stays entirely inside Laravel. Scaling is straightforward: add a load balancer and more Laravel workers when needed, with Redis handling shared state.

### 2.2 Core User Journey
Discover (Website) → Sign Up → Enroll → Learn (Video/Live) → Practice (Quiz/Assignment) → Build (Project) → Certify → Showcase & Community.

### 2.3 High-Level Functional Workflows
- **Enrollment workflow:** browse catalog → view course detail → checkout (Stripe/PayHere) → access granted → dashboard updated.
- **Learning workflow:** open course → module list → lesson → **[v2] backend issues short-lived video access token** → mark complete → progress recalculated → next lesson unlocked.
- **Assessment workflow:** attempt quiz or submit assignment → auto-grade or route to instructor → feedback delivered → grade recorded → progress updated.
- **Certification workflow:** course progress reaches 100% → certificate job queued → PDF generated with QR verification → student notified → shareable on LinkedIn.
- **Content authoring workflow:** instructor uploads video to a Gmora-owned YouTube channel as **unlisted** → pastes the raw link into the CMS → backend stores only the extracted video ID server-side → instructor adds modules/lessons → submits for admin approval → publish → appears in public catalog **without ever exposing the raw YouTube ID to the public internet.** **[v2]**

### 2.4 Functional Scope
- **Marketing website:** Home, About, Courses, Blog, Events, Contact, SEO (Phase 1)
- **Authentication:** Email/password, Google, GitHub, email verification (Phase 1)
- **Course delivery:** Hybrid lessons, modules, progress (Phase 1)
- **Assessment:** Quizzes, assignments, project submission (Phase 1)
- **Certification:** Auto-generated certificates with QR verification (Phase 1)
- **[v2] Video content protection:** Token-gated unlisted-video resolution, domain-locked embeds, leak-tracing watermark (Phase 1)
- **Community:** Forums, groups, project showcase, hackathons (Phase 2)
- **Gamification:** XP, badges, streaks, leaderboards (Phase 2)
- **AI learning:** Tutor, quiz generator, study planner, code review (Phase 3)
- **Multi-instructor & orgs:** Marketplace, org dashboards, career portal (Phase 4)

### 2.5 Non-Functional Requirements
- **Availability:** 99.5% uptime for core LMS by Phase 2; 99.9% by Phase 4.
- **Performance:** Time-to-first-byte < 300ms on cached marketing pages; API p95 latency < 400ms.
- **Scalability:** Support 1,000+ concurrent learners at Phase 1–2 infrastructure sizing.
- **Security [v2, expanded]:** OWASP Top 10 mitigations, encrypted secrets in a managed vault, RBAC, full audit logging, WAF at the edge, dependency and container scanning in CI, quarterly access review, and a documented incident-response runbook (see Chapter 7).
- **Content protection [v2, new]:** No lesson's raw YouTube video ID is ever sent to an unauthenticated client; every embed is scoped to an enrolled, currently-authenticated session and expires automatically.
- **Accessibility:** WCAG 2.1 AA target for core learning flows.
- **Internationalization:** English at launch; architecture supports additional locales from Phase 2.
- **Maintainability:** Modular monolith with domain-separated Laravel modules (Service Providers). **[v3]**
- **Data durability:** Automated PostgreSQL backups, point-in-time recovery from Phase 2.

---

## Chapter 3: Technology Stack & User Roles

### 3.1 Recommended Stack Summary

**[v3] Core stack (migrated to Laravel for cost efficiency):**
- **Framework:** Laravel 12 (PHP 8.3+) — modular monolith, built-in auth/queue/cache/validation/ORM.
- **Frontend Bridge:** Inertia.js 2.x — server-driven SPA, no separate API layer needed.
- **Frontend:** React 19 + TypeScript — full React ecosystem within Laravel.
- **UI:** Tailwind CSS + shadcn/ui + Radix UI + Framer Motion.
- **Forms:** React Hook Form + Zod (client-side) + Laravel Form Requests (server-side).
- **Database:** PostgreSQL.
- **ORM:** Eloquent (Laravel's built-in ORM).
- **Cache/Queue:** Redis + Laravel Queue (replaces BullMQ — same Redis-backed queue, zero extra dependencies).
- **Search:** Meilisearch (via Laravel Scout).
- **Storage:** Laravel Filesystem with Cloudflare R2 or S3 driver — documents, images, certificates only.
- **Video:** YouTube — **unlisted** uploads, embedded only through the token-gated player (Chapter 8).
- **Live classes:** Zoom.
- **Auth:** Laravel Breeze + Sanctum (session-based auth with API tokens, lightweight and customizable).
- **Payments:** Stripe (via Laravel Cashier), PayHere, PayPal.
- **Email:** Laravel Mail with Resend driver (or Mailgun/SES).
- **Real-time:** Laravel Reverb (native WebSocket server) or Pusher.
- **Monitoring/Logging:** Sentry (via `sentry-laravel`), Laravel Telescope (dev), Laravel Pulse (production), Monolog.
- **Analytics:** PostHog + Google Analytics.
- **Testing:** PHPUnit + Pest (backend), Playwright (E2E), Vitest (React components).
- **CI/CD:** GitHub Actions.
- **Deployment:** Single VPS (DigitalOcean $6/mo or Hetzner $4/mo) managed by Laravel Forge (~$12/mo). No separate frontend hosting needed.

**[v3] Why this is more cost-effective:**
- **Before (Next.js + NestJS):** Vercel Pro ($20/mo) + Railway ($10-20/mo) + Neon ($19/mo) = **$49–59/mo minimum**.
- **After (Laravel):** Single VPS ($6–12/mo) + Forge ($12/mo) = **$18–24/mo total**, and scales further before needing additional servers.
- One codebase, one deployment, one server process. Laravel handles routing, auth, queues, mail, caching, and frontend rendering all in one.

**[v2] Security & video-protection additions:**

| Concern | Recommended tool | Why |
|---|---|---|
| Edge WAF + bot management | **Cloudflare WAF + Bot Fight Mode / Turnstile** | Blocks scraping bots that try to enumerate lesson URLs or brute-force the video-token endpoint before traffic even reaches Laravel. |
| Secrets management | **Laravel `.env` encrypted** + **Doppler** for production (or AWS Secrets Manager) | Keeps `YOUTUBE_API_KEY`, DB credentials, and signing keys out of Git; Laravel's `php artisan env:encrypt` provides an additional layer. |
| YouTube upload & metadata | **YouTube Data API v3** (OAuth2 service account on a Gmora-owned channel) | Lets the instructor CMS upload directly as **unlisted**, fetch duration/thumbnail, and confirm privacy status server-side rather than trusting a pasted link. |
| Video access tokens | **Short-lived signed token ("video ticket"), issued per lesson view, stored in Redis with a TTL** | This is the actual protection layer — see Chapter 8. The YouTube video ID is resolved server-side and never shipped to the client until a valid enrollment + session check passes. |
| Domain-restricted embeds | **YouTube IFrame Player API with `enablejsapi`, `origin`, and `playsinline` params; iframe served only from Gmora's own domain** | Reduces casual re-embedding on third-party sites; combined with Referrer-Policy headers. |
| Dependency/container scanning | **Trivy + `composer audit` in GitHub Actions** | Catches known CVEs in dependencies and Docker base images before deploy. **[v3]** |
| Runtime protection | **Laravel middleware (throttle, CSRF, CORS), security headers via middleware** | Laravel's built-in CSRF protection, rate limiting, and middleware stack provide equivalent hardening. **[v3]** |
| Audit/observability | **Monolog structured logs, Laravel Pulse for production monitoring, Sentry for errors** | Every video-token issuance and admin mutation is logged and queryable for incident response. **[v3]** |

> **Honesty note on unlisted-video protection:** "Unlisted" on YouTube means *not searchable and not listed on your channel* — it does **not** mean DRM-protected. Anyone who has the raw video URL can watch it outside your site, and no server-side wrapper can stop a determined user from screen-recording playback. The controls above (token-gated resolution, domain-restricted embeds, short TTLs, per-user watermarking) raise the cost of casual link-sharing and give you an audit trail to trace a leak back to an account — they don't make the content un-copyable. If a course tier truly needs hard DRM (widevine-style encryption, download-blocking, screen-recording resistance), that requires a paid video platform such as **Mux**, **Bunny Stream**, **Cloudflare Stream**, or **Vimeo Pro/OTT** instead of YouTube — worth flagging to stakeholders now so the trade-off (cost vs. protection strength) is a conscious decision, not a surprise later.

### 3.2 Why This Stack Scales to 1,000+ Concurrent Users
- **[v3] Application** scales by adding more Laravel workers behind a load balancer (Nginx); Redis handles shared state including sessions and the video-token store. A single $6 VPS with PHP-FPM + OPcache handles ~500-1,000 concurrent users; a second VPS doubles capacity.
- **[v3] Frontend** is served by the same Laravel application via Inertia.js — no separate frontend scaling needed. Cloudflare CDN handles static asset caching.
- **Database** scales vertically first, then horizontally via read replicas.
- **Video** is entirely offloaded to YouTube's own CDN — Gmora's infrastructure only ever handles small signed tokens, never video bytes. **[v2]**
- **Queues** (Laravel Queue with Redis) absorb spiky workloads (certificates, emails, token cleanup). **[v3]**

### 3.3 User Roles
- **Visitor:** Browsing marketing pages (P1)
- **Student:** Enrolled learner (P1)
- **Instructor:** Creates and manages courses, grading, uploads videos to the Gmora YouTube channel (P1)
- **Teaching Assistant:** Grading and discussion moderation only (P2)
- **Course Manager:** Oversees a group of instructors/courses (P2)
- **Platform Admin:** Manages users, course approval, payments, CMS (P1)
- **Super Admin:** Full system access, **[v2] including secrets rotation and security audit log access** (P1)
- **Organization Admin:** Manages a school/club's cohort (P4)
- **Parent:** Viewer role for a minor's progress (Future)

---

## Chapter 4: Complete Feature Specification

### 4.1 Marketing Website (Phase 1)
- **Home:** Hero CTA, animated statistics, "Why Gmora STEM", featured courses, testimonials.
- **About:** Story, mission, vision, values, team, roadmap, FAQs.
- **Courses:** Search, filters, course cards.
- **Course Detail:** Overview, curriculum, projects, instructor bio, certificate preview, reviews. **[v2] Preview lessons use a separate, genuinely-public YouTube upload (not the unlisted course video), so marketing pages never touch the protected catalog.**
- **Blog:** Articles, categories, search, tags.
- **Resources:** Free PDFs, cheat sheets, templates.
- **Events:** Workshops, hackathons, registration.
- **Pricing:** Plan comparison, regional pricing.
- **Contact:** Form, map, social links.

### 4.2 Authenticated LMS — Student Dashboard (Phase 1)
- **Continue Learning:** Resume the last-viewed lesson.
- **Next Live Class:** Countdown, join button.
- **Progress Overview:** Charts for overall progress.
- **Upcoming Deadlines / Recent Lessons.**
- **Certificates & Announcements.**
- **Sidebar navigation:** Dashboard, My Courses, Projects, Assignments, Certificates, Community, Calendar, Profile, Settings.

### 4.3 Inside a Course (Phase 1)
**Structure:** Modules → Lessons → (Video / Notes / Resources / Assignments / Quiz / Discussion) → Completion.
- **Video Player Features:** Resume-from-last-position, speed control, captions, PiP, timestamped bookmarks. **[v2] Player is initialized only after a valid video-access token is fetched from the backend — see Chapter 8.**
- **Notes System:** Students can write/highlight notes, export to PDF, search.

### 4.4 Quiz System (Phase 1 core; AI generation P3)
- **Question types:** Multiple choice, true/false, fill-in-the-blank, programming/code, image-based, matching, ordering, essay.
- **Features:** Timer, shuffled questions, auto-grading, manual grading queue, per-question leaderboard.

### 4.5 Assignments & 4.6 Project Submission
- **Assignments (Phase 1):** PDF, images, ZIP, GitHub link, Google Drive link. Supports rubric, marks, feedback.
- **Project Submission (Phase 1):** Title, description, GitHub link, live demo link, screenshots, presentation file. Showcase in Phase 2.

### 4.7 Certificates & 4.8 Discussion & Community
- **Certificates (Phase 1):** Auto-generated on 100% completion, unique ID, QR verification, LinkedIn share.
- **Discussion (Phase 2):** Discord-style per course. Threaded replies, pinned posts, @mentions.

### 4.9 Student Profile & 4.10 Instructor Dashboard
- **Student Profile (Phase 2):** Photo, bio, skills, achievements, portfolio.
- **Instructor Dashboard (Phase 1):** Manage courses, lessons, assignments, students, certificates, **[v2] video upload status (processing / unlisted-confirmed / published) pulled from the YouTube Data API.**

### 4.11 Admin Dashboard & 4.12 Gamification
- **Admin Dashboard (Phase 1):** User management, payments, reports, roles, website CMS, **[v2] security & access log viewer, video-token issuance monitor.**
- **Gamification (Phase 2):** XP, levels, badges, leaderboards, streaks.

### 4.13 Search & 4.14 Notifications
- **Search (Phase 2):** Global search via Meilisearch.
- **Notifications (Phase 1):** Assignment due, quiz results. Messaging in Phase 2. **[v2] Security alert: new-device login notification, sent by email.**

### 4.15 Payments & 4.16 User Settings
- **Payments (Phase 1):** Stripe, PayHere. Promo codes, invoices.
- **Settings (Phase 1):** Theme, password, 2FA, language. **[v2] "Active sessions" panel so a student can see and revoke logged-in devices — closes off one route by which a shared account leaks video tokens.**

### 4.17 Career Section & 4.18 AI Features
- **Career (Phase 4):** Internships, job board, resume builder.
- **AI Features (Phase 3):** AI Tutor, Quiz Generator, Flashcards, Study Plan, Code Review, Project Assistant, Learning Analytics.

---

## Chapter 5: Database Design

### 5.1 Design Principles
- Every table uses a **UUID primary key** (via Laravel's `Str::uuid()` or `$table->uuid('id')->primary()`), avoiding sequential-ID enumeration attacks. **[v3]**
- Standard audit fields on every table: `created_at`, `updated_at`, and `deleted_at` (soft delete via Eloquent's `SoftDeletes` trait). **[v3]**
- Foreign keys are indexed by default; composite indexes are added for common query patterns.
- **The unified lesson model** (Section 5.3.4) stores a `type` discriminator column so YouTube, live, PDF, and quiz lessons all live in one table — the single most important schema decision in this system.
- **[v2]** The raw YouTube video ID (`content_ref`) is never returned by any public/list API response — it is only ever read inside the backend when minting a video-access token (Chapter 8). List/catalog endpoints return a `has_video: boolean` flag instead.
- **[v3]** Laravel migrations are the source of truth for the schema. Eloquent models define relationships, casts, hidden attributes, and scopes. The `content_ref` field is added to every Lesson model's `$hidden` array as a defense-in-depth measure.

### 5.2 Entity-Relationship Overview
- **Identity/Catalog Entities**: Role, User, Course, Module, Payment, Enrollment, Quiz, Assignment.
- **Learner-Activity Entities**: Progress, Lesson, Question, LiveSession, Certificate, Submission, Attempts.
- **[v2] Security/Access Entities**: `video_access_tokens`, `audit_logs`, `login_sessions`.

### 5.3 Core Tables

#### 5.3.1 `users`
`id` (PK), `email` (unique), `password_hash` (nullable), `full_name`, `avatar_url`, `role_id`, `email_verified_at`, `two_factor_enabled`, `locale`, `last_login_at`, audit fields.

#### 5.3.2 `courses`
`id` (PK), `instructor_id`, `title` / `slug`, `subtitle`, `description`, `category` (AI, Robotics, Programming...), `difficulty`, `language`, `price`, `thumbnail_url`, `status` (draft / pending_review / published / archived), `duration_minutes`, audit fields.

#### 5.3.3 `modules`
`id` (PK), `course_id`, `title`, `order_index`, `is_published`.

#### 5.3.4 `lessons` — the unified lesson model
`id` (PK), `module_id`, `title`, `type` (enum: `youtube` | `live` | `pdf` | `quiz`), `order_index`, `content_ref` (YouTube ID or PDF file key — **[v2] never exposed to public API responses**), `live_session_id`, `duration_seconds`, `is_free_preview`, `is_published`, audit fields.

#### 5.3.5 `live_sessions`
`id` (PK), `lesson_id`, `title`, `scheduled_start`, `duration_minutes`, `zoom_join_url`, `zoom_meeting_id`, `zoom_passcode`, `recording_url`.

#### 5.3.6 `enrollments` & `progress`
- **enrollments**: `id`, `user_id`, `course_id`, `status` (active / completed / refunded), `enrolled_at`.
- **progress**: `id`, `enrollment_id`, `lesson_id`, `status` (not_started / in_progress / completed), `watch_percentage`, `completed_at`.

#### 5.3.7 `quizzes`, `questions` & `attempts`
- **quizzes**: `id`, `course_id`, `title`, `time_limit_seconds`, `shuffle`, `max_attempts`.
- **questions**: `id`, `quiz_id`, `type` (mcq, true_false, etc), `body`, `options`, `points`.
- **attempts**: `id`, `user_id`, `quiz_id`, `answers`, `score`, `submitted_at`.

#### 5.3.8 `assignments` & `submissions`
- **assignments**: `id`, `course_id`, `title`, `description`, `deadline_at`, `rubric`, `max_marks`.
- **submissions**: `id`, `assignment_id`, `user_id`, `type`, `file_url`, `repo_url`, `marks_awarded`, `feedback`, `status`.

#### 5.3.9 `certificates` & `payments`
- **certificates**: `id`, `user_id`, `course_id`, `certificate_code`, `pdf_url`, `issued_at`.
- **payments**: `id`, `user_id`, `course_id`, `provider`, `amount`, `currency`, `status`, `provider_reference`.

#### 5.3.10 `video_access_tokens` — **[v2, new]**
`id` (PK), `user_id`, `lesson_id`, `enrollment_id`, `token_hash`, `issued_at`, `expires_at` (default TTL 15 min), `client_ip_hash`, `user_agent_hash`, `revoked_at`. Backed by a mirrored Redis key (`video_token:{token}` → `{userId, lessonId, exp}`) for fast validation on every player heartbeat via `Cache::get()`; the Postgres row is the durable audit trail. **[v3]**

#### 5.3.11 `audit_logs` — **[v2, moved up from Phase 2 to Phase 1]**
`id`, `actor_id`, `action`, `entity_type`, `entity_id`, `diff jsonb`, `ip_address`, `created_at`. Every admin mutation, video-token issuance, and role change is written here — required from launch, not deferred, since the platform handles minors' data and paid content from day one.

#### 5.3.12 `login_sessions` — **[v2, new]**
`id`, `user_id`, `refresh_token_hash`, `device_label`, `ip_address`, `created_at`, `last_seen_at`, `revoked_at`. Powers the "active sessions" settings panel (4.16) and lets support/admin force-revoke a compromised account.

### 5.4 Indexing Strategy
- Unique composite index on `(user_id, course_id)` for `enrollments` to prevent double-enrollment.
- Index on `lessons(module_id, order_index)` to serve ordered lesson lists efficiently.
- Index on `progress(enrollment_id)` for fast progress-bar recalculation.
- Full-text/GIN index on `courses(title, description)` as fallback until Meilisearch is introduced.
- `deleted_at IS NULL` partial indexes on all frequently queried tables.
- **[v2]** Index on `video_access_tokens(expires_at)` for a scheduled Laravel Queue job (dispatched hourly via `schedule:run`) that purges expired tokens. **[v3]**
- **[v2]** Index on `audit_logs(actor_id, created_at)` and `(entity_type, entity_id)` for fast incident-response queries.

### 5.5 Soft Delete & Audit Strategy
All destructive operations set `deleted_at`. The `audit_logs` table (**[v2] Phase 1, not Phase 2**) records `actor_id`, `action`, `entity_type`, `entity_id`, `diff jsonb`, and `created_at` for every admin-level mutation and every video-token issuance.

---

## Chapter 6: Backend & Frontend Architecture

### 6.1 Laravel Backend Architecture **[v3]**
**Modular Monolith**: Domains organized as directory-based modules within a single Laravel application, each registered via its own Service Provider. Module structure follows `app/Modules/{ModuleName}/` with Controllers, Services, Models, Requests, Events, and Policies per module. Modules: Auth, Users, Courses, Learning, Live, Assessment, Assignments, Certificates, Payments, Notifications, Community, AI, Admin, **[v2] VideoAccess, Audit**.

#### 6.1.3 Cross-Cutting Concerns **[v3]**
- **Middleware**: `auth:sanctum` for authentication, custom `RoleMiddleware` reading role from the authenticated user, **[v2] `EnsureEnrolled` middleware (verifies active enrollment before any lesson/video route resolves) and `ValidateVideoToken` middleware (validates the signed ticket on every player poll).**
- **API Resources**: Eloquent API Resources for response transformation — `content_ref` is placed in the Lesson model's `$hidden` array and additionally stripped by a global `ContentRefResource` wrapper as defense-in-depth.
- **Exception Handler**: `app/Exceptions/Handler.php` normalizing error responses into `{ data, meta, error }` envelope.
- **Validation**: Laravel Form Requests with built-in validation rules (server-side) + Zod (client-side React forms).
- **Event-driven design**: Laravel Events & Listeners (e.g., `LessonCompleted`, **[v2] `VideoTokenIssued`, `SuspiciousLogin`**) dispatched and consumed by decoupled listeners (e.g., Certificates, Notifications, Audit). Queued listeners run on Laravel Queue workers.

### 6.2 Inertia.js + React Frontend Architecture **[v3]**
#### 6.2.1 Page Structure
React pages organized under `resources/js/Pages/`: `Marketing/`, `Auth/`, `Dashboard/`, `Courses/`, `Instructor/`, `Admin/`. Shared components in `resources/js/Components/`, layouts in `resources/js/Layouts/`, hooks in `resources/js/Hooks/`.

#### 6.2.2 Server vs. Client Rendering **[v3]**
- Marketing pages and course catalog are server-rendered by Laravel and hydrated by Inertia.js for fast, SEO-friendly delivery. Laravel's built-in route caching and page caching (via Cloudflare) provide equivalent performance to ISR.
- The lesson player, quiz interface, and dashboards are fully interactive React components. **[v2] The lesson player specifically never receives the YouTube video ID as an Inertia page prop — it fetches a fresh access token via an XHR call after mount, so the ID never appears in page source or SSR HTML.**
- Data fetching: Inertia props are passed from Laravel controllers directly to React pages — no separate API layer needed for most flows. The video-token endpoint is a dedicated API route.

#### 6.2.3 Authentication Flow **[v3]**
1. User submits credentials or completes OAuth on `/login`.
2. Laravel Sanctum creates a session-based authentication cookie (HTTP-only, `SameSite=Lax`).
3. Inertia.js middleware (`HandleInertiaRequests`) shares the authenticated user with every page via `$page.props.auth`.
4. Protected routes use `auth:sanctum` middleware — unauthenticated users are redirected to `/login`.
5. **[v2]** On login from a new device/IP, a `login_sessions` row is created and a notification email is queued via Laravel Queue.

### 6.3 Layered Request Flow **[v3]**
Browser → Inertia.js request → Laravel Route → Middleware → Controller → Service Layer → Eloquent / Redis → Inertia Response (React page props)
**[v2] Video path specifically:** Browser (player mounts, no video ID yet) → Laravel `VideoAccessController` (checks `EnsureEnrolled` middleware) → issues signed ticket (Redis, 15 min TTL) → Browser initializes YouTube IFrame Player with the now-resolved ID → Player heartbeats re-validate the ticket every 60s → ticket expires or is revoked on logout/session-revoke.

---

## Chapter 7: Authentication, Authorization & Security

### 7.1 Authentication Strategy **[v3]**
- **Providers**: Email/password via Laravel Breeze, Google/GitHub OAuth via Laravel Socialite.
- **Session model**: Laravel Sanctum session-based authentication with HTTP-only, secure, `SameSite=Lax` cookie. For mobile API access (Phase 4), Sanctum API tokens.
- **Email verification**: Laravel's built-in `MustVerifyEmail` contract. Required before a student can enroll in a paid course.
- **Password reset**: Laravel's built-in password reset with time-boxed, single-use tokens, delivered via Resend (Laravel Mail driver).
- **Two-factor authentication**: TOTP-based (via a package like `pragmarx/google2fa-laravel`). **[v2] Moved to Phase 1 for Instructor/Admin/Super Admin roles** (student 2FA stays Phase 2, opt-in) — the accounts that can publish content or issue refunds are the highest-value targets and should be hardened first.

### 7.2 Authorization (RBAC) **[v3]**
Roles enforced via custom `RoleMiddleware` (e.g., `->middleware('role:admin,instructor')`) and Laravel Policies for row-level ownership checks (e.g., `CoursePolicy@update` ensures an instructor may only edit *their own* courses unless they hold `platform_admin`). **[v2]** Video-access checks are a separate, additional layer on top of RBAC: even a valid `student` role must also hold an `active` enrollment row for that specific course before a token is issued.

### 7.3 **[v2, new] Defense-in-Depth Summary**
Security is treated as layers, not a single gate — if one layer is bypassed, the next still holds:
1. **Edge**: Cloudflare WAF, DDoS protection, bot management, geo/rate rules on auth and token endpoints.
2. **Transport**: HTTPS/HSTS everywhere, TLS-only Postgres/Redis connections.
3. **Identity**: JWT + rotating refresh tokens, 2FA for privileged roles, active-session visibility for all users.
4. **Authorization**: RBAC + row-level ownership + enrollment-scoped video tokens.
5. **Data**: Encrypted secrets at rest (Doppler/Secrets Manager), Eloquent parameterized queries (built-in SQL injection protection), `content_ref` in Lesson model's `$hidden` array and never serialized to Inertia props or API Resources. **[v3]**
6. **Application**: Security headers via middleware, strict CSP, Laravel's built-in CSRF protection (`@csrf`/`X-CSRF-TOKEN`), Form Request validation on every controller method. **[v3]**
7. **Supply chain**: Trivy + `composer audit` gates in CI, pinned dependency versions, signed container images. **[v3]**
8. **Observability**: Structured audit log for every sensitive action, Sentry error tracking, Laravel Pulse for production monitoring, alerting on anomalous token-issuance rates (a spike suggests scraping). **[v3]**

### 7.4 Security Controls
- **Transport**: HTTPS everywhere, HSTS.
- **Passwords**: bcrypt/argon2 hashing.
- **Sessions**: HTTP-only, secure cookies, refresh-token rotation, **[v2] user-visible active-session list with remote revoke.**
- **CSRF**: Laravel's built-in CSRF token middleware (automatic for all POST/PUT/PATCH/DELETE); Inertia.js includes the token automatically. **[v3]**
- **XSS**: React's default escaping + Laravel's Blade escaping for any server-rendered fragments, strict Content-Security-Policy headers.
- **SQL Injection**: Eloquent parameterized queries (built-in). **[v3]**
- **Rate limiting**: Laravel's built-in `throttle` middleware (Redis-backed) on auth endpoints and public APIs, **[v2] with a tighter, dedicated limit on the video-token endpoint (e.g. 1 issuance per lesson per 30s per user) to blunt scripted scraping.**
- **CORS**: Laravel's built-in CORS middleware (`config/cors.php`). **[v3]**
- **Headers**: Security headers middleware (custom or via `bepsvpt/secure-headers` package). **[v3]**
- **File Upload**: Type/size validation via Form Requests, signed URLs for private R2/S3 buckets via Laravel's `temporaryUrl()`.
- **[v2] Secrets management**: All API keys/DB credentials in Doppler or AWS Secrets Manager, injected at deploy time, rotated quarterly, never committed to Git (enforced via `gitleaks` pre-commit hook and CI scan). Laravel Forge manages environment variables securely on the server.
- **[v2] Vulnerability management**: Automated dependency scanning (`composer audit`/Dependabot) and container scanning (Trivy) on every PR; a lightweight annual third-party penetration test once Phase 2 revenue justifies the spend. **[v3]**

### 7.5 **[v2, new] Video Content Security**
See Chapter 8.4 for the full design. Summary of controls:
- Raw YouTube video IDs are never sent to a client until a valid, enrollment-scoped, short-lived token is issued.
- Embeds are served only from Gmora's own domain, with `origin` restriction on the YouTube IFrame Player.
- Each active playback session is tagged with an invisible, per-user watermark overlay (name/email fragment) rendered in the player UI, so a screen-recorded leak can be traced back to the source account.
- Token issuance and playback heartbeats are logged to `audit_logs`; anomalous patterns (same token from many IPs, rapid re-issuance) raise a `security.suspicious_login`-style alert.
- **This is deterrence and traceability, not DRM** — see the honesty note in Chapter 3.1. It stops casual re-sharing and gives you a way to identify and act on repeat offenders (revoke enrollment, disable account), which for most course-piracy scenarios is the realistic, proportionate control.

### 7.6 Payment & PII Handling
Card data never touches Gmora STEM's servers — Stripe Checkout and PayHere hosted flows handle card entry directly. PII is limited to what each module needs. **[v2]** Student PII (especially for under-18 users) is scoped with its own row-level access policy: only `platform_admin`/`super_admin` and the student's own enrolled instructor(s) can read full profile data; TA/course-manager roles see pseudonymized identifiers in grading views where possible.

---

## Chapter 8: Course Management, Learning System & Video Architecture

### 8.1 Hybrid Delivery Model
Gmora STEM supports two lesson delivery modes inside a single course:
- **YouTube Video (Unlisted)**: Instructor uploads directly to a Gmora-owned YouTube channel as **unlisted**; the LMS resolves and embeds it only for authorized viewers. **[v2]**
- **Live Zoom** (Essential): Scheduled sessions with join link, meeting ID, passcode.

### 8.2 The Unified Lesson Model
A single `lessons` table with a `type` discriminator column supports all current and future lesson formats (video, live, pdf, quiz) without redesigning the system.

### 8.3 Video Lessons
- **YouTube**: Backend calls the YouTube Data API for title, thumbnail, duration, **and privacy-status confirmation (must read back as `unlisted`, never `public`, before the lesson can be published) [v2]**. Player features: resume playback, speed control, captions, auto-complete at 90% watched using the YouTube IFrame Player API.

### 8.4 **[v2, new] Unlisted-Video Access Control Design**
This is the core mechanism that lets Gmora post lesson video as YouTube-unlisted while still keeping it behind the platform's own access control.

**Upload flow (instructor side):**
1. Instructor uploads the file through the Gmora CMS, which calls the **YouTube Data API v3** (OAuth2, Gmora channel) with `privacyStatus: "unlisted"`.
2. Backend stores only the returned video ID in `lessons.content_ref` — this field is placed in the Eloquent model's `$hidden` array and excluded from every API Resource and Inertia prop by default. **[v3]**
3. A scheduled job periodically re-checks each video's privacy status via the API and alerts an admin if any video is ever found flipped to `public` (misconfiguration or account compromise).

**Playback flow (student side):**
1. Student opens a lesson. The Inertia.js React page mounts an *empty* player shell — no video ID present anywhere in the HTML/JS sent to the browser (the `content_ref` is in the model's `$hidden` array and never passed as an Inertia prop). **[v3]**
2. Client calls `POST /api/v1/learning/lessons/{id}/video-token` (a dedicated API route, not an Inertia route).
3. Laravel runs `auth:sanctum` → `EnsureEnrolled` middleware (is this user actively enrolled in this lesson's course?) → controller issues a signed, single-purpose token ("video ticket") with a 15-minute TTL, stored in Redis via `Cache::put()`. **[v3]**
4. Response returns `{ videoId, ticket }` to the authenticated client only.
5. Client initializes the YouTube IFrame Player with the ID, `origin` locked to Gmora's domain, and `enablejsapi=1`.
6. Every ~60 seconds the player pings `GET /api/v1/learning/video-token/{ticket}/heartbeat`; if the ticket is expired, revoked (e.g. the user logged out elsewhere), or the enrollment lapsed (refund), playback is stopped and a fresh token must be requested. **[v3]**
7. A lightweight watermark overlay (student's first name + last 4 of user ID, low-opacity, corner-positioned) renders over the player chrome — not into the YouTube stream itself, but into the surrounding page — as a leak-tracing deterrent.

**What this buys you / what it doesn't:**
- ✅ Casual link-sharing is blocked — nobody outside your backend ever sees the raw watchable URL.
- ✅ Revoked/refunded students lose access within one heartbeat interval (~60s), not just "next login."
- ✅ Every token issuance is auditable, so repeat abuse is traceable to an account.
- ❌ It does **not** stop screen recording, and it does not stop someone who is a *legitimate, currently-enrolled* student from downloading the video with third-party tools while their session is valid — no YouTube-based approach can fully prevent this. If that risk needs to be closed further, see the DRM alternative note in Chapter 3.1.

### 8.5 Live Zoom Classes
Stores title, date, duration, Zoom join URL. Phase 1: manual links. Phase 2: Zoom OAuth automation. **[v2]** Join links are similarly only shown to actively-enrolled students within a time window around the scheduled start, rather than being visible indefinitely in the lesson list.

### 8.8 Learning Progress Tracking
Progress rolled up: `course` → `module` → `lesson` → `quiz` → `assignment/project`. 100% course completion triggers the certificate-generation job.

### 8.9 Course Authoring & Publishing Workflow
1. Instructor creates course in `draft` status, builds modules/lessons, uploads unlisted videos.
2. Instructor submits for review (`pending_review`).
3. Admin reviews content quality, pricing, metadata, **and confirms every video resolves as `unlisted` (not `public`/`private`) via the automated check [v2]** → approves (`published`).
4. Course appears in public catalog — with `content_ref` still withheld from every public response.

### 8.10 Notes, Bookmarks & Discussion
Per-lesson notes are timestamp-synced with video. Bookmarks jump directly to saved timestamp. Discussion threads scoped per lesson or per course.

---

## Chapter 9: Payments, Notifications & Community

### 9.1 Payment System
#### 9.1.1 Providers
- **Stripe**: International card payments, subscriptions (Phase 3). Stripe Checkout used for PCI-DSS scope reduction.
- **PayHere**: Local payment rails for Sri Lankan students (cards, mobile wallets).
- **PayPal**: Optional secondary option for international students.

#### 9.1.2 Enrollment Lifecycle
Checkout Initiated → Payment Processing → Webhook Confirms → Enrollment Activated → Access Granted (**[v2] including immediate eligibility for a video access token**)

#### 9.1.3 Supporting Features
Promo codes (percentage/fixed-amount), scholarships (admin-granted free enrollment), auto-generated invoices, and a refund workflow that reverses `enrollments.status` to `refunded`, revokes access, **and immediately invalidates any live video tokens for that user/course [v2]**, while preserving the payment record.

### 9.2 Notification System
All outbound notifications are queued through **Laravel Queue** (Redis driver) so a spike (e.g., assignment deadline) never blocks the request cycle; queue workers process jobs using Resend via Laravel Mail. Laravel's built-in notification system (`Notifiable` trait) provides a unified API for in-app, email, and future SMS/push channels. **[v3]**
- **Assignment due soon / Quiz result ready**: In-app + email.
- **New announcement**: In-app + email digest.
- **New message**: In-app (real-time via Socket.IO) + email if unread after a delay.
- **Certificate ready**: In-app + email with download link.
- **[v2] New device/location login**: Email alert with an "this wasn't me" revoke-session link.

### 9.3 Messaging (Phase 2)
Direct messaging between student/instructor and student/student, plus group chat with attachments. Backed by **Laravel Reverb** (native WebSocket server) for real-time delivery and PostgreSQL for message history. **[v3]**

### 9.4 Community (Phase 2)
- **Discussion (Discord-style)**: Per-course and per-lesson boards with threaded replies, instructor-highlighted answers, pinned posts, solved-marking, @mentions.
- **Groups**: Student-created, topic-scoped groups with shared resources.
- **Events**: Workshops, hackathons, and challenges.
- **Project showcase**: Approved project submissions become public, filterable portfolio entries.
- **Student profile**: Bio, skills, achievements, certificates, GitHub/LinkedIn.

---

## Chapter 10: AI Features & Admin CMS

### 10.1 AI as a Separate Service (Phase 3)
AI capabilities are implemented behind a single `AI` module (Service Provider + service classes) in the Laravel backend, which wraps calls to the underlying AI provider(s). This isolation means the AI layer can evolve independently of the core LMS. **[v2]** API keys for the AI provider live in the same secrets manager as everything else, and prompts/responses involving student work are logged for abuse review without being exposed in client-side network calls. **[v3]**

### 10.2 AI Feature Catalog
- **AI Tutor**: Natural language Q&A grounded in course content.
- **AI Quiz Generator**: Generates practice quizzes from lesson transcripts.
- **AI Flashcards**: Spaced-repetition review.
- **AI Study Plan**: Personalized roadmap across enrolled courses.
- **AI Code Review**: Reviews programming assignments for correctness and style (assistive, not replacing instructor).
- **AI Project Assistant**: Suggests improvements to submitted projects.
- **AI Learning Analytics**: Mines history to surface weak topics.
- **AI Chat with Course PDFs / Homework Helper / Exam Practice**.
*Guardrails*: AI-generated grades and feedback are treated as assistive, not final.

### 10.3 Admin CMS
- **Admin Dashboard Screens**: User Management, Instructor Approval, Course Approval, Payments, Reports & Analytics, Roles & Permissions, Website CMS, Support Tickets, Logs & Security **[v2 — includes video-token issuance monitor and audit-log search]**.
- **Website CMS Model**: Marketing content (home page sections, FAQs) is stored as structured rows in a lightweight `content_blocks` table (`page`, `section_key`, `json_content`, `is_published`) to allow non-engineers to update copy.

---

## Chapter 11: Performance, Scalability, DevOps & API

### 11.1 Performance & Scalability **[v3]**
#### 11.1.1 Caching Strategy
- **CDN (Cloudflare)**: Static assets, images, marketing pages, **[v2] plus WAF rule evaluation on every request.**
- **Laravel Page Cache**: Marketing and course-catalog pages cached via Cloudflare or Laravel's route caching. Inertia.js page responses cached at the CDN layer via `Cache-Control` headers.
- **Redis**: Session data, computed progress summaries, leaderboards, rate-limit counters, **[v2] video access tokens.** Accessed via Laravel's `Cache` facade.
- **OPcache**: PHP OPcache enabled for bytecode caching — dramatic performance improvement at zero cost.
- **Database**: Materialized/denormalized fields (e.g. `courses.duration_minutes`), Eloquent eager loading to eliminate N+1 queries.

#### 11.1.2 Queueing **[v3]**
Laravel Queue (Redis driver) absorbs bursty background work so user-facing request latency stays flat (Certificate PDF generation, transactional email via Laravel Notifications, notification fan-out, **[v2] hourly expired video-token cleanup via `schedule:run`, periodic YouTube privacy-status re-check**). Queue workers managed by Supervisor on the VPS, or by Laravel Forge's built-in worker management.

#### 11.1.3 Scaling Path **[v3]**
- **0–1,000 users**: Single VPS ($6–12/mo, DigitalOcean/Hetzner), Forge-managed Nginx + PHP-FPM + Redis + PostgreSQL (all on one box).
- **1,000–10,000 users**: Separate database server; add a second application VPS behind a load balancer; Postgres read replicas; dedicated Redis instance.
- **10,000+ users**: Multiple Laravel workers behind a load balancer (Forge supports multi-server deployments); extract highest-load modules (Notifications, **[v2] Video Access**) into standalone Laravel services or queue-only workers; add Meilisearch cluster.

### 11.2 DevOps **[v3]**
- **Environments**: `local` (Laravel Sail / Docker Compose) → `staging` (mirrors prod, Forge-managed) → `production` (Forge-managed).
- **CI/CD Pipeline**: GitHub Actions running `php-cs-fixer` (lint), `phpstan` (static analysis), `php artisan test` (Pest/PHPUnit), Vite build, **[v2] dependency scan (`composer audit`/Dependabot), secret scan (gitleaks)**, and deploy via Forge's deployment webhook (auto to staging, manual approval for prod).
- **Infrastructure**: Single VPS managed by Laravel Forge (Nginx, PHP-FPM, Redis, Supervisor for queue workers), PostgreSQL (same VPS initially, separate server later), Sentry for errors, Laravel Pulse for production monitoring, Monolog for structured logs.

### 11.3 API Documentation **[v3]**
- **Conventions**: REST resources under `/api/v1/...`. API documentation via `knuckleswtf/scribe` (auto-generated from Laravel routes, Form Requests, and docblocks) — **[v2] the video-token endpoints are explicitly excluded from the public API docs.**
- **Consistent response envelope**: `{ data, meta, error }` via Laravel API Resources.
- **Pagination**: via `?page=&per_page=` with Laravel's built-in paginator response (`total`, `current_page`, `last_page`, `per_page`).

---

## Chapter 12: UI/UX Specification, Roadmap & Future Vision

### 12.1 UI/UX Specification
- **Design System**: Navy/blue primary, teal and violet accents. Sans-serif for UI (Inter/Outfit via Google Fonts), monospace for code blocks (JetBrains Mono). 4px base spacing unit (8/16/24/32px rhythm).
- **Components**: shadcn/ui + Radix primitives for accessibility out of the box — used within Inertia.js React pages. **[v3]**
- **Motion**: Framer Motion for purposeful transitions (page transitions, card hover) — never decorative-only animation that delays task completion.
- **Build**: Vite (Laravel's default frontend bundler) for fast HMR in development and optimized production builds. **[v3]**
- **Accessibility & Responsive**: WCAG 2.1 AA target. Mobile-first layouts. Dark mode is a first-class theme.

### 12.2 Development Roadmap
- **Phase 1 – Launch (14–21 day MVP target)**: Website + Auth (Laravel Breeze + Sanctum) + One Course + Certificates + **[v2] video access token layer + WAF + secrets manager + audit logging** (pulled forward from later phases). Includes Stripe (Laravel Cashier)/PayHere, YouTube unlisted video embeds, Quiz system basics. **[v3] Single VPS deployment via Laravel Forge.**
- **Phase 2 – Community**: Forums + Profiles + Gamification + Blog, student 2FA, Laravel Reverb for real-time messaging.
- **Phase 3 – AI Learning**: Tutor + Quiz Gen + Study Plans + Code Review.
- **Phase 4 – Ecosystem**: Multi-instructor + Live at Scale + Mobile (React Native or API-first with Sanctum tokens) + Career Portal + **[v2] evaluate migrating premium tiers to a DRM video platform (Mux/Bunny/Cloudflare Stream) if piracy becomes a material revenue problem.**

### 12.3 Future Vision & Closing Summary
Future features include offline learning, multi-language support, white-label LMS offerings, and virtual labs. **[v3]** Gmora STEM's architecture (modular monolith on Laravel + Inertia.js + React + PostgreSQL with a unified lesson model, **[v2] wrapped in a token-gated unlisted-video layer and a defense-in-depth security model**) comfortably supports growth from a two-week MVP to a multi-subject STEM ecosystem without a rewrite — and without needing to store a single video file on Gmora's own infrastructure. The Laravel stack runs on a single affordable VPS (~$6–12/mo), making it one of the most cost-effective architectures possible for a full-featured LMS.

---

## Chapter 13: Appendix

### 13.1 Appendix A – Starter Schema (Summary) **[v3]**
Laravel Eloquent models and migrations for: `Role`, `User`, `Course`, `Module`, `Lesson` (with `type` enum cast for youtube/live/pdf/quiz; `content_ref` in model's `$hidden` array, excluded from serialization), `LiveSession`, `Enrollment`, `Progress`, **[v2] `VideoAccessToken`, `AuditLog`, `LoginSession`.** All models use UUID primary keys (`HasUuids` trait), `SoftDeletes` trait, and standard `$timestamps`.

### 13.2 Appendix B – Environment Variables Checklist **[v3]**
Required variables include `DB_CONNECTION=pgsql`, `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `REDIS_HOST`, `REDIS_PASSWORD`, `APP_KEY` (Laravel encryption key), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `STRIPE_KEY`, `STRIPE_SECRET`, `PAYHERE_MERCHANT_ID`, `PAYHERE_SECRET`, `MAIL_MAILER=resend`, `RESEND_API_KEY`, **[v2] `YOUTUBE_API_KEY` + `YOUTUBE_CHANNEL_OAUTH_REFRESH_TOKEN` (Data API v3 uploads), `VIDEO_TOKEN_SECRET`, `CLOUDFLARE_WAF_API_TOKEN`, `SENTRY_LARAVEL_DSN`.** All of the above are managed via Laravel Forge's environment editor in production, never committed to Git. Laravel's `php artisan env:encrypt` provides an additional layer of protection.

### 13.3 Appendix C – Glossary
- **Modular monolith**: A single deployable Laravel application internally organized into independent domain modules via Service Providers. **[v3]**
- **Unified lesson model**: The single-table design representing YouTube, live, PDF, and quiz content.
- **RBAC**: Role-Based Access Control.
- **Inertia.js**: A protocol that bridges server-side Laravel with client-side React, providing SPA-like navigation without a separate API layer. **[v3]**
- **Laravel Queue**: Laravel's built-in Redis-backed job queue system, replacing BullMQ. **[v3]**
- **Laravel Forge**: A server management tool for deploying and managing Laravel applications on VPS providers (DigitalOcean, Hetzner, AWS, etc.). **[v3]**
- **Eloquent**: Laravel's built-in ORM for database interaction, replacing Prisma. **[v3]**
- **Sanctum**: Laravel's lightweight authentication system for SPAs and API tokens. **[v3]**
- **[v2] Video ticket**: A short-lived, single-purpose signed token that authorizes one client to resolve and play one specific lesson's YouTube video for a limited time window.
- **[v2] Defense-in-depth**: A security approach using multiple independent, overlapping layers of protection so that no single failure exposes the whole system.
- **[v2] WAF**: Web Application Firewall — filters malicious traffic at the network edge, before it reaches application servers.
