<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_materials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('lesson_id')->constrained('lessons')->cascadeOnDelete();
            $table->string('type'); // youtube, pdf, html, live
            $table->string('title')->nullable();
            $table->unsignedInteger('order_index')->default(0);
            $table->string('content_ref')->nullable(); // YouTube id or private PDF path
            // HTML presentation bundle (mirrors presentations table columns)
            $table->string('original_filename')->nullable();
            $table->string('entry_file')->nullable();
            $table->string('storage_path')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            // Live class link fields
            $table->timestamp('scheduled_start')->nullable();
            $table->unsignedSmallInteger('duration_minutes')->nullable();
            $table->string('zoom_join_url')->nullable();
            $table->string('zoom_meeting_id')->nullable();
            $table->string('zoom_passcode')->nullable();
            $table->string('recording_url')->nullable();
            $table->timestamps();

            $table->index(['lesson_id', 'order_index']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_materials');
    }
};
