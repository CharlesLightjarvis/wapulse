<?php

namespace App\Imports;

use App\Models\Prospect;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithChunkReading;

class ProspectsImport implements ToModel, WithHeadingRow, WithChunkReading
{
    public function __construct(private int $campaignId) {}

    public function model(array $row): Prospect
    {
        return new Prospect([
            'campaign_id'   => $this->campaignId,
            'first_name'    => $row['first_name'] ?? $row['prenom'] ?? '',
            'last_name'     => $row['last_name'] ?? $row['nom'] ?? null,
            'phone'         => $row['phone'] ?? $row['telephone'] ?? '',
            'email'         => $row['email'] ?? null,
            'position'      => $row['position'] ?? $row['poste'] ?? null,
            'sector'        => $row['sector'] ?? $row['secteur'] ?? null,
            'member_status' => $row['member_status'] ?? $row['statut'] ?? null,
            'status'        => 'pending',
        ]);
    }

    public function chunkSize(): int
    {
        return 200;
    }
}
