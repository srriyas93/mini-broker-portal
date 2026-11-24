<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Enums\UserRole;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TransactionApprovalTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $client;
    private string $adminToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'Broker Compliance Admin',
            'email' => 'admin@portal.com',
            'password' => Hash::make('Admin123'),
            'role' => UserRole::ADMIN,
        ]);
        $this->adminToken = $this->admin->createToken('admin_token')->plainTextToken;

        $this->client = User::create([
            'name' => 'Client User',
            'email' => 'client@portal.com',
            'password' => Hash::make('Client123'),
            'role' => UserRole::CLIENT,
            'balance' => 200.00,
        ]);
    }

    public function test_approving_deposit_updates_balance_once_and_second_approval_returns_422_without_changing_balance_twice(): void
    {
        $deposit = Transaction::create([
            'user_id' => $this->client->id,
            'type' => TransactionType::DEPOSIT,
            'amount' => 150.00,
            'status' => TransactionStatus::PENDING,
        ]);

        // First approval: Balance 200.00 + 150.00 = 350.00
        $res1 = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson("/api/admin/transactions/{$deposit->id}/approve");

        $res1->assertStatus(200);

        $this->client->refresh();
        $deposit->refresh();

        $this->assertSame('350.00', (string) $this->client->balance);
        $this->assertSame(TransactionStatus::COMPLETED, $deposit->status);

        // Second approval attempt: Must return 422
        $res2 = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson("/api/admin/transactions/{$deposit->id}/approve");

        $res2->assertStatus(422)
            ->assertJsonFragment(['message' => 'Transaction has already been processed.']);

        // Assert balance was NOT incremented again
        $this->client->refresh();
        $this->assertSame('350.00', (string) $this->client->balance);
    }

    public function test_approving_withdrawal_updates_balance_once_and_second_approval_returns_422_without_changing_balance_twice(): void
    {
        $withdrawal = Transaction::create([
            'user_id' => $this->client->id,
            'type' => TransactionType::WITHDRAWAL,
            'amount' => 50.00,
            'status' => TransactionStatus::PENDING,
        ]);

        // First approval: Balance 200.00 - 50.00 = 150.00
        $res1 = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson("/api/admin/transactions/{$withdrawal->id}/approve");

        $res1->assertStatus(200);

        $this->client->refresh();
        $withdrawal->refresh();

        $this->assertSame('150.00', (string) $this->client->balance);
        $this->assertSame(TransactionStatus::COMPLETED, $withdrawal->status);

        // Second approval attempt: Must return 422
        $res2 = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson("/api/admin/transactions/{$withdrawal->id}/approve");

        $res2->assertStatus(422)
            ->assertJsonFragment(['message' => 'Transaction has already been processed.']);

        // Assert balance was NOT deducted again
        $this->client->refresh();
        $this->assertSame('150.00', (string) $this->client->balance);
    }
}

