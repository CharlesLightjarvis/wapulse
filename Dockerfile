# ---------- Frontend build ----------
FROM node:22-alpine AS frontend

WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

RUN npm install

COPY resources ./resources
COPY public ./public
COPY vite.config.* ./
COPY tsconfig.json* ./
COPY tailwind.config.* ./
COPY postcss.config.* ./
COPY components.json* ./

RUN npm run build

FROM php:8.4-fpm

WORKDIR /var/www/html

ENV COMPOSER_ALLOW_SUPERUSER=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    git \
    curl \
    zip \
    unzip \
    libzip-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libxml2-dev \
    libonig-dev \
    libicu-dev \
    libsqlite3-dev \
    ca-certificates \
    nodejs \
    npm \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_mysql \
        pdo_sqlite \
        mbstring \
        zip \
        exif \
        pcntl \
        bcmath \
        gd \
        intl \
        dom \
        simplexml \
        xml \
        xmlreader \
        xmlwriter \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./

RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

RUN npm run build

COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/start.sh /usr/local/bin/start.sh

RUN chmod +x /usr/local/bin/start.sh \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwx storage bootstrap/cache

EXPOSE 80

CMD ["/usr/local/bin/start.sh"]