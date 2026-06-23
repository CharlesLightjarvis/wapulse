<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class StatusController extends Controller
{
    private function sessionId(): string
    {
        return config('services.openwa.session_id');
    }

    private function baseUrl(): string
    {
        return config('services.openwa.url');
    }

    private function headers(): array
    {
        return ['x-api-key' => config('services.openwa.api_key')];
    }

    public function index()
    {
        $response = Http::timeout(10)
            ->withHeaders($this->headers())
            ->get($this->baseUrl() . '/api/sessions/' . $this->sessionId() . '/status');

        $statuses = $response->successful() ? ($response->json('statuses') ?? []) : [];

        return Inertia::render('statuses/index', [
            'statuses' => $statuses,
            'error'    => $response->successful() ? null : 'Could not fetch statuses from OpenWA.',
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'text'            => 'required|string|max:700',
            'background_color' => 'nullable|string|max:7',
            'font'            => 'nullable|integer|min:0|max:4',
        ]);

        $response = Http::timeout(30)
            ->withHeaders($this->headers())
            ->post($this->baseUrl() . '/api/sessions/' . $this->sessionId() . '/status/send-text', [
                'text'            => $data['text'],
                'backgroundColor' => $data['background_color'] ?? '#000000',
                'font'            => $data['font'] ?? 0,
            ]);

        if ($response->successful()) {
            return redirect()->route('statuses.index')->with('success', 'Status posted successfully!');
        }

        return back()->withErrors(['text' => 'OpenWA error: ' . $response->body()]);
    }
}
