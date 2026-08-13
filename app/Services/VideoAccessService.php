<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\User;
use App\Models\VideoAccessToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * [v2] Video ticket issuance & validation (Plan §8.4).
 *
 * The raw YouTube ID lives in `lessons.content_ref`, which is in the Lesson
 * model's $hidden array and is never passed as an Inertia prop. It is resolved
 * here, server-side, only after an enrollment check passes — and returned once,
 * over XHR, to an authenticated client.
 *
 * Redis (via the Cache facade) is the hot path for heartbeat validation; the
 * `video_access_tokens` row is the durable audit trail.
 */
class VideoAccessService
{
    /** Ticket lifetime, in minutes. */
    public const TTL_MINUTES = 15;

    /**
     * Issue a ticket for a lesson the user is entitled to watch.
     *
     * @return array{video_id: string, ticket: string, expires_at: string, watermark: string}
     */
    public function issue(User $user, Lesson $lesson, ?Enrollment $enrollment, Request $request): array
    {
        abort_unless($lesson->isVideo() && $lesson->content_ref, 404, 'This lesson has no video.');

        $ticket = Str::random(64);
        $hash = hash('sha256', $ticket);
        $expiresAt = now()->addMinutes(self::TTL_MINUTES);

        $payload = [
            'user_id' => $user->id,
            'lesson_id' => $lesson->id,
            'enrollment_id' => $enrollment?->id,
            'expires_at' => $expiresAt->toIso8601String(),
        ];

        Cache::put($this->cacheKey($hash), $payload, $expiresAt);

        // Durable audit row. Free-preview views have no enrollment, so they are
        // logged to audit_logs only (the table requires an enrollment_id).
        if ($enrollment) {
            VideoAccessToken::create([
                'user_id' => $user->id,
                'lesson_id' => $lesson->id,
                'enrollment_id' => $enrollment->id,
                'token_hash' => $hash,
                'issued_at' => now(),
                'expires_at' => $expiresAt,
                'client_ip_hash' => $this->hashOrNull($request->ip()),
                'user_agent_hash' => $this->hashOrNull($request->userAgent()),
            ]);
        }

        AuditLog::record('video_token.issued', 'lesson', $lesson->id, [
            'expires_at' => $expiresAt->toIso8601String(),
            'free_preview' => $enrollment === null,
        ], $user->id);

        return [
            'video_id' => $lesson->content_ref,
            'ticket' => $ticket,
            'expires_at' => $expiresAt->toIso8601String(),
            'watermark' => $this->watermark($user),
        ];
    }

    /**
     * Validate a ticket on a player heartbeat.
     *
     * Re-checks the enrollment on every beat so a refund or an admin suspension
     * stops playback within one interval (~60s) rather than "next login".
     *
     * @return array{valid: bool, reason?: string, expires_at?: string}
     */
    public function validate(string $ticket, User $user): array
    {
        $hash = hash('sha256', $ticket);
        $payload = Cache::get($this->cacheKey($hash));

        if (! $payload) {
            return ['valid' => false, 'reason' => 'expired'];
        }

        if ($payload['user_id'] !== $user->id) {
            AuditLog::record('video_token.mismatched_user', 'lesson', $payload['lesson_id'], [
                'issued_to' => $payload['user_id'],
            ], $user->id);

            return ['valid' => false, 'reason' => 'invalid'];
        }

        $record = VideoAccessToken::where('token_hash', $hash)->first();

        if ($record && $record->isRevoked()) {
            Cache::forget($this->cacheKey($hash));

            return ['valid' => false, 'reason' => 'revoked'];
        }

        if ($payload['enrollment_id']) {
            $stillEnrolled = Enrollment::whereKey($payload['enrollment_id'])
                ->where('status', Enrollment::STATUS_ACTIVE)
                ->exists();

            if (! $stillEnrolled) {
                $this->revokeByHash($hash);

                return ['valid' => false, 'reason' => 'enrollment_inactive'];
            }
        }

        return ['valid' => true, 'expires_at' => $payload['expires_at']];
    }

    /**
     * Revoke every live ticket for a user — called on logout and on
     * session revoke, so a shared session cannot keep streaming.
     */
    public function revokeAllForUser(string $userId): int
    {
        return $this->revokeQuery(
            VideoAccessToken::where('user_id', $userId)
        );
    }

    /**
     * Revoke every live ticket tied to an enrollment — called on refund
     * or suspension (Plan §9.1.3).
     */
    public function revokeAllForEnrollment(string $enrollmentId): int
    {
        return $this->revokeQuery(
            VideoAccessToken::where('enrollment_id', $enrollmentId)
        );
    }

    private function revokeQuery($query): int
    {
        $tokens = $query->whereNull('revoked_at')->where('expires_at', '>', now())->get();

        foreach ($tokens as $token) {
            Cache::forget($this->cacheKey($token->token_hash));
            $token->update(['revoked_at' => now()]);
        }

        return $tokens->count();
    }

    private function revokeByHash(string $hash): void
    {
        Cache::forget($this->cacheKey($hash));
        VideoAccessToken::where('token_hash', $hash)->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);
    }

    /**
     * Leak-tracing overlay text: first name + last 4 of the user ID.
     * Rendered over the player chrome, not into the stream itself.
     */
    private function watermark(User $user): string
    {
        $firstName = Str::of($user->full_name)->trim()->explode(' ')->first() ?: 'Student';

        return $firstName.' · '.Str::substr($user->id, -4);
    }

    private function cacheKey(string $hash): string
    {
        return "video_token:{$hash}";
    }

    private function hashOrNull(?string $value): ?string
    {
        return $value ? hash('sha256', $value) : null;
    }
}
