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
php artisan storage:link --force
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Start all processes via supervisor
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
