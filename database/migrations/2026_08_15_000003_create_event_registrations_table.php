<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Event sign-up (Plan §4.1 — workshops, hackathons, registration).
 *
 * The calendar could already show an event; this lets a student say they are
 * coming, and lets staff see who to expect.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            // Null means unlimited.
            $table->unsignedInteger('capacity')->nullable()->after('join_url');
            $table->boolean('registration_open')->default(false)->after('capacity');
        });

        Schema::create('event_registrations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('registered_at')->useCurrent();
            $table->timestamps();

            // One row per person per event; cancelling deletes it.
            $table->unique(['event_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_registrations');

        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['capacity', 'registration_open']);
        });
    }
};
