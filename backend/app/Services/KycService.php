<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\KycStatus;
use App\Models\ActivityLog;
use App\Models\KycSubmission;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class KycService
{
    /**
     * Upload and create a new KYC submission for the client.
     *
     * @param array<string, mixed> $additionalData
     */
    public function upload(
        User $user,
        UploadedFile $idFile,
        UploadedFile $addressFile,
        array $additionalData = []
    ): KycSubmission {
        // Allow re-upload only if no submission exists or latest status is rejected
        $latestKyc = $user->kycSubmissions()->latest('id')->first();
        if ($latestKyc !== null && !$latestKyc->isRejected()) {
            throw new HttpException(
                422,
                'A KYC submission already exists and cannot be re-uploaded unless your previous submission was rejected.'
            );
        }

        // Store files on private local disk (storage/app/kyc_documents), never public
        $idPath = $idFile->store('kyc_documents', 'local');
        $addressPath = $addressFile->store('kyc_documents', 'local');

        $submission = KycSubmission::create([
            'user_id' => $user->id,
            'document_type' => $additionalData['document_type'] ?? 'identity_and_address',
            'document_number' => $additionalData['document_number'] ?? null,
            'document_front_path' => $idPath,
            'document_back_path' => $addressPath,
            'status' => KycStatus::PENDING,
            'rejection_reason' => null,
            'reviewed_by' => null,
            'reviewed_at' => null,
        ]);

        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'kyc_submitted',
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'details' => [
                'message' => "Client submitted KYC verification documents #{$submission->id}",
                'kyc_submission_id' => $submission->id,
            ],
        ]);

        return $submission;
    }

    /**
     * Review (approve/reject) a KYC submission.
     */
    public function review(
        KycSubmission $submission,
        User $adminUser,
        string $status,
        ?string $rejectionReason = null
    ): KycSubmission {
        return DB::transaction(function () use ($submission, $adminUser, $status, $rejectionReason) {
            $locked = KycSubmission::where('id', $submission->id)
                ->lockForUpdate()
                ->firstOrFail();

            $kycStatus = KycStatus::from($status);

            $locked->status = $kycStatus;
            $locked->rejection_reason = $kycStatus === KycStatus::REJECTED ? $rejectionReason : null;
            $locked->reviewed_by = $adminUser->id;
            $locked->reviewed_at = now();
            $locked->save();

            $client = $locked->user;
            $clientName = $client ? $client->name : 'Client';

            $actionMessage = $kycStatus === KycStatus::APPROVED
                ? "Admin approved KYC submission #{$locked->id} for {$clientName}"
                : "Admin rejected KYC submission #{$locked->id} for {$clientName}. Reason: {$rejectionReason}";

            ActivityLog::create([
                'user_id' => $adminUser->id,
                'action' => "admin_{$status}_kyc",
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'details' => [
                    'message' => $actionMessage,
                    'kyc_submission_id' => $locked->id,
                    'client_id' => $locked->user_id,
                    'status' => $status,
                    'rejection_reason' => $rejectionReason,
                ],
            ]);

            return $locked;
        });
    }
}

