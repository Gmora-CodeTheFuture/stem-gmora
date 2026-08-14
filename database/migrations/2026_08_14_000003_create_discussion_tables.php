<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Course and lesson discussion boards (Plan §9.4).
 *
 * A thread always belongs to a course; attaching a lesson scopes it to that
 * lesson's board while keeping the course-wide view a single query.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discussions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignUuid('lesson_id')->nullable()->constrained('lessons')->nullOnDelete();
            $table->foreignUuid('user_id')->constrained('users');
            $table->string('title');
            $table->text('body');
            $table->boolean('is_pinned')->default(false);
            $table->foreignUuid('solved_reply_id')->nullable();
            $table->integer('replies_count')->default(0);
            $table->timestamp('last_activity_at')->useCurrent();
            $table->timestamps();
            $table->softDeletes();

            // The board lists pinned first, then most recently active.
            $table->index(['course_id', 'is_pinned', 'last_activity_at']);
            $table->index(['lesson_id', 'last_activity_at']);
        });

        Schema::create('discussion_replies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('discussion_id')->constrained('discussions')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users');
            // One level of nesting: a reply may answer another reply. The
            // self-reference is added after the table exists, because the
            // primary key is only in place once CREATE TABLE has finished.
            $table->uuid('parent_id')->nullable();
            $table->text('body');
            $table->boolean('is_instructor_answer')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['discussion_id', 'created_at']);
        });

        Schema::table('discussion_replies', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('discussion_replies')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discussion_replies');
        Schema::dropIfExists('discussions');
    }
};
