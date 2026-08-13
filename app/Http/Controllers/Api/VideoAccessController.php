<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Services\VideoAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * [v2] Dedicated API surface for video tickets (Plan §8.4).
 * Deliberately excluded from public API docs.
 */
class VideoAccessController extends Controller
{
    public function __construct(private readonly VideoAccessService $videoAccess) {}

    /**
     * POST /api/v1/learning/lessons/{lesson}/video-token
     *
     * Reached only after `auth` + `EnsureEnrolled`. Returns the YouTube ID —
     * the single point in the system where it crosses to a client.
     */
    public function issue(Request $request, Lesson $lesson): JsonResponse
    {
        abort_unless($lesson->is_published, 404);

        /** @var Enrollment|null $enrollment set by EnsureEnrolled */
        $enrollment = $request->attributes->get('enrollment');

        $payload = $this->videoAccess->issue($request->user(), $lesson, $enrollment, $request);

        return response()->json(['data' => $payload]);
    }

    /**
     * GET /api/v1/learning/video-token/{ticket}/heartbeat
     */
    public function heartbeat(Request $request, string $ticket): JsonResponse
    {
        $result = $this->videoAccess->validate($ticket, $request->user());

        return response()->json(['data' => $result], $result['valid'] ? 200 : 403);
    }
}
