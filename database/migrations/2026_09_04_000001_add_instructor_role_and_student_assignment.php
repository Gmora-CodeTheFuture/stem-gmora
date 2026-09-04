<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Restores an instructor tier between student and admin, and links each
 * student to the instructor who mentors them.
 */
return new class extends Migration
{
    public function up(): void
    {
        $existing = DB::table('roles')->where('name', 'instructor')->first();

        if (! $existing) {
            DB::table('roles')->insert([
                'id' => (string) Str::uuid(),
                'name' => 'instructor',
                'display_name' => 'Instructor',
                'description' => 'Teaches assigned courses and mentors assigned students',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            DB::table('roles')->where('id', $existing->id)->update([
                'display_name' => 'Instructor',
                'description' => 'Teaches assigned courses and mentors assigned students',
                'updated_at' => now(),
            ]);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->foreignUuid('assigned_instructor_id')
                ->nullable()
                ->after('role_id')
                ->constrained('users')
                ->nullOnDelete();
        });

        Cache::forget('roles:all');
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assigned_instructor_id');
        });

        DB::table('roles')->where('name', 'instructor')->delete();

        Cache::forget('roles:all');
    }
};
