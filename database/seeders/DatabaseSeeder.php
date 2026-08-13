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

        // Create demo super admin
        $superAdminRole = Role::where('name', Role::SUPER_ADMIN)->first();
        User::firstOrCreate(
            ['email' => 'admin@gmorastem.com'],
            [
                'full_name' => 'Gmora Admin',
                'password' => bcrypt('password'),
                'role_id' => $superAdminRole->id,
                'email_verified_at' => now(),
            ]
        );

        // Create demo instructor
        $instructorRole = Role::where('name', Role::INSTRUCTOR)->first();
        User::firstOrCreate(
            ['email' => 'instructor@gmorastem.com'],
            [
                'full_name' => 'Demo Instructor',
                'password' => bcrypt('password'),
                'role_id' => $instructorRole->id,
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

        $this->call(CourseSeeder::class);
    }
}
