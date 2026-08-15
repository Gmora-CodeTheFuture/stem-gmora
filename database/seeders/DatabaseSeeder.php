<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RoleSeeder::class);

        // Create demo admin — admins author courses, so there is no separate
        // instructor account any more.
        $adminRole = Role::where('name', Role::ADMIN)->first();
        User::firstOrCreate(
            ['email' => 'admin@gmorastem.com'],
            [
                'full_name' => 'Gmora Admin',
                'password' => bcrypt('password'),
                'role_id' => $adminRole->id,
                'email_verified_at' => now(),
            ]
        );

        // Create demo student
        $studentRole = Role::where('name', Role::STUDENT)->first();
        User::firstOrCreate(
            ['email' => 'student@gmorastem.com'],
            [
                'full_name' => 'Demo Student',
                'password' => bcrypt('password'),
                'role_id' => $studentRole->id,
                'email_verified_at' => now(),
            ]
        );

        $this->call([BadgeSeeder::class, CourseSeeder::class]);
    }
}
