<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Prospect extends Model
{
    protected $fillable = [
        'campaign_id', 'first_name', 'last_name', 'phone',
        'email', 'position', 'sector', 'member_status',
        'message', 'status', 'sent_at', 'wa_response',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'wa_response' => 'array',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}
