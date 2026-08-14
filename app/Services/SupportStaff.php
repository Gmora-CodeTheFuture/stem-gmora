<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Who answers tickets. Kept in one place so the student controller, the admin
 * queue and the notification all agree on it.
 */
class SupportStaff
{
    public const ROLES = [
        Role::TEACHING_ASSISTANT,
        Role::COURSE_MANAGER,
        Role::PLATFORM_ADMIN,
        Role::SUPER_ADMIN,
    ];

    public static function includes(?User $user): bool
    {
        return $user !== null && $user->hasAnyRole(self::ROLES);
    }

    /** @return Collection<int, User> */
    public static function all()
    {
        return User::whereHas('role', fn ($q) => $q->whereIn('name', self::ROLES))
            ->orderBy('full_name')
            ->get(['id', 'full_name']);
    }
}
