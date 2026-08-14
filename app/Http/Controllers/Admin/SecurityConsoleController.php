<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\VideoAccessToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The security console (Plan §4.11): audit-log search and the video-token
 * issuance monitor.
 *
 * The platform has been writing audit rows since launch — role changes, token
 * issuance, grading, enrollment changes, publishing — and this is where they
 * are read back during an incident.
 */
class SecurityConsoleController extends Controller
{
    /** Issuing far more tickets than watching lessons suggests scripting. */
    private const SUSPICIOUS_TOKENS_PER_DAY = 30;

    public function index(Request $request): Response
    {
        $filters = [
            'search' => trim($request->string('search')->toString()),
            'action' => $request->string('action')->toString(),
            'actor' => $request->string('actor')->toString(),
            'from' => $request->string('from')->toString(),
            'to' => $request->string('to')->toString(),
        ];

        $logs = AuditLog::query()
            ->with('actor:id,full_name,email')
            ->when($filters['action'] !== '', fn ($q) => $q->where('action', $filters['action']))
            ->when($filters['actor'] !== '', fn ($q) => $q->where('actor_id', $filters['actor']))
            ->when($filters['from'] !== '', fn ($q) => $q->where('created_at', '>=', $filters['from']))
            ->when($filters['to'] !== '', fn ($q) => $q->where('created_at', '<=', $filters['to'].' 23:59:59'))
            ->when($filters['search'] !== '', fn ($q) => $q->where(fn ($inner) => $inner
                ->whereLike('action', "%{$filters['search']}%")
                ->orWhereLike('entity_type', "%{$filters['search']}%")
                ->orWhereLike('entity_id', "%{$filters['search']}%")
                ->orWhereLike('ip_address', "%{$filters['search']}%")))
            ->latest('created_at')
            ->paginate(30)
            ->withQueryString()
            ->through(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'entity_type' => $log->entity_type,
                'entity_id' => $log->entity_id,
                'diff' => $log->diff,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at?->toIso8601String(),
                'actor' => $log->actor?->only(['id', 'full_name', 'email']),
            ]);

        return Inertia::render('Admin/Security/Index', [
            'logs' => $logs,
            'filters' => $filters,
            'actions' => AuditLog::select('action')->distinct()->orderBy('action')->pluck('action')->all(),
            'tokens' => $this->tokenMonitor(),
        ]);
    }

    /**
     * Video-ticket issuance at a glance, plus the accounts issuing enough of
     * them to be worth a look (Plan §7.5).
     *
     * @return array<string, mixed>
     */
    private function tokenMonitor(): array
    {
        $now = now();

        $topIssuers = VideoAccessToken::query()
            ->join('users', 'users.id', '=', 'video_access_tokens.user_id')
            ->where('video_access_tokens.issued_at', '>=', $now->copy()->subDay())
            ->groupBy('users.id', 'users.full_name', 'users.email')
            ->orderByDesc(DB::raw('count(video_access_tokens.id)'))
            ->limit(10)
            ->get([
                'users.id as user_id',
                'users.full_name',
                'users.email',
                DB::raw('count(video_access_tokens.id) as issued'),
                DB::raw('count(distinct video_access_tokens.lesson_id) as lessons'),
            ])
            ->map(fn ($row) => [
                'user_id' => $row->user_id,
                'full_name' => $row->full_name,
                'email' => $row->email,
                'issued' => (int) $row->issued,
                'lessons' => (int) $row->lessons,
                // Many tickets across few lessons is the scripted-scraping shape.
                'suspicious' => (int) $row->issued >= self::SUSPICIOUS_TOKENS_PER_DAY,
            ])
            ->all();

        return [
            'issued_24h' => VideoAccessToken::where('issued_at', '>=', $now->copy()->subDay())->count(),
            'issued_7d' => VideoAccessToken::where('issued_at', '>=', $now->copy()->subWeek())->count(),
            'active' => VideoAccessToken::whereNull('revoked_at')->where('expires_at', '>', $now)->count(),
            'revoked_7d' => VideoAccessToken::whereNotNull('revoked_at')
                ->where('revoked_at', '>=', $now->copy()->subWeek())
                ->count(),
            'top_issuers' => $topIssuers,
            'threshold' => self::SUSPICIOUS_TOKENS_PER_DAY,
        ];
    }

    /** Everything recorded about one account, for an incident timeline. */
    public function user(Request $request, User $user): Response
    {
        $logs = AuditLog::where('actor_id', $user->id)
            ->orWhere(fn ($q) => $q->where('entity_type', 'user')->where('entity_id', $user->id))
            ->latest('created_at')
            ->paginate(50)
            ->through(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'entity_type' => $log->entity_type,
                'entity_id' => $log->entity_id,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Admin/Security/User', [
            'targetUser' => $user->only(['id', 'full_name', 'email']),
            'logs' => $logs,
            'tokens' => VideoAccessToken::where('user_id', $user->id)
                ->with('lesson:id,title')
                ->latest('issued_at')
                ->limit(25)
                ->get()
                ->map(fn (VideoAccessToken $token) => [
                    'id' => $token->id,
                    'lesson' => $token->lesson?->title,
                    'issued_at' => $token->issued_at?->toIso8601String(),
                    'expires_at' => $token->expires_at?->toIso8601String(),
                    'revoked_at' => $token->revoked_at?->toIso8601String(),
                ])
                ->all(),
        ]);
    }
}
