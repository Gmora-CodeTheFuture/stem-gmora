<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assignments', function (Blueprint $table) {
            $table->timestamp('publish_at')->nullable()->after('is_published');
            $table->index(['is_published', 'publish_at']);
        });
    }

    public function down(): void
    {
        Schema::table('assignments', function (Blueprint $table) {
            $table->dropIndex(['is_published', 'publish_at']);
            $table->dropColumn('publish_at');
        });
    }
};
