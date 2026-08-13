<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Assignments
        Schema::create('assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignUuid('lesson_id')->nullable()->constrained('lessons')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->timestamp('deadline_at')->nullable();
            $table->json('rubric')->nullable(); // {criteria: [{name, max_marks, description}]}
            $table->integer('max_marks')->default(100);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        // Submissions — student submission for an assignment
        Schema::create('submissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('assignment_id')->constrained('assignments');
            $table->foreignUuid('user_id')->constrained('users');
            $table->string('type')->default('file'); // file, repo, link
            $table->string('file_url')->nullable(); // R2/S3 URL
            $table->string('repo_url')->nullable(); // GitHub link
            $table->string('link_url')->nullable(); // Google Drive or other
            $table->text('notes')->nullable(); // student notes
            $table->integer('marks_awarded')->nullable();
            $table->text('feedback')->nullable(); // instructor feedback
            $table->string('status')->default('pending'); // pending, graded, returned
            $table->timestamp('graded_at')->nullable();
            $table->foreignUuid('graded_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['assignment_id', 'user_id']);
        });

        // Payments
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users');
            $table->foreignUuid('course_id')->constrained('courses');
            $table->string('provider'); // stripe, payhere, paypal
            $table->string('provider_reference')->nullable(); // Stripe checkout session ID, etc.
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->string('promo_code_used')->nullable();
            $table->string('status')->default('pending'); // pending, completed, refunded, failed
            $table->json('metadata')->nullable(); // provider-specific data
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index('provider_reference');
        });

        // Promo Codes
        Schema::create('promo_codes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();
            $table->string('type'); // percentage, fixed
            $table->decimal('value', 10, 2); // percentage value or fixed amount
            $table->string('currency', 3)->default('USD'); // for fixed type
            $table->foreignUuid('course_id')->nullable()->constrained('courses')->nullOnDelete(); // null = all courses
            $table->integer('max_uses')->nullable();
            $table->integer('current_uses')->default(0);
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Certificates
        Schema::create('certificates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users');
            $table->foreignUuid('course_id')->constrained('courses');
            $table->foreignUuid('enrollment_id')->constrained('enrollments');
            $table->string('certificate_code')->unique(); // for QR verification
            $table->string('pdf_url')->nullable(); // R2/S3 URL
            $table->timestamp('issued_at')->useCurrent();
            $table->timestamps();

            $table->unique(['user_id', 'course_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificates');
        Schema::dropIfExists('promo_codes');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('submissions');
        Schema::dropIfExists('assignments');
    }
};
