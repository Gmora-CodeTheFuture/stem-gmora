<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'display_name',
        'description',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    // Role constants
    public const VISITOR = 'visitor';

    public const STUDENT = 'student';

    public const INSTRUCTOR = 'instructor';

    public const TEACHING_ASSISTANT = 'teaching_assistant';

    public const COURSE_MANAGER = 'course_manager';

    public const PLATFORM_ADMIN = 'platform_admin';

    public const SUPER_ADMIN = 'super_admin';

    public const ORGANIZATION_ADMIN = 'organization_admin';
}
