<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Course review outcome (Plan §8.9). A rejection has to carry a reason back to
 * the instructor, otherwise "changes requested" is a dead end.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->text('review_notes')->nullable()->after('status');
            $table->timestamp('reviewed_at')->nullable()->after('review_notes');
            $table->foreignUuid('reviewed_by')->nullable()->after('reviewed_at')
                ->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_for_review_at')->nullable()->after('reviewed_by');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['review_notes', 'reviewed_at', 'submitted_for_review_at']);
        });
    }
};
