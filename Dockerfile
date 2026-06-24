FROM php:8.3-fpm

ARG NODE_VERSION=22

# System dependencies
RUN apt-get update && apt-get install -y \
    git curl zip unzip \
    libzip-dev libpng-dev libxml2-dev \
    libonig-dev libsqlite3-dev libicu-dev \
    nginx supervisor ca-certificates gnupg \
    && rm -rf /var/lib/apt/lists/*

# PHP extensions (intl needed by phpspreadsheet/maatwebsite-excel)
RUN docker-php-ext-install \
        pdo_sqlite mbstring xml bcmath zip gd intl \
    && docker-php-ext-enable opcache

# Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY . .

# Temporary .env so artisan can bootstrap (removed after build)
RUN cp .env.example .env && php artisan key:generate --force

# PHP dependencies — no scripts so @php artisan doesn't run during install
RUN composer install --no-scripts --optimize-autoloader --no-interaction --no-dev

# Package discovery with PHP 8.3
RUN php artisan package:discover --ansi

# Remove build-time .env
RUN rm .env

# Frontend build
RUN npm ci && npm run build && rm -rf node_modules

# Permissions
RUN mkdir -p \
        storage/logs \
        storage/framework/sessions \
        storage/framework/views \
        storage/framework/cache \
        bootstrap/cache \
        /var/log/nginx \
    && touch database/database.sqlite \
    && chown -R www-data:www-data storage bootstrap/cache database \
    && chmod -R 775 storage bootstrap/cache

COPY .docker/nginx.conf /etc/nginx/nginx.conf
COPY .docker/php-fpm.conf /usr/local/etc/php-fpm.d/www.conf
COPY .docker/supervisord.conf /etc/supervisor/supervisord.conf
COPY .docker/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
