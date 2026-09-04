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

        $instructorRole = Role::where('name', Role::INSTRUCTOR)->first();
        $instructor = User::firstOrCreate(
            ['email' => 'instructor@gmorastem.com'],
            [
                'full_name' => 'Demo Instructor',
                'password' => bcrypt('password'),
                'role_id' => $instructorRole->id,
                'email_verified_at' => now(),
            ]
        );

        $studentRole = Role::where('name', Role::STUDENT)->first();
        User::firstOrCreate(
            ['email' => 'student@gmorastem.com'],
            [
                'full_name' => 'Demo Student',
                'password' => bcrypt('password'),
                'role_id' => $studentRole->id,
                'assigned_instructor_id' => $instructor->id,
                'email_verified_at' => now(),
            ]
        );

        $this->call([BadgeSeeder::class, CourseSeeder::class]);
    }
}
