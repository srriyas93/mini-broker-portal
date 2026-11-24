<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\KycStatus;
use App\Enums\UserRole;
use App\Models\KycSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class WithdrawalValidationTest extends TestCase
{
    use RefreshDatabase;

    private User $client;
    private string $clientToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->client = User::create([
            'name' => 'Trading Client',
            'email' => 'client@trading.com',
            'password' => Hash::make('Password123'),
            'role' => UserRole::CLIENT,
            'balance' => 500.00,
        ]);
        $this->clientToken = $this->client->createToken('client_token')->plainTextToken;
    }

    public function test_client_cannot_request_withdrawal_when_kyc_is_unapproved(): void
    {
        // Case 1: No KYC submission exists
        $response1 = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/transactions', [
                'type' => 'withdrawal',
                'amount' => 100.00,
            ]);

        $response1->assertStatus(422)
            ->assertJsonFragment(['message' => 'Withdrawals require an approved KYC verification.']);

        // Case 2: KYC is pending review
        $kyc = KycSubmission::create([
            'user_id' => $this->client->id,
            'document_type' => 'passport',
            'status' => KycStatus::PENDING,
        ]);

        $response2 = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/transactions', [
                'type' => 'withdrawal',
                'amount' => 100.00,
            ]);

        $response2->assertStatus(422)
            ->assertJsonFragment(['message' => 'Withdrawals require an approved KYC verification.']);

        // Case 3: KYC is rejected
        $kyc->update([
            'status' => KycStatus::REJECTED,
            'rejection_reason' => 'Blurry photo',
        ]);

        $response3 = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/transactions', [
                'type' => 'withdrawal',
                'amount' => 100.00,
            ]);

        $response3->assertStatus(422)
            ->assertJsonFragment(['message' => 'Withdrawals require an approved KYC verification.']);
    }

    public function test_client_cannot_request_withdrawal_when_amount_exceeds_balance(): void
    {
        // Approve client KYC
        KycSubmission::create([
            'user_id' => $this->client->id,
            'document_type' => 'passport',
            'status' => KycStatus::APPROVED,
        ]);

        // Client has $500.00 balance; attempt withdrawal of $500.01
        $response = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/transactions', [
                'type' => 'withdrawal',
                'amount' => 500.01,
            ]);

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'Insufficient funds for withdrawal request.']);
    }

    public function test_client_can_request_withdrawal_when_kyc_approved_and_sufficient_balance(): void
    {
        KycSubmission::create([
            'user_id' => $this->client->id,
            'document_type' => 'passport',
            'status' => KycStatus::APPROVED,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/transactions', [
                'type' => 'withdrawal',
                'amount' => 250.00,
                'note' => 'Wire transfer request',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('transaction.status', 'pending')
            ->assertJsonPath('transaction.type', 'withdrawal');

        $this->assertDatabaseHas('transactions', [
            'user_id' => $this->client->id,
            'type' => 'withdrawal',
            'amount' => 250.00,
            'status' => 'pending',
        ]);
    }
}

