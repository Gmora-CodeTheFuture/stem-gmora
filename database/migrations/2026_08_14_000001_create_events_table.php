<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Calendar events: classes, deadlines, workshops and announcements that
     * instructors and admins publish for students to see.
     *
     * A null `course_id` makes the event platform-wide; otherwise it is only
     * visible to students actively enrolled in that course.
     */
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('course_id')->nullable()->constrained('courses')->cascadeOnDelete();
            $table->foreignUuid('created_by')->constrained('users');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('type')->default('class'); // class, workshop, deadline, announcement
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();
            $table->string('location')->nullable();  // room, campus, or "Online"
            $table->string('join_url')->nullable();  // Zoom/Meet link
            $table->boolean('is_published')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['starts_at', 'is_published']);
            $table->index('course_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
