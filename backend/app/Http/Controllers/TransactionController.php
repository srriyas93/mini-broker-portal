<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreTransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Services\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function __construct(
        protected TransactionService $transactionService
    ) {}

    /**
     * List transactions for the authenticated client.
     */
    public function index(Request $request): JsonResponse
    {
        $transactions = $request->user()
            ->transactions()
            ->latest('id')
            ->paginate($request->integer('per_page', 15));

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
     * Submit a deposit or withdrawal request.
     */
    public function store(StoreTransactionRequest $request): JsonResponse
    {
        $transaction = $this->transactionService->create(
            $request->user(),
            $request->validated('type'),
            $request->validated('amount'),
            $request->validated('note')
        );

        return response()->json([
            'message' => ucfirst($request->validated('type')) . ' request submitted successfully.',
            'transaction' => new TransactionResource($transaction),
        ], 201);
    }
}

