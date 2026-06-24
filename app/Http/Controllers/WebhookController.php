<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    private array $keywords = [
        'DETTES' => [
            'type'     => 'document',
            'url'      => '/storage/sss.pdf',
            'filename' => 'guide-dettes.pdf',
            'caption'  => "Voici le guide complet sur la gestion des dettes. N'hésitez pas à me contacter pour toute question.",
        ],
        'NON' => [
            'type' => 'text',
            'text' => "Merci pour votre retour ! Si vous changez d'avis ou souhaitez plus d'informations à l'avenir, n'hésitez pas à me contacter. Belle journée ! 🙏",
        ],
    ];

    public function receive(Request $request): Response
    {
        $secret = config('services.openwa.webhook_secret');
        if ($secret) {
            $signature = $request->header('X-OpenWA-Signature', '');
            $expected  = 'sha256=' . hash_hmac('sha256', $request->getContent(), $secret);
            if (! hash_equals($expected, $signature)) {
                Log::warning('OpenWA webhook: invalid signature');
                return response('Forbidden', 403);
            }
        }

        $payload = $request->json()->all();
        $event   = $request->header('X-OpenWA-Event') ?? ($payload['event'] ?? null);

        if ($event !== 'message.received') {
            return response('OK', 200);
        }

        $data      = $payload['data'] ?? [];
        $from      = $data['from']      ?? null;
        $body      = strtoupper(trim($data['body'] ?? ''));
        $sessionId = $payload['sessionId'] ?? config('services.openwa.session_id');

        if (! $from || ! $body) {
            return response('OK', 200);
        }

        if (str_contains($from, '@g.us')) {
            return response('OK', 200);
        }

        $reply = $this->keywords[$body] ?? null;
        if (! $reply) {
            return response('OK', 200);
        }

        Log::info('OpenWA auto-reply triggered', ['from' => $from, 'keyword' => $body]);

        if ($reply['type'] === 'document') {
            $this->sendDocument($sessionId, $from, $reply['url'], $reply['filename'], $reply['caption']);
        } else {
            $this->sendText($sessionId, $from, $reply['text']);
        }

        return response('OK', 200);
    }

    private function sendText(string $sessionId, string $chatId, string $text): void
    {
        Http::timeout(15)
            ->withHeaders(['x-api-key' => config('services.openwa.api_key')])
            ->post(config('services.openwa.url') . "/api/sessions/{$sessionId}/messages/send-text", [
                'chatId' => $chatId,
                'text'   => $text,
            ]);
    }

    private function sendDocument(string $sessionId, string $chatId, string $path, string $filename, string $caption): void
    {
        $url = rtrim(config('app.url'), '/') . $path;

        Log::info('OpenWA sending document via URL', ['url' => $url, 'to' => $chatId]);

        $response = Http::timeout(30)
            ->withHeaders(['x-api-key' => config('services.openwa.api_key')])
            ->post(config('services.openwa.url') . "/api/sessions/{$sessionId}/messages/send-document", [
                'chatId'   => $chatId,
                'url'      => $url,
                'filename' => $filename,
                'caption'  => $caption,
            ]);

        if (! $response->successful()) {
            Log::error('OpenWA send-document failed', ['status' => $response->status(), 'body' => $response->body()]);
        }
    }
}
