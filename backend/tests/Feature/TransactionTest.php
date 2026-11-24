<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\KycStatus;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Enums\UserRole;
use App\Models\ActivityLog;
use App\Models\KycSubmission;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TransactionTest extends TestCase
{
    use RefreshDatabase;

    private User $client;
    private User $admin;
    private string $clientToken;
    private string $adminToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client = User::create([
            'name' => 'Trader Joe',
            'email' => 'trader@test.com',
            'password' => Hash::make('Trader123'),
            'role' => UserRole::CLIENT,
            'balance' => 500.00,
        ]);
        $this->clientToken = $this->client->createToken('trader_token')->plainTextToken;

        $this->admin = User::create([
            'name' => 'Broker Admin',
            'email' => 'admin@test.com',
            'password' => Hash::make('Admin123'),
            'role' => UserRole::ADMIN,
            'balance' => 50000.00,
        ]);
        $this->adminToken = $this->admin->createToken('admin_token')->plainTextToken;
    }

    public function test_client_can_create_deposit_request(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/transactions', [
                'type' => 'deposit',
                'amount' => 250.00,
                'note' => 'Deposit via Bank Wire',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'transaction' => [
                    'id',
                    'user_id',
                    'type',
                    'amount',
                    'status',
                    'reference_id',
                ],
            ]);

        $this->assertDatabaseHas('transactions', [
            'user_id' => $this->client->id,
            'type' => 'deposit',
            'amount' => 250.00,
            'status' => 'pending',
        ]);
    }

    public function test_withdrawal_rejected_if_client_kyc_is_not_approved(): void
    {
        // No KYC submission exists
        $response = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/transactions', [
                'type' => 'withdrawal',
                'amount' => 100.00,
            ]);

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'Withdrawals require an approved KYC verification.']);

        // Pending KYC submission exists
        KycSubmission::create([
            'user_id' => $this->client->id,
            'document_type' => 'passport',
            'status' => KycStatus::PENDING,
        ]);

        $response2 = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/transactions', [
                'type' => 'withdrawal',
                'amount' => 100.00,
            ]);
        $response2->assertStatus(422);
    }

    public function test_withdrawal_rejected_if_balance_is_insufficient(): void
    {
        // Approve client KYC
        KycSubmission::create([
            'user_id' => $this->client->id,
            'document_type' => 'passport',
            'status' => KycStatus::APPROVED,
        ]);

        // Client has $500.00 balance, attempts to withdraw $600.00
        $response = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/transactions', [
                'type' => 'withdrawal',
                'amount' => 600.00,
            ]);

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'Insufficient funds for withdrawal request.']);
    }

    public function test_withdrawal_succeeds_when_kyc_approved_and_balance_sufficient(): void
    {
        KycSubmission::create([
            'user_id' => $this->client->id,
            'document_type' => 'passport',
            'status' => KycStatus::APPROVED,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/transactions', [
                'type' => 'withdrawal',
                'amount' => 200.00,
                'note' => 'Withdrawal to PayPal',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('transactions', [
            'user_id' => $this->client->id,
            'type' => 'withdrawal',
            'amount' => 200.00,
            'status' => 'pending',
        ]);
    }

    public function test_admin_approves_deposit_atomically_using_bcadd(): void
    {
        $deposit = Transaction::create([
            'user_id' => $this->client->id,
            'type' => TransactionType::DEPOSIT,
            'amount' => 300.50,
            'status' => TransactionStatus::PENDING,
        ]);

        $initialBalance = $this->client->balance; // 500.00

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson("/api/admin/transactions/{$deposit->id}/approve");

        $response->assertStatus(200);

        $this->client->refresh();
        $deposit->refresh();

        // 500.00 + 300.50 = 800.50
        $this->assertSame('800.50', (string) $this->client->balance);
        $this->assertSame(TransactionStatus::COMPLETED, $deposit->status);

        // Verify ActivityLog entry
        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $this->admin->id,
            'action' => 'admin_approved_deposit',
        ]);

        $log = ActivityLog::latest('id')->first();
        $this->assertStringContainsString('Admin approved deposit', $log->details['message']);
        $this->assertStringContainsString('300.50', $log->details['message']);
    }

    public function test_admin_approves_withdrawal_atomically_using_bcsub(): void
    {
        $withdrawal = Transaction::create([
            'user_id' => $this->client->id,
            'type' => TransactionType::WITHDRAWAL,
            'amount' => 200.00,
            'status' => TransactionStatus::PENDING,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson("/api/admin/transactions/{$withdrawal->id}/approve");

        $response->assertStatus(200);

        $this->client->refresh();
        $withdrawal->refresh();

        // 500.00 - 200.00 = 300.00
        $this->assertSame('300.00', (string) $this->client->balance);
        $this->assertSame(TransactionStatus::COMPLETED, $withdrawal->status);

        // Verify ActivityLog entry
        $log = ActivityLog::latest('id')->first();
        $this->assertSame("admin_approved_withdrawal", $log->action);
        $this->assertStringContainsString("Admin approved withdrawal #{$withdrawal->id} for $200.00", $log->details['message']);
    }

    public function test_admin_rejects_transaction_and_records_activity_log(): void
    {
        $deposit = Transaction::create([
            'user_id' => $this->client->id,
            'type' => TransactionType::DEPOSIT,
            'amount' => 150.00,
            'status' => TransactionStatus::PENDING,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson("/api/admin/transactions/{$deposit->id}/reject", [
                'reason' => 'Invalid bank receipt reference.',
            ]);

        $response->assertStatus(200);

        $this->client->refresh();
        $deposit->refresh();

        // Balance unchanged
        $this->assertSame('500.00', (string) $this->client->balance);
        $this->assertSame(TransactionStatus::CANCELLED, $deposit->status);

        $log = ActivityLog::latest('id')->first();
        $this->assertSame("admin_rejected_deposit", $log->action);
        $this->assertStringContainsString("Admin rejected deposit", $log->details['message']);
        $this->assertStringContainsString("Invalid bank receipt reference.", $log->details['message']);
    }

    public function test_transaction_cannot_be_processed_twice(): void
    {
        $deposit = Transaction::create([
            'user_id' => $this->client->id,
            'type' => TransactionType::DEPOSIT,
            'amount' => 100.00,
            'status' => TransactionStatus::PENDING,
        ]);

        // First approval succeeds
        $res1 = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson("/api/admin/transactions/{$deposit->id}/approve");
        $res1->assertStatus(200);

        // Second approval attempt must be rejected with 422
        $res2 = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson("/api/admin/transactions/{$deposit->id}/approve");
        $res2->assertStatus(422)
            ->assertJsonFragment(['message' => 'Transaction has already been processed.']);

        // Attempting to reject an already completed transaction also fails
        $res3 = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson("/api/admin/transactions/{$deposit->id}/reject");
        $res3->assertStatus(422);
    }
}

