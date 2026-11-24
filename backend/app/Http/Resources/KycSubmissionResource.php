<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\KycStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\KycSubmission
 */
class KycSubmissionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $idUrl = $this->document_front_path
            ? url("/api/kyc-documents/{$this->id}/id")
            : null;

        $addressUrl = $this->document_back_path
            ? url("/api/kyc-documents/{$this->id}/address")
            : null;

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'document_type' => $this->document_type,
            'document_number' => $this->document_number,
            'status' => $this->status instanceof KycStatus ? $this->status->value : (string) $this->status,
            'rejection_reason' => $this->rejection_reason,
            'reviewed_by' => $this->reviewed_by,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'id_document_url' => $idUrl,
            'address_document_url' => $addressUrl,
            // Expose secure API URLs instead of raw storage paths
            'document_front_path' => $idUrl,
            'document_back_path' => $addressUrl,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'user' => new UserResource($this->whenLoaded('user')),
        ];
    }
}

