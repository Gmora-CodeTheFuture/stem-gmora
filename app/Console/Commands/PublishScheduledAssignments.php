<?php

namespace App\Console\Commands;

use App\Models\Assignment;
use App\Models\Enrollment;
use App\Models\User;
use App\Notifications\AssignmentPublished;
use App\Services\DashboardCache;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

class PublishScheduledAssignments extends Command
{
    protected $signature = 'assignments:publish-scheduled';

    protected $description = 'Publish assignments whose publish_at time has arrived';

    public function handle(): int
    {
        $due = Assignment::query()
            ->where('is_published', false)
            ->whereNotNull('publish_at')
            ->where('publish_at', '<=', now())
            ->with(['questions', 'course:id,title,slug'])
            ->get();

        $published = 0;

        foreach ($due as $assignment) {
            if (! $assignment->isReadyToPublish()) {
                $this->warn("Skipped incomplete assignment {$assignment->id}");

                continue;
            }

            $assignment->forceFill([
                'is_published' => true,
                'publish_at' => null,
            ])->save();

            $this->notifyEnrolled($assignment);
            $published++;
        }

        $this->info("Published {$published} assignment(s).");

        return self::SUCCESS;
    }

    private function notifyEnrolled(Assignment $assignment): void
    {
        $userIds = Enrollment::where('course_id', $assignment->course_id)
            ->whereIn('status', [Enrollment::STATUS_ACTIVE, Enrollment::STATUS_COMPLETED])
            ->pluck('user_id');

        if ($userIds->isEmpty()) {
            return;
        }

        $students = User::whereIn('id', $userIds)->get();
        Notification::send($students, new AssignmentPublished($assignment));

        foreach ($userIds as $userId) {
            DashboardCache::forget($userId);
        }
    }
}
