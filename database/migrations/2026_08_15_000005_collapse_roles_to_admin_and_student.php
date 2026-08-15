<?php

use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Collapses the eight seeded roles down to two.
 *
 * The tiers between student and admin (instructor, teaching assistant, course
 * manager, organization admin) were never used in anger: courses are authored
 * by admins, so every gate they guarded was already an admin gate. Anyone who
 * was not a student or visitor becomes an admin; visitors become students.
 */
return new class extends Migration
{
    /** Old name => the role it folds into. */
    private const FOLD = [
        'visitor' => Role::STUDENT,
        'instructor' => Role::ADMIN,
        'teaching_assistant' => Role::ADMIN,
        'course_manager' => Role::ADMIN,
        'platform_admin' => Role::ADMIN,
        'super_admin' => Role::ADMIN,
        'organization_admin' => Role::ADMIN,
    ];

    public function up(): void
    {
        $survivors = [
            Role::STUDENT => ['display_name' => 'Student', 'description' => 'Enrolled learner'],
            Role::ADMIN => ['display_name' => 'Admin', 'description' => 'Runs the platform and authors courses'],
        ];

        foreach ($survivors as $name => $attributes) {
            $existing = DB::table('roles')->where('name', $name)->first();

            // Never write `id` on the update path: users point at these rows by
            // foreign key, and changing the key underneath them fails outright.
            if ($existing) {
                DB::table('roles')->where('id', $existing->id)
                    ->update($attributes + ['updated_at' => now()]);

                continue;
            }

            DB::table('roles')->insert($attributes + [
                'id' => (string) Str::uuid(),
                'name' => $name,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $ids = DB::table('roles')->pluck('id', 'name');

        foreach (self::FOLD as $old => $new) {
            if (! isset($ids[$old])) {
                continue;
            }

            DB::table('users')->where('role_id', $ids[$old])->update(['role_id' => $ids[$new]]);
            DB::table('roles')->where('id', $ids[$old])->delete();
        }
    }

    public function down(): void
    {
        // The old tiers carried no data of their own, so restoring the rows
        // would not restore who belonged to which — this is one-way.
        throw new RuntimeException('Collapsing roles cannot be reversed.');
    }
};
