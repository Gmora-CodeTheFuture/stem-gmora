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
            ['name' => Role::STUDENT, 'display_name' => 'Student', 'description' => 'Enrolled learner'],
            ['name' => Role::ADMIN, 'display_name' => 'Admin', 'description' => 'Runs the platform and authors courses'],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role['name']], $role);
        }
    }
}
