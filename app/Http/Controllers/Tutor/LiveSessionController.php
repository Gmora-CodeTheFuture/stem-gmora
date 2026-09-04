<?php

namespace App\Http\Controllers\Tutor;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\LiveSession;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

/**
 * Live-session details for a live lesson (Zoom URL, schedule).
 */
class LiveSessionController extends Controller
{
    public function update(Request $request, Lesson $lesson): RedirectResponse
    {
        $course = $lesson->module->course;
        $this->authorizeTutor($request, $course);

        abort_unless($lesson->type === Lesson::TYPE_LIVE, 422, 'Only live lessons have a session.');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'scheduled_start' => ['required', 'date'],
            'duration_minutes' => ['required', 'integer', 'min:5', 'max:480'],
            'zoom_join_url' => ['nullable', 'url', 'max:500'],
            'zoom_meeting_id' => ['nullable', 'string', 'max:100'],
            'zoom_passcode' => ['nullable', 'string', 'max:100'],
            'recording_url' => ['nullable', 'url', 'max:500'],
        ]);

        LiveSession::updateOrCreate(
            ['lesson_id' => $lesson->id],
            $validated,
        );

        return Redirect::back()->with('success', 'Live session saved.');
    }

    public static function ensureForLesson(Lesson $lesson): LiveSession
    {
        return LiveSession::firstOrCreate(
            ['lesson_id' => $lesson->id],
            [
                'title' => $lesson->title,
                'scheduled_start' => now()->addWeek(),
                'duration_minutes' => 60,
            ],
        );
    }

    private function authorizeTutor(Request $request, Course $course): void
    {
        $user = $request->user();
        if (! $user->isAdmin() && $course->instructor_id !== $user->id) {
            abort(403, 'You can only manage your own courses.');
        }
    }
}
