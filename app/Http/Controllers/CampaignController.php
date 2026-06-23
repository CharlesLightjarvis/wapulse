<?php

namespace App\Http\Controllers;

use App\Imports\ProspectsImport;
use App\Jobs\SendWhatsAppMessage;
use App\Models\Campaign;
use App\Models\Prospect;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class CampaignController extends Controller
{
    public function index()
    {
        return Inertia::render('campaigns/index', [
            'campaigns' => Campaign::withCount('prospects')
                ->latest()
                ->get()
                ->map(fn($c) => [
                    'id'              => $c->id,
                    'name'            => $c->name,
                    'description'     => $c->description,
                    'status'          => $c->status,
                    'expires_at'      => $c->expires_at?->toISOString(),
                    'prospects_count' => $c->prospects_count,
                    'created_at'      => $c->created_at->toISOString(),
                ]),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'required|string',
            'message'     => 'required|string',
            'csv_file'    => 'required|file|mimes:csv,txt,xlsx,xls',
        ]);

        $campaign = Campaign::create([
            'name'        => $data['name'],
            'description' => $data['description'],
            'status'      => 'pending',
            'expires_at'  => now()->addHours(24),
        ]);

        Excel::import(new ProspectsImport($campaign->id), $request->file('csv_file'));

        $campaign->update(['status' => 'running']);

        $delay = 0;
        Prospect::where('campaign_id', $campaign->id)->each(function (Prospect $prospect) use ($data, &$delay) {
            $personalized = str_replace(
                ['{first_name}', '{last_name}', '{full_name}'],
                [$prospect->first_name, $prospect->last_name, trim("{$prospect->first_name} {$prospect->last_name}")],
                $data['message']
            );

            $prospect->update(['message' => $personalized]);

            SendWhatsAppMessage::dispatch($prospect)->delay(now()->addSeconds($delay));
            $delay += 15;
        });

        return redirect()->route('campaigns.show', $campaign)
            ->with('success', 'Campaign launched! Messages will be sent in the next ' . ceil($delay / 60) . ' minutes.');
    }

    public function show(Campaign $campaign)
    {
        $prospects = $campaign->prospects()
            ->orderBy('id')
            ->get()
            ->map(fn($p) => [
                'id'          => $p->id,
                'first_name'  => $p->first_name,
                'last_name'   => $p->last_name,
                'phone'       => $p->phone,
                'status'      => $p->status,
                'sent_at'     => $p->sent_at?->toISOString(),
                'message'     => $p->message,
            ]);

        $stats = [
            'total'   => $prospects->count(),
            'pending' => $prospects->where('status', 'pending')->count(),
            'sent'    => $prospects->where('status', 'sent')->count(),
            'failed'  => $prospects->where('status', 'failed')->count(),
        ];

        $nextJobTimestamp = DB::table('jobs')
            ->where('payload', 'like', '%SendWhatsAppMessage%')
            ->orderBy('available_at')
            ->value('available_at');

        $nextSendAt = $nextJobTimestamp
            ? \Carbon\Carbon::createFromTimestamp($nextJobTimestamp)->toISOString()
            : null;

        return Inertia::render('campaigns/show', [
            'campaign'    => [
                'id'          => $campaign->id,
                'name'        => $campaign->name,
                'description' => $campaign->description,
                'status'      => $campaign->status,
                'expires_at'  => $campaign->expires_at?->toISOString(),
                'created_at'  => $campaign->created_at->toISOString(),
            ],
            'prospects'   => $prospects,
            'stats'       => $stats,
            'next_send_at' => $nextSendAt,
        ]);
    }

    public function destroy(Campaign $campaign)
    {
        $campaign->delete();
        return redirect()->route('campaigns.index');
    }
}
