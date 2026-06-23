<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Campaign extends Model
{
    protected $fillable = ['name', 'description', 'status', 'expires_at'];

    protected $casts = ['expires_at' => 'datetime'];

    public function prospects(): HasMany
    {
        return $this->hasMany(Prospect::class);
    }
}
