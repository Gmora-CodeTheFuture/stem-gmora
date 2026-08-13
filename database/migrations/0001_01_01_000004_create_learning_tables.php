<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Enrollments — links users to courses
        Schema::create('enrollments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users');
            $table->foreignUuid('course_id')->constrained('courses');
            $table->string('status')->default('active'); // active, completed, refunded, suspended
            $table->timestamp('enrolled_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['user_id', 'course_id']); // prevent double enrollment
        });

        // Progress — per-lesson completion tracking
        Schema::create('progress', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('enrollment_id')->constrained('enrollments')->cascadeOnDelete();
            $table->foreignUuid('lesson_id')->constrained('lessons');
            $table->string('status')->default('not_started'); // not_started, in_progress, completed
            $table->decimal('watch_percentage', 5, 2)->default(0); // 0.00 - 100.00
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['enrollment_id', 'lesson_id']);
            $table->index('enrollment_id');
        });

        // Quizzes
        Schema::create('quizzes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignUuid('lesson_id')->nullable()->constrained('lessons')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->integer('time_limit_seconds')->nullable();
            $table->boolean('shuffle_questions')->default(false);
            $table->integer('max_attempts')->default(1);
            $table->integer('passing_score')->default(60); // percentage
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        // Questions — belongs to a quiz
        Schema::create('questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('quiz_id')->constrained('quizzes')->cascadeOnDelete();
            $table->string('type'); // mcq, true_false, fill_blank, code, matching, ordering, essay
            $table->text('body'); // question text (supports markdown)
            $table->json('options')->nullable(); // array of {text, is_correct} for MCQ; config for other types
            $table->json('correct_answer')->nullable(); // for auto-grading
            $table->integer('points')->default(1);
            $table->integer('order_index')->default(0);
            $table->text('explanation')->nullable(); // shown after answering
            $table->timestamps();
        });

        // Quiz Attempts — student's attempt at a quiz
        Schema::create('quiz_attempts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users');
            $table->foreignUuid('quiz_id')->constrained('quizzes');
            $table->json('answers'); // {question_id: answer}
            $table->decimal('score', 5, 2)->nullable(); // percentage
            $table->integer('points_earned')->default(0);
            $table->integer('points_possible')->default(0);
            $table->string('status')->default('in_progress'); // in_progress, submitted, graded
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'quiz_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quiz_attempts');
        Schema::dropIfExists('questions');
        Schema::dropIfExists('quizzes');
        Schema::dropIfExists('progress');
        Schema::dropIfExists('enrollments');
    }
};
