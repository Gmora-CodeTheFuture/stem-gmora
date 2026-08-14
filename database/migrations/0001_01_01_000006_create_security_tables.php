<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Video Access Tokens — [v2] short-lived tokens for unlisted YouTube video access
        Schema::create('video_access_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users');
            $table->foreignUuid('lesson_id')->constrained('lessons');
            $table->foreignUuid('enrollment_id')->constrained('enrollments');
            $table->string('token_hash', 64)->unique(); // SHA-256 of the issued token
            $table->timestamp('issued_at')->useCurrent();
            $table->timestamp('expires_at');
            $table->string('client_ip_hash', 64)->nullable();
            $table->string('user_agent_hash', 64)->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index('expires_at'); // for cleanup job
            $table->index(['user_id', 'lesson_id']);
        });

        // Audit Logs — [v2] every sensitive action is logged
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action'); // e.g., 'course.published', 'video_token.issued', 'user.role_changed'
            $table->string('entity_type'); // e.g., 'course', 'user', 'video_access_token'
            $table->uuid('entity_id')->nullable();
            $table->json('diff')->nullable(); // {before: {}, after: {}}
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['actor_id', 'created_at']);
            $table->index(['entity_type', 'entity_id']);
            $table->index('action');
        });

        // Login Sessions — [v2] track devices for active session management
        Schema::create('login_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('session_id')->nullable()->index(); // links to Laravel session
            $table->string('device_label')->nullable(); // e.g., "Chrome on macOS"
            $table->string('ip_address', 45)->nullable();
            $table->string('location')->nullable(); // GeoIP city/country
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'revoked_at']);
        });

        // Content Blocks — lightweight CMS for marketing pages
        Schema::create('content_blocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('page'); // e.g., 'home', 'about', 'pricing'
            $table->string('section_key'); // e.g., 'hero', 'features', 'testimonials'
            $table->json('content'); // structured content
            $table->boolean('is_published')->default(true);
            $table->integer('order_index')->default(0);
            $table->timestamps();

            $table->unique(['page', 'section_key']);
        });

        // Notifications — database channel for in-app notifications
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            // UUID primary keys throughout, so the morph key must be a uuid.
            $table->uuidMorphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('content_blocks');
        Schema::dropIfExists('login_sessions');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('video_access_tokens');
    }
};
