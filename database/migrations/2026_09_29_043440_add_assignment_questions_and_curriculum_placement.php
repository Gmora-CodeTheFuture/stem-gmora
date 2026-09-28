<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assignments', function (Blueprint $table) {
            $table->foreignUuid('module_id')->nullable()->after('lesson_id')->constrained('modules')->nullOnDelete();
            $table->unsignedInteger('order_index')->default(0)->after('module_id');
            $table->boolean('is_required')->default(false)->after('is_published');
            $table->index(['module_id', 'order_index']);
        });

        Schema::create('assignment_questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('assignment_id')->constrained('assignments')->cascadeOnDelete();
            $table->string('type'); // mcq, short_answer, normal
            $table->text('body');
            $table->json('options')->nullable();
            $table->json('correct_answer')->nullable();
            $table->unsignedInteger('points')->default(1);
            $table->unsignedInteger('order_index')->default(0);
            $table->timestamps();

            $table->index(['assignment_id', 'order_index']);
        });

        Schema::table('submissions', function (Blueprint $table) {
            $table->json('answers')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            $table->dropColumn('answers');
        });

        Schema::dropIfExists('assignment_questions');

        Schema::table('assignments', function (Blueprint $table) {
            $table->dropIndex(['module_id', 'order_index']);
            $table->dropConstrainedForeignId('module_id');
            $table->dropColumn(['order_index', 'is_required']);
        });
    }
};
