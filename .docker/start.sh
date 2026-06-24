#!/usr/bin/env bash
set -e

cd /var/www/html

if [ ! -f ".env" ]; then
    echo "No .env file found. Coolify environment variables will be used."
fi

php artisan storage:link || true

php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

php artisan migrate --force || true

php artisan optimize || true

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf