#!/bin/bash
set -e

# Permissions
chown -R www-data:www-data /app/storage /app/bootstrap/cache /app/database
chmod -R 775 /app/storage /app/bootstrap/cache

# SQLite DB
touch /app/database/database.sqlite
chown www-data:www-data /app/database/database.sqlite

# Laravel
cd /app
/usr/local/bin/php artisan storage:link --force
/usr/local/bin/php artisan migrate --force
/usr/local/bin/php artisan config:cache
/usr/local/bin/php artisan route:cache
/usr/local/bin/php artisan view:cache

# Start all processes via supervisor
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
