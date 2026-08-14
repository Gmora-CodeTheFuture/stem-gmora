<?php

namespace App\Auth;

use App\Models\User;
use Illuminate\Auth\EloquentUserProvider;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Cache;

/**
 * Every authenticated request loads the signed-in user. Against a distant
 * database that single query dominates the response, so the user's attributes
 * are cached and the model is hydrated without a round trip.
 *
 * Only plain attribute arrays are cached — never the model object, which would
 * deserialise as __PHP_Incomplete_Class. The User model clears its own key on
 * save and delete, so any change to the account invalidates this immediately.
 */
class CachedUserProvider extends EloquentUserProvider
{
    public const TTL_MINUTES = 10;

    public static function key(string $id): string
    {
        return "auth:user:{$id}";
    }

    public static function forget(?string $id): void
    {
        if ($id) {
            Cache::forget(self::key($id));
        }
    }

    public function retrieveById($identifier): ?Authenticatable
    {
        if (! is_string($identifier) || $identifier === '') {
            return parent::retrieveById($identifier);
        }

        $attributes = Cache::remember(
            self::key($identifier),
            now()->addMinutes(self::TTL_MINUTES),
            function () use ($identifier) {
                $user = parent::retrieveById($identifier);

                return $user instanceof User ? $user->getAttributes() : null;
            },
        );

        if (! is_array($attributes)) {
            return null;
        }

        $model = $this->createModel();

        return $model->newInstance([], true)->setRawAttributes($attributes, true);
    }
}
