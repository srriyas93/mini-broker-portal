<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Requests\KycReviewRequest;
use App\Http\Requests\ReviewTransactionRequest;
use App\Http\Resources\ActivityLogResource;
use App\Http\Resources\KycSubmissionResource;
use App\Http\Resources\TransactionResource;
use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use App\Models\KycSubmission;
use App\Models\Transaction;
use App\Models\User;
use App\Services\KycService;
use App\Services\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminClientController extends Controller
{
    public function __construct(
        protected KycService $kycService,
        protected TransactionService $transactionService
    ) {}

    /**
     * Paginated list of clients with search (name/email) and kyc_status filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::where('role', UserRole::CLIENT->value)
            ->with(['latestKyc']);

        // Search by name or email
        if ($request->filled('search')) {
            $search = (string) $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Filter by kyc_status
        if ($request->filled('kyc_status')) {
            $status = (string) $request->input('kyc_status');

            if ($status === 'none' || $status === 'unverified') {
                $query->whereDoesntHave('kycSubmissions');
            } else {
                $query->whereHas('latestKyc', function ($q) use ($status) {
                    $q->where('status', $status);
                });
            }
        }

        $clients = $query->latest('id')->paginate($request->integer('per_page', 15));

        return response()->json([
            'data' => UserResource::collection($clients),
            'meta' => [
                'current_page' => $clients->currentPage(),
                'last_page' => $clients->lastPage(),
                'per_page' => $clients->perPage(),
                'total' => $clients->total(),
            ],
        ]);
    }

    /**
     * Client detail returning profile, balance, latest KYC submission, and transactions.
     */
    public function show(User $client): JsonResponse
    {
        if (!$client->isClient()) {
            return response()->json([
                'message' => 'Client not found.',
            ], 404);
        }

        $client->load([
            'latestKyc',
            'transactions' => fn($q) => $q->latest('id'),
        ]);

        $latestKyc = $client->latestKyc;

        return response()->json([
            'profile' => new UserResource($client),
            'balance' => $client->balance,
            'latest_kyc' => $latestKyc ? new KycSubmissionResource($latestKyc) : null,
            'transactions' => TransactionResource::collection($client->transactions),
        ]);
    }

    /**
     * Admin review (approve/reject) of a KYC submission.
     */
    public function reviewKyc(KycReviewRequest $request, KycSubmission $submission): JsonResponse
    {
        $updated = $this->kycService->review(
            $submission,
            $request->user(),
            $request->validated('status'),
            $request->validated('rejection_reason')
        );

        return response()->json([
            'message' => 'KYC submission ' . $request->validated('status') . ' successfully.',
            'submission' => new KycSubmissionResource($updated),
        ]);
    }

    /**
     * Shortcut to approve a KYC submission.
     */
    public function approveKyc(Request $request, KycSubmission $submission): JsonResponse
    {
        $updated = $this->kycService->review(
            $submission,
            $request->user(),
            'approved'
        );

        return response()->json([
            'message' => 'KYC submission approved successfully.',
            'submission' => new KycSubmissionResource($updated),
        ]);
    }

    /**
     * Shortcut to reject a KYC submission (requires reason).
     */
    public function rejectKyc(Request $request, KycSubmission $submission): JsonResponse
    {
        $request->validate([
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ], [
            'rejection_reason.required' => 'A rejection reason is required when rejecting a KYC submission.',
        ]);

        $updated = $this->kycService->review(
            $submission,
            $request->user(),
            'rejected',
            (string) $request->input('rejection_reason')
        );

        return response()->json([
            'message' => 'KYC submission rejected successfully.',
            'submission' => new KycSubmissionResource($updated),
        ]);
    }

    /**
     * Atomically approve a deposit or withdrawal transaction.
     */
    public function approveTransaction(Request $request, Transaction $transaction): JsonResponse
    {
        $updated = $this->transactionService->approve($transaction, $request->user());

        return response()->json([
            'message' => ucfirst($updated->type->value) . ' approved successfully.',
            'transaction' => new TransactionResource($updated),
        ]);
    }

    /**
     * Atomically reject a deposit or withdrawal transaction.
     */
    public function rejectTransaction(ReviewTransactionRequest $request, Transaction $transaction): JsonResponse
    {
        $updated = $this->transactionService->reject(
            $transaction,
            $request->user(),
            $request->validated('reason')
        );

        return response()->json([
            'message' => ucfirst($updated->type->value) . ' rejected successfully.',
            'transaction' => new TransactionResource($updated),
        ]);
    }

    /**
     * Paginated list of all transactions for admin review.
     */
    public function transactions(Request $request): JsonResponse
    {
        $query = Transaction::with(['user'])->latest('id');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        $transactions = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => TransactionResource::collection($transactions),
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    /**
     * Paginated audit log of admin activities.
     */
    public function activityLogs(Request $request): JsonResponse
    {
        $logs = ActivityLog::with('user')
            ->latest('id')
            ->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => ActivityLogResource::collection($logs),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
