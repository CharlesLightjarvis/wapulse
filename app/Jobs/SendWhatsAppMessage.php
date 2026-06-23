<?php

namespace App\Jobs;

use App\Models\Prospect;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendWhatsAppMessage implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public Prospect $prospect) {}

    public function handle(): void
    {
        $phone = preg_replace('/[^0-9]/', '', $this->prospect->phone);

        $sessionId = config('services.openwa.session_id');

        $response = Http::timeout(30)
            ->withHeaders(['x-api-key' => config('services.openwa.api_key')])
            ->post(config('services.openwa.url') . "/api/sessions/{$sessionId}/messages/send-text", [
                'chatId' => $phone . '@c.us',
                'text'   => $this->prospect->message,
            ]);

        $this->prospect->update([
            'status'      => $response->successful() ? 'sent' : 'failed',
            'sent_at'     => now(),
            'wa_response' => $response->json(),
        ]);

        if (! $response->successful()) {
            Log::error('OpenWA send failed', [
                'prospect_id' => $this->prospect->id,
                'status'      => $response->status(),
                'body'        => $response->body(),
            ]);
        }

        $campaign = $this->prospect->campaign;
        $stillPending = $campaign->prospects()->where('status', 'pending')->count();

        if ($stillPending === 0) {
            $campaign->update(['status' => 'completed']);
        }
    }
}
