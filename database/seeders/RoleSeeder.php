<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * The eight roles from Plan §3.3. Registration assigns `student`; every
 * elevated role is granted by an admin.
 */
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => Role::VISITOR, 'display_name' => 'Visitor', 'description' => 'Browsing marketing pages'],
            ['name' => Role::STUDENT, 'display_name' => 'Student', 'description' => 'Enrolled learner'],
            ['name' => Role::INSTRUCTOR, 'display_name' => 'Instructor', 'description' => 'Creates and manages courses'],
            ['name' => Role::TEACHING_ASSISTANT, 'display_name' => 'Teaching Assistant', 'description' => 'Grading and discussion moderation'],
            ['name' => Role::COURSE_MANAGER, 'display_name' => 'Course Manager', 'description' => 'Oversees instructors and courses'],
            ['name' => Role::PLATFORM_ADMIN, 'display_name' => 'Platform Admin', 'description' => 'Manages users, courses, payments'],
            ['name' => Role::SUPER_ADMIN, 'display_name' => 'Super Admin', 'description' => 'Full system access including security'],
            ['name' => Role::ORGANIZATION_ADMIN, 'display_name' => 'Organization Admin', 'description' => 'Manages a school/club cohort'],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role['name']], $role);
        }
    }
}
