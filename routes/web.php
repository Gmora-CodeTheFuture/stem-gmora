<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\BadgeManagementController;
use App\Http\Controllers\Admin\CourseManagementController;
use App\Http\Controllers\Admin\EnrollmentManagementController;
use App\Http\Controllers\Admin\PaymentManagementController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\AssignmentController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\CertificateController;
use App\Http\Controllers\CourseCatalogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DiscussionController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\Instructor\GradingController;
use App\Http\Controllers\LeaderboardController;
use App\Http\Controllers\LearningController;
use App\Http\Controllers\MyCoursesController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\QuizController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SecurityController;
use App\Http\Controllers\Tutor\CourseBuilderController;
use App\Http\Controllers\Tutor\LessonController;
use App\Http\Controllers\Tutor\ModuleController;
use App\Http\Controllers\Tutor\StudentController;
use App\Http\Controllers\Tutor\TutorDashboardController;
use App\Models\Certificate;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Marketing (Public) Routes
|--------------------------------------------------------------------------
*/
// Signed-in users go straight to work; visitors get the marketing site, which
// is what every public link (About, Pricing, Contact, course pages) hangs off.
Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return Inertia::render('Welcome');
})->name('home');

Route::get('/courses', [CourseCatalogController::class, 'index'])->name('courses.index');
Route::get('/courses/{slug}', [CourseCatalogController::class, 'show'])->name('courses.show');

Route::get('/about', function () {
    return Inertia::render('Marketing/About');
})->name('about');

Route::get('/pricing', function () {
    return Inertia::render('Marketing/Pricing');
})->name('pricing');

Route::get('/contact', function () {
    return Inertia::render('Marketing/Contact');
})->name('contact');

// Public User Portfolio
Route::get('/u/{user}', [ProfileController::class, 'show'])->name('portfolio.show');

// Certificate verification (public)
Route::get('/verify/{code}', function (string $code) {
    $certificate = Certificate::where('certificate_code', $code)
        ->with(['user:id,full_name', 'course:id,title,slug,category'])
        ->first();

    return Inertia::render('Marketing/VerifyCertificate', [
        'code' => $code,
        'certificate' => $certificate,
    ]);
})->name('certificate.verify');

/*
|--------------------------------------------------------------------------
| Authenticated Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');
    Route::get('/dashboard/courses', [MyCoursesController::class, 'index'])->name('dashboard.courses');
    Route::get('/dashboard/calendar', [CalendarController::class, 'index'])->name('dashboard.calendar');
    Route::get('/dashboard/certificates', [CertificateController::class, 'index'])->name('dashboard.certificates');
    Route::get('/dashboard/leaderboard', [LeaderboardController::class, 'index'])->name('dashboard.leaderboard');
    Route::get('/dashboard/search', [SearchController::class, 'index'])->name('dashboard.search');
    Route::get('/certificates/{certificate}/download', [CertificateController::class, 'download'])
        ->name('certificates.download');

    // Notifications (replaces the old Messages tab)
    Route::get('/dashboard/notifications', [NotificationController::class, 'index'])->name('dashboard.notifications');
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead'])
        ->name('notifications.read');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])
        ->name('notifications.read-all');

    // Enrollment
    Route::post('/courses/{course:slug}/enroll', [EnrollmentController::class, 'store'])->name('enroll.store');
    Route::delete('/enrollments/{enrollment}', [EnrollmentController::class, 'destroy'])->name('enroll.destroy');

    Route::get('/dashboard/assignments', [AssignmentController::class, 'index'])->name('dashboard.assignments');

    // Learning — every route below is enrollment-gated (Plan §7.2)
    Route::middleware('enrolled')->group(function () {
        Route::patch('/learn/lessons/{lesson}/progress', [LearningController::class, 'updateProgress'])
            ->name('learn.progress');
        // Discussions — course and lesson boards
        Route::get('/learn/{course:slug}/discussions', [DiscussionController::class, 'index'])
            ->name('discussions.index');
        Route::post('/learn/{course:slug}/discussions', [DiscussionController::class, 'store'])
            ->name('discussions.store');
        Route::get('/discussions/{discussion}', [DiscussionController::class, 'show'])->name('discussions.show');
        Route::post('/discussions/{discussion}/replies', [DiscussionController::class, 'reply'])
            ->name('discussions.reply');
        Route::patch('/discussions/{discussion}/solve', [DiscussionController::class, 'solve'])
            ->name('discussions.solve');
        Route::patch('/discussions/{discussion}/pin', [DiscussionController::class, 'pin'])
            ->name('discussions.pin');
        Route::delete('/discussions/{discussion}', [DiscussionController::class, 'destroy'])
            ->name('discussions.destroy');
        Route::delete('/discussion-replies/{reply}', [DiscussionController::class, 'destroyReply'])
            ->name('discussions.reply.destroy');

        Route::get('/learn/{course:slug}', [LearningController::class, 'show'])->name('learn.show');
        Route::get('/learn/{course:slug}/{lesson}', [LearningController::class, 'show'])->name('learn.lesson');

        // Quizzes
        Route::get('/quizzes/{quiz}', [QuizController::class, 'show'])->name('quiz.show');
        Route::post('/quizzes/{quiz}/attempts', [QuizController::class, 'start'])->name('quiz.start');
        Route::get('/quiz-attempts/{attempt}', [QuizController::class, 'attempt'])->name('quiz.attempt');
        Route::patch('/quiz-attempts/{attempt}', [QuizController::class, 'save'])->name('quiz.save');
        Route::post('/quiz-attempts/{attempt}/submit', [QuizController::class, 'submit'])->name('quiz.submit');
        Route::get('/quiz-attempts/{attempt}/result', [QuizController::class, 'result'])->name('quiz.result');

        // Assignments
        Route::get('/assignments/{assignment}', [AssignmentController::class, 'show'])->name('assignments.show');
        Route::post('/assignments/{assignment}/submissions', [AssignmentController::class, 'store'])
            ->name('assignments.submit');
    });

    Route::get('/submissions/{submission}/file', [GradingController::class, 'download'])
        ->name('submissions.download');

    /*
    |----------------------------------------------------------------------
    | Instructor
    |----------------------------------------------------------------------
    */
    Route::middleware('role:instructor,teaching_assistant,course_manager,platform_admin,super_admin')
        ->prefix('instructor')
        ->group(function () {
            Route::get('/grading', [GradingController::class, 'index'])->name('instructor.grading');
            Route::patch('/submissions/{submission}', [GradingController::class, 'grade'])
                ->name('instructor.grade-submission');
            Route::patch('/quiz-attempts/{attempt}', [GradingController::class, 'gradeAttempt'])
                ->name('instructor.grade-attempt');

            // Calendar authoring — instructors publish to their own courses,
            // admins may also publish platform-wide.
            Route::post('/events', [CalendarController::class, 'store'])->name('events.store');
            Route::patch('/events/{event}', [CalendarController::class, 'update'])->name('events.update');
            Route::delete('/events/{event}', [CalendarController::class, 'destroy'])->name('events.destroy');
        });

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Account security: 2FA status and active devices.
    Route::get('/profile/security', [SecurityController::class, 'show'])->name('profile.security');
    Route::delete('/profile/sessions/{session}', [SecurityController::class, 'destroySession'])
        ->name('profile.sessions.destroy');
    Route::delete('/profile/sessions', [SecurityController::class, 'destroyOtherSessions'])
        ->name('profile.sessions.destroy-others');
});

/*
|--------------------------------------------------------------------------
| Admin Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified', 'role:platform_admin,super_admin'])
    ->prefix('admin')
    ->group(function () {
        Route::get('/', AdminDashboardController::class)->name('admin.dashboard');

        // Users
        Route::get('/users', [UserManagementController::class, 'index'])->name('admin.users.index');
        Route::get('/users/{user}', [UserManagementController::class, 'show'])->name('admin.users.show');
        Route::get('/users/{user}/edit', [UserManagementController::class, 'edit'])->name('admin.users.edit');
        Route::patch('/users/{user}', [UserManagementController::class, 'update'])->name('admin.users.update');
        Route::delete('/users/{user}', [UserManagementController::class, 'destroy'])->name('admin.users.destroy');
        Route::post('/users/{user}/reset-password', [UserManagementController::class, 'resetPassword'])->name('admin.users.reset-password');

        // Courses
        Route::get('/courses', [CourseManagementController::class, 'index'])->name('admin.courses.index');
        Route::get('/courses/create', [CourseManagementController::class, 'create'])->name('admin.courses.create');
        Route::post('/courses', [CourseManagementController::class, 'store'])->name('admin.courses.store');
        Route::get('/courses/{course}', [CourseManagementController::class, 'show'])->name('admin.courses.show');
        Route::get('/courses/{course}/edit', [CourseManagementController::class, 'edit'])->name('admin.courses.edit');
        Route::patch('/courses/{course}', [CourseManagementController::class, 'update'])->name('admin.courses.update');
        Route::delete('/courses/{course}', [CourseManagementController::class, 'destroy'])->name('admin.courses.destroy');
        Route::patch('/courses/{course}/status', [CourseManagementController::class, 'updateStatus'])->name('admin.courses.status');

        // Enrollments
        Route::get('/enrollments', [EnrollmentManagementController::class, 'index'])->name('admin.enrollments.index');
        Route::post('/enrollments', [EnrollmentManagementController::class, 'store'])->name('admin.enrollments.store');
        Route::patch('/enrollments/{enrollment}', [EnrollmentManagementController::class, 'update'])->name('admin.enrollments.update');

        // Payments
        Route::get('/payments', [PaymentManagementController::class, 'index'])->name('admin.payments.index');

        // Badges
        Route::get('/badges', [BadgeManagementController::class, 'index'])->name('admin.badges.index');
        Route::post('/badges', [BadgeManagementController::class, 'store'])->name('admin.badges.store');
        Route::patch('/badges/{badge}', [BadgeManagementController::class, 'update'])->name('admin.badges.update');
        Route::delete('/badges/{badge}', [BadgeManagementController::class, 'destroy'])->name('admin.badges.destroy');
    });

/*
|--------------------------------------------------------------------------
| Tutor Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified', 'role:instructor,course_manager,platform_admin,super_admin'])
    ->prefix('tutor')
    ->group(function () {
        Route::get('/', TutorDashboardController::class)->name('tutor.dashboard');

        // Courses
        Route::get('/courses', [CourseBuilderController::class, 'index'])->name('tutor.courses.index');
        Route::get('/courses/create', [CourseBuilderController::class, 'create'])->name('tutor.courses.create');
        Route::post('/courses', [CourseBuilderController::class, 'store'])->name('tutor.courses.store');
        Route::get('/courses/{course}/edit', [CourseBuilderController::class, 'edit'])->name('tutor.courses.edit');
        Route::patch('/courses/{course}', [CourseBuilderController::class, 'update'])->name('tutor.courses.update');
        Route::delete('/courses/{course}', [CourseBuilderController::class, 'destroy'])->name('tutor.courses.destroy');
        Route::patch('/courses/{course}/status', [CourseBuilderController::class, 'updateStatus'])->name('tutor.courses.status');

        // Modules
        Route::post('/courses/{course}/modules', [ModuleController::class, 'store'])->name('tutor.modules.store');
        Route::patch('/modules/{module}', [ModuleController::class, 'update'])->name('tutor.modules.update');
        Route::delete('/modules/{module}', [ModuleController::class, 'destroy'])->name('tutor.modules.destroy');
        Route::post('/courses/{course}/modules/reorder', [ModuleController::class, 'reorder'])->name('tutor.modules.reorder');

        // Lessons
        Route::post('/modules/{module}/lessons', [LessonController::class, 'store'])->name('tutor.lessons.store');
        Route::patch('/lessons/{lesson}', [LessonController::class, 'update'])->name('tutor.lessons.update');
        Route::delete('/lessons/{lesson}', [LessonController::class, 'destroy'])->name('tutor.lessons.destroy');
        Route::post('/modules/{module}/lessons/reorder', [LessonController::class, 'reorder'])->name('tutor.lessons.reorder');

        // Students
        Route::get('/courses/{course}/students', [StudentController::class, 'index'])->name('tutor.students.index');

        // Grading (link existing)
        Route::get('/grading', [GradingController::class, 'index'])->name('tutor.grading');
    });

require __DIR__.'/auth.php';
