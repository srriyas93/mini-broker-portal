<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Transaction
 */
class TransactionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'type' => $this->type instanceof TransactionType ? $this->type->value : (string) $this->type,
            'amount' => $this->amount,
            'fee' => $this->fee,
            'status' => $this->status instanceof TransactionStatus ? $this->status->value : (string) $this->status,
            'reference_id' => $this->reference_id,
            'description' => $this->description,
            'metadata' => $this->metadata,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'user' => new UserResource($this->whenLoaded('user')),
        ];
    }
}

