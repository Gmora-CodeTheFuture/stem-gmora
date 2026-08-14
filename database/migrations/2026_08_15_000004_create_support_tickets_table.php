<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Support tickets (Plan §10.3). A student raises one, staff answer it, and the
 * whole exchange stays on one thread.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('reference')->unique(); // human-quotable, e.g. GS-4F2A
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('course_id')->nullable()->constrained('courses')->nullOnDelete();
            $table->string('subject');
            $table->string('category')->default('general'); // general, billing, technical, content
            $table->string('priority')->default('normal');  // low, normal, high
            $table->string('status')->default('open');      // open, pending, resolved, closed
            $table->timestamp('last_reply_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'last_reply_at']);
            $table->index('user_id');
        });

        Schema::create('support_ticket_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('ticket_id')->constrained('support_tickets')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users');
            $table->text('body');
            // Recorded at write time: a role change later must not rewrite history.
            $table->boolean('from_staff')->default(false);
            $table->timestamps();

            $table->index(['ticket_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_ticket_messages');
        Schema::dropIfExists('support_tickets');
    }
};
