<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Progress;
use App\Models\User;
use App\Models\UserStat;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeaderboardTest extends TestCase
{
    use RefreshDatabase;

    private function learner(string $name, int $xp, int $level = 1, bool $public = true, int $streak = 0): User
    {
        $user = User::factory()->create(['full_name' => $name, 'is_public' => $public]);

        UserStat::create([
            'user_id' => $user->id,
            'xp' => $xp,
            'level' => $level,
            'current_streak' => $streak,
            'longest_streak' => $streak,
            'last_activity_date' => now(),
        ]);

        return $user;
    }

    public function test_the_xp_board_ranks_by_experience(): void
    {
        $this->learner('Top Learner', 900, 4);
        $this->learner('Middle Learner', 400, 3);
        $viewer = $this->learner('Viewer', 100, 2);

        $this->actingAs($viewer)
            ->get(route('dashboard.leaderboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('rows', 3)
                ->where('rows.0.name', 'Top Learner')
                ->where('rows.0.rank', 1)
                ->where('rows.2.is_you', true)
                ->where('you.rank', 3));
    }

    public function test_private_profiles_keep_their_rank_but_not_their_name(): void
    {
        $this->learner('Shy Learner', 900, 4, public: false);
        $viewer = $this->learner('Viewer', 100, 2);

        $this->actingAs($viewer)
            ->get(route('dashboard.leaderboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('rows.0.rank', 1)
                ->where('rows.0.name', 'Private learner')
                ->where('rows.0.user_id', null))
            ->assertDontSee('Shy Learner');
    }

    public function test_you_always_see_your_own_name_even_when_private(): void
    {
        $viewer = $this->learner('Quiet Me', 500, 3, public: false);

        $this->actingAs($viewer)
            ->get(route('dashboard.leaderboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('rows.0.name', 'Quiet Me')
                ->where('rows.0.is_you', true));
    }

    public function test_learners_with_no_experience_are_left_out(): void
    {
        $this->learner('Active', 100);
        $viewer = $this->learner('Fresh', 0);

        $this->actingAs($viewer)
            ->get(route('dashboard.leaderboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('rows', 1)->where('you', null));
    }

    public function test_the_streak_board_ranks_by_current_streak(): void
    {
        $this->learner('Consistent', 100, 2, streak: 12);
        $viewer = $this->learner('Occasional', 500, 3, streak: 2);

        $this->actingAs($viewer)
            ->get(route('dashboard.leaderboard', ['board' => 'streak']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('rows.0.name', 'Consistent')
                ->where('rows.0.score', 12));
    }

    public function test_the_course_board_counts_completed_lessons(): void
    {
        $course = Course::factory()->create(['total_lessons' => 2]);
        $module = Module::factory()->create(['course_id' => $course->id]);
        $lessons = Lesson::factory()->count(2)->create(['module_id' => $module->id]);

        $ahead = $this->learner('Ahead', 100);
        $behind = $this->learner('Behind', 100);

        $aheadEnrollment = Enrollment::factory()->create(['user_id' => $ahead->id, 'course_id' => $course->id]);
        $behindEnrollment = Enrollment::factory()->create(['user_id' => $behind->id, 'course_id' => $course->id]);

        foreach ($lessons as $lesson) {
            Progress::create([
                'enrollment_id' => $aheadEnrollment->id,
                'lesson_id' => $lesson->id,
                'status' => Progress::STATUS_COMPLETED,
                'watch_percentage' => 100,
                'completed_at' => now(),
            ]);
        }

        Progress::create([
            'enrollment_id' => $behindEnrollment->id,
            'lesson_id' => $lessons->first()->id,
            'status' => Progress::STATUS_COMPLETED,
            'watch_percentage' => 100,
            'completed_at' => now(),
        ]);

        $this->actingAs($ahead)
            ->get(route('dashboard.leaderboard', ['board' => 'course', 'course' => $course->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('rows', 2)
                ->where('rows.0.name', 'Ahead')
                ->where('rows.0.score', 2)
                ->where('rows.1.score', 1));
    }

    public function test_the_board_is_only_for_signed_in_learners(): void
    {
        $this->get(route('dashboard.leaderboard'))->assertRedirect(route('login'));
    }
}
