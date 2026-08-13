<?php

use App\Http\Controllers\AssignmentController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\CertificateController;
use App\Http\Controllers\CourseCatalogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\Instructor\GradingController;
use App\Http\Controllers\LearningController;
use App\Http\Controllers\MyCoursesController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\QuizController;
use App\Models\Certificate;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Marketing (Public) Routes
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
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
});

require __DIR__.'/auth.php';
