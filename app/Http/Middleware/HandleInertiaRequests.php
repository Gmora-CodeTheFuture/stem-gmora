<?php

namespace App\Http\Middleware;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $this->currentUser($request),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
            ],
            // Shown once, immediately after 2FA enrolment.
            'recoveryCodes' => fn () => $request->session()->get('recoveryCodes'),
            'notifications_count' => fn () => $this->unreadCount($request),
        ];
    }

    /**
     * The signed-in user with their role attached from cache, so the layout
     * costs one query rather than two.
     */
    private function currentUser(Request $request): ?User
    {
        $user = $request->user();

        if (! $user) {
            return null;
        }

        if (! $user->relationLoaded('role')) {
            $user->setRelation('role', Role::findCached($user->role_id));
        }

        return $user;
    }

    /**
     * The badge is read on every page. Counting it costs a round trip, so it
     * is cached briefly and dropped whenever notifications are read or sent.
     */
    private function unreadCount(Request $request): int
    {
        $user = $request->user();

        if (! $user) {
            return 0;
        }

        return Cache::remember(
            self::unreadCountKey($user->id),
            now()->addMinutes(5),
            fn () => $user->unreadNotifications()->count(),
        );
    }

    public static function unreadCountKey(string $userId): string
    {
        return "notifications:unread:{$userId}";
    }

    public static function forgetUnreadCount(?string $userId): void
    {
        if ($userId) {
            Cache::forget(self::unreadCountKey($userId));
        }
    }
}
