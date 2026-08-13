<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasFactory, HasUuids, Notifiable, SoftDeletes;

    protected $fillable = [
        'full_name',
        'email',
        'password',
        'avatar_url',
        'bio',
        'headline',
        'github_url',
        'linkedin_url',
        'website_url',
        'is_public',
        'role_id',
        'locale',
        'preferences',
        'two_factor_enabled',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_enabled' => 'boolean',
            // Encrypted at rest; both are also in $hidden so they can never be
            // serialised into a response.
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'preferences' => 'array',
            'last_login_at' => 'datetime',
        ];
    }

    // ─── Relationships ──────────────────────────────────────────────

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function courses(): HasMany
    {
        return $this->hasMany(Course::class, 'instructor_id');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class);
    }

    public function loginSessions(): HasMany
    {
        return $this->hasMany(LoginSession::class);
    }

    public function quizAttempts(): HasMany
    {
        return $this->hasMany(QuizAttempt::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class);
    }

    public function stat(): HasOne
    {
        return $this->hasOne(UserStat::class);
    }

    public function badges(): BelongsToMany
    {
        return $this->belongsToMany(Badge::class, 'user_badges')->withPivot('earned_at');
    }

    // ─── Role Helpers ───────────────────────────────────────────────

    public function hasRole(string $roleName): bool
    {
        return $this->role->name === $roleName;
    }

    public function hasAnyRole(array $roleNames): bool
    {
        return in_array($this->role->name, $roleNames);
    }

    public function isAdmin(): bool
    {
        return $this->hasAnyRole([Role::PLATFORM_ADMIN, Role::SUPER_ADMIN]);
    }

    public function isInstructor(): bool
    {
        return $this->hasRole(Role::INSTRUCTOR);
    }

    public function isStudent(): bool
    {
        return $this->hasRole(Role::STUDENT);
    }

    /**
     * Privileged roles are required to hold 2FA (Plan §7.1) — these are the
     * accounts that can publish content, change roles, or issue refunds.
     */
    public function requiresTwoFactor(): bool
    {
        return $this->hasAnyRole([
            Role::INSTRUCTOR,
            Role::COURSE_MANAGER,
            Role::PLATFORM_ADMIN,
            Role::SUPER_ADMIN,
        ]);
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole(Role::SUPER_ADMIN);
    }

    /**
     * Check if user is enrolled in a specific course with active status.
     */
    public function isEnrolledIn(string $courseId): bool
    {
        return $this->enrollments()
            ->where('course_id', $courseId)
            ->where('status', 'active')
            ->exists();
    }
}
