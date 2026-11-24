<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\KycUploadRequest;
use App\Http\Resources\KycSubmissionResource;
use App\Models\KycSubmission;
use App\Services\KycService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class KycController extends Controller
{
    public function __construct(
        protected KycService $kycService
    ) {}

    /**
     * Submit KYC documents for verification.
     */
    public function upload(KycUploadRequest $request): JsonResponse
    {
        $submission = $this->kycService->upload(
            $request->user(),
            $request->file('id_document'),
            $request->file('address_document'),
            $request->validated()
        );

        return response()->json([
            'message' => 'KYC documents submitted successfully for review.',
            'submission' => new KycSubmissionResource($submission),
        ], 201);
    }

    /**
     * Get the latest KYC submission status for the authenticated user.
     */
    public function status(Request $request): JsonResponse
    {
        $latest = $request->user()->latestKyc()->first();

        return response()->json([
            'submission' => $latest ? new KycSubmissionResource($latest) : null,
        ]);
    }

    /**
     * Stream a secured KYC document file (id or address).
     * Accessible only by Admins or the document owner.
     */
    public function streamDocument(Request $request, KycSubmission $submission, string $type): Response
    {
        $user = $request->user();

        // Verifying $user->isAdmin() || $user->id === $submission->user_id (403 otherwise)
        if ($user === null || (!$user->isAdmin() && (int) $user->id !== (int) $submission->user_id)) {
            return response()->json([
                'message' => 'Forbidden. You do not have permission to view this document.',
            ], 403);
        }

        if (!in_array($type, ['id', 'address'], true)) {
            return response()->json([
                'message' => 'Invalid document type. Must be id or address.',
            ], 404);
        }

        $filePath = match ($type) {
            'id' => $submission->document_front_path,
            'address' => $submission->document_back_path,
        };

        if (empty($filePath) || !Storage::disk('local')->exists($filePath)) {
            return response()->json([
                'message' => 'Document file not found.',
            ], 404);
        }

        return Storage::disk('local')->response($filePath);
    }
}
