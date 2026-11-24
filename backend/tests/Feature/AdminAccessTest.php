<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_cannot_access_admin_routes(): void
    {
        $client = User::create([
            'name' => 'Client User',
            'email' => 'client@test.com',
            'password' => Hash::make('Client123'),
            'role' => UserRole::CLIENT,
        ]);

        $token = $client->createToken('client_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/dashboard');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Forbidden. Admin access required.',
            ]);
    }

    public function test_admin_can_access_admin_routes(): void
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@test.com',
            'password' => Hash::make('Admin123'),
            'role' => UserRole::ADMIN,
        ]);

        $token = $admin->createToken('admin_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/dashboard');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);
    }

    public function test_unauthenticated_request_to_admin_route_is_rejected(): void
    {
        $response = $this->getJson('/api/admin/dashboard');

        $this->assertTrue(in_array($response->status(), [401, 403], true));
    }
}

