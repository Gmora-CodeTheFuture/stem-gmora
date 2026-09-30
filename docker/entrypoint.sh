#!/usr/bin/env sh
set -eu

ROLE="${1:-${APP_ROLE:-web}}"

cd /var/www/html

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

wait_for_db() {
    if [ -z "${DB_HOST:-}" ] || [ "${DB_CONNECTION:-}" = "sqlite" ]; then
        return 0
    fi
    echo "Waiting for database ${DB_HOST}:${DB_PORT:-5432}..."
    i=0
    until php -r "
        try {
            new PDO(
                sprintf('pgsql:host=%s;port=%s;dbname=%s', getenv('DB_HOST'), getenv('DB_PORT') ?: '5432', getenv('DB_DATABASE')),
                getenv('DB_USERNAME'),
                getenv('DB_PASSWORD')
            );
            exit(0);
        } catch (Throwable \$e) {
            exit(1);
        }
    "; do
        i=$((i + 1))
        if [ "$i" -ge 60 ]; then
            echo "Database not ready after 60s" >&2
            exit 1
        fi
        sleep 1
    done
}

wait_for_db

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    echo "Running migrations..."
    php artisan migrate --force --no-interaction
fi

if [ -n "${APP_KEY:-}" ] && [ "${CACHE_CONFIG:-true}" = "true" ] && [ "${APP_ENV:-production}" != "local" ]; then
    php artisan config:cache --no-interaction || true
    php artisan route:cache --no-interaction || true
    php artisan view:cache --no-interaction || true
    php artisan event:cache --no-interaction || true
fi

case "$ROLE" in
    web)
        exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
        ;;
    worker)
        exec php artisan queue:work --sleep=1 --tries=3 --max-time=3600 --no-interaction
        ;;
    scheduler)
        exec php artisan schedule:work --no-interaction
        ;;
    migrate)
        exec php artisan migrate --force --no-interaction
        ;;
    *)
        shift
        exec "$@"
        ;;
esac
