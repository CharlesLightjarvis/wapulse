#!/usr/bin/env bash
set -e

cd /var/www/html

if [ ! -f ".env" ]; then
    echo "No .env file found. Coolify environment variables will be used."
fi

php artisan storage:link || true

# PDF auto-reply asset
cp /var/www/html/resources/pdf/sss.pdf /var/www/html/storage/app/public/sss.pdf 2>/dev/null || true
chown www-data:www-data /var/www/html/storage/app/public/sss.pdf 2>/dev/null || true

php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

php artisan migrate --force || true

php artisan optimize || true

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf