<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('instructor_id')->constrained('users');
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('subtitle')->nullable();
            $table->text('description')->nullable();
            $table->string('category'); // AI, Robotics, Programming, Mathematics, Electronics, Cybersecurity
            $table->string('difficulty')->default('beginner'); // beginner, intermediate, advanced
            $table->string('language', 10)->default('en');
            $table->decimal('price', 10, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->string('thumbnail_url')->nullable();
            $table->string('preview_video_url')->nullable(); // public YouTube video for previews
            $table->string('status')->default('draft'); // draft, pending_review, published, archived
            $table->integer('duration_minutes')->default(0); // denormalized total
            $table->integer('total_lessons')->default(0); // denormalized count
            $table->integer('total_enrollments')->default(0); // denormalized count
            $table->decimal('average_rating', 3, 2)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'category']);
            $table->index('instructor_id');
        });

        Schema::create('modules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->integer('order_index')->default(0);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['course_id', 'order_index']);
        });

        Schema::create('lessons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('module_id')->constrained('modules')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('type'); // youtube, live, pdf, quiz
            $table->integer('order_index')->default(0);
            // content_ref stores: YouTube video ID, PDF file key, or quiz ID
            // NEVER exposed in public API responses — see Lesson model $hidden
            $table->string('content_ref')->nullable();
            $table->integer('duration_seconds')->default(0);
            $table->boolean('is_free_preview')->default(false);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['module_id', 'order_index']);
        });

        Schema::create('live_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('lesson_id')->constrained('lessons')->cascadeOnDelete();
            $table->string('title');
            $table->timestamp('scheduled_start');
            $table->integer('duration_minutes')->default(60);
            $table->string('zoom_join_url')->nullable();
            $table->string('zoom_meeting_id')->nullable();
            $table->string('zoom_passcode')->nullable();
            $table->string('recording_url')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('live_sessions');
        Schema::dropIfExists('lessons');
        Schema::dropIfExists('modules');
        Schema::dropIfExists('courses');
    }
};
