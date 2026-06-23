<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class RegisterOpenWaWebhook extends Command
{
    protected $signature   = 'openwa:register-webhook {--force : Delete existing webhooks first}';
    protected $description = 'Register the auto-reply webhook with OpenWA';

    public function handle(): int
    {
        $baseUrl   = config('services.openwa.url');
        $apiKey    = config('services.openwa.api_key');
        $sessionId = config('services.openwa.session_id');
        $headers   = ['x-api-key' => $apiKey];

        $webhookUrl = config('app.url') . '/webhook/openwa';
        $secret     = config('services.openwa.webhook_secret');

        $this->info("OpenWA URL : {$baseUrl}");
        $this->info("Session    : {$sessionId}");
        $this->info("Webhook URL: {$webhookUrl}");

        // List existing webhooks
        $existing = Http::withHeaders($headers)
            ->get("{$baseUrl}/api/sessions/{$sessionId}/webhooks")
            ->json();

        if ($this->option('force') && ! empty($existing)) {
            foreach ($existing as $wh) {
                Http::withHeaders($headers)
                    ->delete("{$baseUrl}/api/sessions/{$sessionId}/webhooks/{$wh['id']}");
                $this->line("Deleted existing webhook: {$wh['id']}");
            }
        }

        // Check if already registered
        foreach ($existing as $wh) {
            if ($wh['url'] === $webhookUrl) {
                $this->warn('Webhook already registered: ' . $wh['id']);
                return self::SUCCESS;
            }
        }

        // Register
        $payload = [
            'url'        => $webhookUrl,
            'events'     => ['message.received'],
            'retryCount' => 3,
        ];

        if ($secret) {
            $payload['secret'] = $secret;
        }

        $response = Http::withHeaders($headers)
            ->post("{$baseUrl}/api/sessions/{$sessionId}/webhooks", $payload);

        if ($response->successful()) {
            $id = $response->json('id');
            $this->info("✓ Webhook registered! ID: {$id}");
            if (! $secret) {
                $this->warn('No OPENWA_WEBHOOK_SECRET set — signature verification is disabled.');
            }
            return self::SUCCESS;
        }

        $this->error('Failed: ' . $response->body());
        return self::FAILURE;
    }
}
