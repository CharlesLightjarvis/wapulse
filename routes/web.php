<?php

use App\Http\Controllers\CampaignController;
use App\Http\Controllers\StatusController;
use App\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

// OpenWA webhook — public, no CSRF, no auth
Route::post('/webhook/openwa', [WebhookController::class, 'receive'])
    ->name('webhook.openwa')
    ->withoutMiddleware(['web']);

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::resource('campaigns', CampaignController::class)
        ->only(['index', 'store', 'show', 'destroy']);

    Route::resource('statuses', StatusController::class)
        ->only(['index', 'store']);
});

require __DIR__.'/settings.php';
