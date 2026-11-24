<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RoleAccessTest extends TestCase
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
            'name' => 'Client Trader',
            'email' => 'client@broker.com',
            'password' => Hash::make('Client123'),
            'role' => UserRole::CLIENT,
        ]);
        $this->clientToken = $this->client->createToken('client_token')->plainTextToken;

        $this->admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@broker.com',
            'password' => Hash::make('Admin123'),
            'role' => UserRole::ADMIN,
        ]);
        $this->adminToken = $this->admin->createToken('admin_token')->plainTextToken;
    }

    public function test_client_receives_403_when_accessing_admin_api_endpoints(): void
    {
        $adminEndpoints = [
            ['method' => 'getJson', 'url' => '/api/admin/dashboard'],
            ['method' => 'getJson', 'url' => '/api/admin/clients'],
            ['method' => 'getJson', 'url' => '/api/admin/transactions'],
            ['method' => 'getJson', 'url' => '/api/admin/activity-logs'],
        ];

        foreach ($adminEndpoints as $endpoint) {
            $method = $endpoint['method'];
            $response = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
                ->$method($endpoint['url']);

            $response->assertStatus(403)
                ->assertJson([
                    'message' => 'Forbidden. Admin access required.',
                ]);
        }
    }

    public function test_admin_receives_200_when_accessing_admin_api_endpoints(): void
    {
        $responseDashboard = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/admin/dashboard');
        $responseDashboard->assertStatus(200);

        $responseClients = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/admin/clients');
        $responseClients->assertStatus(200);

        $responseLogs = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/admin/activity-logs');
        $responseLogs->assertStatus(200);
    }
}

