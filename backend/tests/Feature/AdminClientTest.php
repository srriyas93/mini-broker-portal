<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\KycStatus;
use App\Enums\UserRole;
use App\Models\ActivityLog;
use App\Models\KycSubmission;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminClientTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private string $adminToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'System Administrator',
            'email' => 'admin@system.com',
            'password' => Hash::make('AdminPass123'),
            'role' => UserRole::ADMIN,
        ]);
        $this->adminToken = $this->admin->createToken('admin_token')->plainTextToken;
    }

    public function test_admin_can_list_paginated_clients_with_search_and_kyc_filter(): void
    {
        $client1 = User::create([
            'name' => 'Alice Walker',
            'email' => 'alice@test.com',
            'password' => Hash::make('Secret123'),
            'role' => UserRole::CLIENT,
        ]);
        KycSubmission::create([
            'user_id' => $client1->id,
            'document_type' => 'passport',
            'status' => KycStatus::APPROVED,
        ]);

        $client2 = User::create([
            'name' => 'Bob Builder',
            'email' => 'bob@test.com',
            'password' => Hash::make('Secret123'),
            'role' => UserRole::CLIENT,
        ]);
        KycSubmission::create([
            'user_id' => $client2->id,
            'document_type' => 'id_card',
            'status' => KycStatus::PENDING,
        ]);

        // 1. List all clients
        $res = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/admin/clients');
        $res->assertStatus(200)
            ->assertJsonPath('meta.total', 2);

        // 2. Search by name 'Alice'
        $searchRes = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/admin/clients?search=Alice');
        $searchRes->assertStatus(200)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Alice Walker');

        // 3. Filter by kyc_status 'pending'
        $kycRes = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/admin/clients?kyc_status=pending');
        $kycRes->assertStatus(200)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Bob Builder');
    }

    public function test_admin_can_view_client_details_with_profile_balance_kyc_and_transactions(): void
    {
        $client = User::create([
            'name' => 'Charlie Day',
            'email' => 'charlie@test.com',
            'password' => Hash::make('Secret123'),
            'role' => UserRole::CLIENT,
            'balance' => 4500.00,
        ]);

        $kyc = KycSubmission::create([
            'user_id' => $client->id,
            'document_type' => 'passport',
            'status' => KycStatus::PENDING,
        ]);

        $tx = Transaction::create([
            'user_id' => $client->id,
            'type' => 'deposit',
            'amount' => 1000.00,
            'status' => 'completed',
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson("/api/admin/clients/{$client->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'profile' => ['id', 'name', 'email', 'role'],
                'balance',
                'latest_kyc' => ['id', 'status', 'document_type'],
                'transactions' => [
                    '*' => ['id', 'type', 'amount', 'status'],
                ],
            ]);

        $this->assertSame('4500.00', (string) $response->json('balance'));
        $this->assertSame($kyc->id, $response->json('latest_kyc.id'));
        $this->assertCount(1, $response->json('transactions'));
    }

    public function test_admin_can_approve_and_reject_kyc_with_activity_log(): void
    {
        $client = User::create([
            'name' => 'Dave Miller',
            'email' => 'dave@test.com',
            'password' => Hash::make('Secret123'),
            'role' => UserRole::CLIENT,
        ]);

        $kyc = KycSubmission::create([
            'user_id' => $client->id,
            'document_type' => 'passport',
            'status' => KycStatus::PENDING,
        ]);

        // 1. Rejection requires reason
        $rejectNoReason = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson("/api/admin/kyc/{$kyc->id}/review", [
                'status' => 'rejected',
            ]);
        $rejectNoReason->assertStatus(422)
            ->assertJsonValidationErrors(['rejection_reason']);

        // 2. Reject with reason
        $rejectRes = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson("/api/admin/kyc/{$kyc->id}/review", [
                'status' => 'rejected',
                'rejection_reason' => 'Document expired on 2024.',
            ]);
        $rejectRes->assertStatus(200);

        $kyc->refresh();
        $this->assertSame(KycStatus::REJECTED, $kyc->status);
        $this->assertSame('Document expired on 2024.', $kyc->rejection_reason);

        // Verify rejection ActivityLog
        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $this->admin->id,
            'action' => 'admin_rejected_kyc',
        ]);

        // 3. Approve KYC
        $approveRes = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson("/api/admin/kyc/{$kyc->id}/approve");
        $approveRes->assertStatus(200);

        $kyc->refresh();
        $this->assertSame(KycStatus::APPROVED, $kyc->status);
        $this->assertNull($kyc->rejection_reason);

        // Verify approval ActivityLog
        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $this->admin->id,
            'action' => 'admin_approved_kyc',
        ]);
    }

    public function test_admin_can_view_activity_logs(): void
    {
        ActivityLog::create([
            'user_id' => $this->admin->id,
            'action' => 'admin_approved_deposit',
            'details' => ['message' => 'Admin approved deposit #1 for $500.00'],
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/admin/activity-logs');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'action', 'details', 'created_at'],
                ],
                'meta' => ['current_page', 'total'],
            ]);
    }
}

