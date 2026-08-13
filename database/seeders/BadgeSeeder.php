<?php

namespace Database\Seeders;

use App\Models\Badge;
use Illuminate\Database\Seeder;

/**
 * The platform's badge definitions. These are reference data — the criteria
 * are evaluated against each student's real record by BadgeService, so a badge
 * is only ever held by someone who actually met the bar.
 */
class BadgeSeeder extends Seeder
{
    public function run(): void
    {
        $badges = [
            [
                'name' => 'First Steps',
                'description' => 'Completed your first lesson.',
                'type' => 'progress',
                'criteria' => ['metric' => 'lessons_completed', 'threshold' => 1],
            ],
            [
                'name' => 'Getting Serious',
                'description' => 'Completed 10 lessons.',
                'type' => 'progress',
                'criteria' => ['metric' => 'lessons_completed', 'threshold' => 10],
            ],
            [
                'name' => 'Half Century',
                'description' => 'Completed 50 lessons.',
                'type' => 'progress',
                'criteria' => ['metric' => 'lessons_completed', 'threshold' => 50],
            ],
            [
                'name' => 'Week One',
                'description' => 'Learned on 7 consecutive days.',
                'type' => 'streak',
                'criteria' => ['metric' => 'streak', 'threshold' => 7],
            ],
            [
                'name' => 'Unbroken',
                'description' => 'Learned on 30 consecutive days.',
                'type' => 'streak',
                'criteria' => ['metric' => 'streak', 'threshold' => 30],
            ],
            [
                'name' => 'Course Finisher',
                'description' => 'Completed your first course from start to finish.',
                'type' => 'course_completion',
                'criteria' => ['metric' => 'courses_completed', 'threshold' => 1],
            ],
            [
                'name' => 'Triple Threat',
                'description' => 'Completed three courses.',
                'type' => 'course_completion',
                'criteria' => ['metric' => 'courses_completed', 'threshold' => 3],
            ],
            [
                'name' => 'Certified',
                'description' => 'Earned your first verified certificate.',
                'type' => 'certificate',
                'criteria' => ['metric' => 'certificates', 'threshold' => 1],
            ],
            [
                'name' => 'Level 5',
                'description' => 'Reached level 5.',
                'type' => 'level_up',
                'criteria' => ['metric' => 'level', 'threshold' => 5],
            ],
            [
                'name' => 'Level 10',
                'description' => 'Reached level 10.',
                'type' => 'level_up',
                'criteria' => ['metric' => 'level', 'threshold' => 10],
            ],
        ];

        foreach ($badges as $badge) {
            Badge::updateOrCreate(['name' => $badge['name']], $badge);
        }
    }
}
