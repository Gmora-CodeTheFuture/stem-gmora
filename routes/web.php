<?php

use App\Http\Controllers\CourseCatalogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\LearningController;
use App\Http\Controllers\ProfileController;
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
    Route::get('/dashboard/courses', [EnrollmentController::class, 'index'])->name('dashboard.courses');

    // Enrollment
    Route::post('/courses/{course:slug}/enroll', [EnrollmentController::class, 'store'])->name('enroll.store');
    Route::delete('/enrollments/{enrollment}', [EnrollmentController::class, 'destroy'])->name('enroll.destroy');

    // Learning — every route below is enrollment-gated (Plan §7.2)
    Route::middleware('enrolled')->group(function () {
        Route::patch('/learn/lessons/{lesson}/progress', [LearningController::class, 'updateProgress'])
            ->name('learn.progress');
        Route::get('/learn/{course:slug}', [LearningController::class, 'show'])->name('learn.show');
        Route::get('/learn/{course:slug}/{lesson}', [LearningController::class, 'show'])->name('learn.lesson');
    });

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
