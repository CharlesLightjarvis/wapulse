<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class WebhookController extends Controller
{
    /**
     * Keyword → auto-reply config.
     * Each entry: 'type' => 'text'|'document', plus the relevant fields.
     */
    private array $keywords = [
        'DETTES' => [
            'type'         => 'document',
            'storage_path' => 'sss.pdf',   // storage/app/public/sss.pdf — disk('public')
            'filename'     => 'guide-dettes.pdf',
            'mimetype'     => 'application/pdf',
            'caption'      => "Voici le guide complet sur la gestion des dettes. N'hésitez pas à me contacter pour toute question.",
        ],
        'NON' => [
            'type' => 'text',
            'text' => "Merci pour votre retour ! Si vous changez d'avis ou souhaitez plus d'informations à l'avenir, n'hésitez pas à me contacter. Belle journée ! 🙏",
        ],
    ];

    public function receive(Request $request): Response
    {
        // 1. Verify HMAC signature
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
        $from      = $data['from']      ?? null;    // e.g. "21628509092@c.us"
        $body      = strtoupper(trim($data['body'] ?? ''));
        $sessionId = $payload['sessionId'] ?? config('services.openwa.session_id');

        if (! $from || ! $body) {
            return response('OK', 200);
        }

        // Ignore group messages
        if (str_contains($from, '@g.us')) {
            return response('OK', 200);
        }

        // 2. Match keyword
        $reply = $this->keywords[$body] ?? null;
        if (! $reply) {
            return response('OK', 200);
        }

        Log::info('OpenWA auto-reply triggered', ['from' => $from, 'keyword' => $body]);

        // 3. Send auto-reply
        if ($reply['type'] === 'document') {
            $this->sendDocument($sessionId, $from, $reply['storage_path'], $reply['filename'], $reply['mimetype'], $reply['caption']);
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

    private function sendDocument(string $sessionId, string $chatId, string $storagePath, string $filename, string $mimetype, string $caption): void
    {
        if (! Storage::disk('public')->exists($storagePath)) {
            Log::error('OpenWA auto-reply: file not found', ['path' => $storagePath]);
            return;
        }

        $base64 = base64_encode(Storage::disk('public')->get($storagePath));

        Http::timeout(60)
            ->withHeaders(['x-api-key' => config('services.openwa.api_key')])
            ->post(config('services.openwa.url') . "/api/sessions/{$sessionId}/messages/send-document", [
                'chatId'   => $chatId,
                'base64'   => $base64,
                'mimetype' => $mimetype,
                'filename' => $filename,
                'caption'  => $caption,
            ]);
    }
}
