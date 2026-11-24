<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Models\ActivityLog;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class TransactionService
{
    /**
     * Create a deposit or withdrawal request for a client.
     */
    public function create(
        User $user,
        string $type,
        string|float $amount,
        ?string $note = null
    ): Transaction {
        $amountStr = number_format((float) $amount, 2, '.', '');

        if (bccomp($amountStr, '0.00', 2) <= 0) {
            throw new HttpException(422, 'Transaction amount must be greater than zero.');
        }

        $txType = TransactionType::from($type);

        // Reject withdrawals if client KYC is not approved or bccomp($balance, $amount, 2) < 0
        if ($txType === TransactionType::WITHDRAWAL) {
            if (!$user->isKycApproved()) {
                throw new HttpException(422, 'Withdrawals require an approved KYC verification.');
            }

            $currentBalance = number_format((float) $user->balance, 2, '.', '');
            if (bccomp($currentBalance, $amountStr, 2) < 0) {
                throw new HttpException(422, 'Insufficient funds for withdrawal request.');
            }
        }

        $referenceId = 'TXN-' . strtoupper(Str::random(12));

        $transaction = Transaction::create([
            'user_id' => $user->id,
            'type' => $txType,
            'amount' => $amountStr,
            'fee' => '0.00',
            'status' => TransactionStatus::PENDING,
            'reference_id' => $referenceId,
            'description' => $note,
            'metadata' => [
                'note' => $note,
                'requested_at' => now()->toIso8601String(),
            ],
        ]);

        ActivityLog::create([
            'user_id' => $user->id,
            'action' => "{$type}_requested",
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'details' => [
                'message' => sprintf(
                    'Client requested %s #%d of $%s',
                    $type,
                    $transaction->id,
                    $amountStr
                ),
                'transaction_id' => $transaction->id,
                'amount' => $amountStr,
                'type' => $type,
            ],
        ]);

        return $transaction;
    }

    /**
     * Atomically approve a transaction using lockForUpdate() on transaction and user rows.
     */
    public function approve(Transaction $transaction, User $adminUser): Transaction
    {
        return DB::transaction(function () use ($transaction, $adminUser) {
            // Lock transaction row to prevent double processing
            $lockedTx = Transaction::where('id', $transaction->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedTx->status !== TransactionStatus::PENDING) {
                throw new HttpException(422, 'Transaction has already been processed.');
            }

            // Lock user row
            $user = User::where('id', $lockedTx->user_id)
                ->lockForUpdate()
                ->firstOrFail();

            $currentBalance = number_format((float) $user->balance, 2, '.', '');
            $amountStr = number_format((float) $lockedTx->amount, 2, '.', '');

            if ($lockedTx->isDeposit()) {
                $user->balance = bcadd($currentBalance, $amountStr, 2);
            } elseif ($lockedTx->isWithdrawal()) {
                if (bccomp($currentBalance, $amountStr, 2) < 0) {
                    throw new HttpException(422, 'Insufficient user balance to approve withdrawal.');
                }
                $user->balance = bcsub($currentBalance, $amountStr, 2);
            }

            $user->save();

            $lockedTx->status = TransactionStatus::COMPLETED;
            $lockedTx->save();

            $formattedAmount = number_format((float) $lockedTx->amount, 2);
            $typeName = $lockedTx->type->value;

            ActivityLog::create([
                'user_id' => $adminUser->id,
                'action' => "admin_approved_{$typeName}",
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'details' => [
                    'message' => "Admin approved {$typeName} #{$lockedTx->id} for \${$formattedAmount}",
                    'transaction_id' => $lockedTx->id,
                    'client_id' => $user->id,
                    'amount' => $lockedTx->amount,
                    'type' => $typeName,
                ],
            ]);

            return $lockedTx;
        });
    }

    /**
     * Atomically reject a transaction using lockForUpdate() on transaction and user rows.
     */
    public function reject(
        Transaction $transaction,
        User $adminUser,
        ?string $reason = null
    ): Transaction {
        return DB::transaction(function () use ($transaction, $adminUser, $reason) {
            // Lock transaction row to prevent double processing
            $lockedTx = Transaction::where('id', $transaction->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedTx->status !== TransactionStatus::PENDING) {
                throw new HttpException(422, 'Transaction has already been processed.');
            }

            // Lock user row
            User::where('id', $lockedTx->user_id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedTx->status = TransactionStatus::CANCELLED;
            if ($reason !== null) {
                $meta = $lockedTx->metadata ?? [];
                $meta['rejection_reason'] = $reason;
                $lockedTx->metadata = $meta;
            }
            $lockedTx->save();

            $formattedAmount = number_format((float) $lockedTx->amount, 2);
            $typeName = $lockedTx->type->value;
            $msg = "Admin rejected {$typeName} #{$lockedTx->id} for \${$formattedAmount}";
            if ($reason !== null) {
                $msg .= ". Reason: {$reason}";
            }

            ActivityLog::create([
                'user_id' => $adminUser->id,
                'action' => "admin_rejected_{$typeName}",
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'details' => [
                    'message' => $msg,
                    'transaction_id' => $lockedTx->id,
                    'client_id' => $lockedTx->user_id,
                    'amount' => $lockedTx->amount,
                    'type' => $typeName,
                    'reason' => $reason,
                ],
            ]);

            return $lockedTx;
        });
    }
}

