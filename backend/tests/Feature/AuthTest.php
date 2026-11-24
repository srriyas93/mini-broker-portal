<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_works_with_user_role_casts(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        $admin = User::where('email', 'admin@test.com')->first();
        $this->assertNotNull($admin);
        $this->assertSame(UserRole::ADMIN, $admin->role);
        $this->assertTrue($admin->isAdmin());

        $client = User::where('email', 'client@test.com')->first();
        $this->assertNotNull($client);
        $this->assertSame(UserRole::CLIENT, $client->role);
        $this->assertTrue($client->isClient());
    }

    public function test_user_can_register_successfully(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'phone' => '+1234567890',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'token',
                'user' => [
                    'id',
                    'name',
                    'email',
                    'role',
                    'phone',
                    'balance',
                    'failed_login_attempts',
                    'locked_until',
                    'created_at',
                    'updated_at',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com',
            'role' => 'client',
        ]);

        $user = User::where('email', 'john@example.com')->first();
        $this->assertInstanceOf(User::class, $user);
        $this->assertSame(UserRole::CLIENT, $user->role);
        $this->assertTrue($user->isClient());
        $this->assertFalse($user->isAdmin());
    }

    public function test_registration_validates_password_complexity(): void
    {
        // Missing numbers
        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'lettersall',
            'password_confirmation' => 'lettersall',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['password']);

        // Missing letters
        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'email' => 'john2@example.com',
            'password' => '12345678',
            'password_confirmation' => '12345678',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['password']);

        // Less than 8 characters
        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'email' => 'john3@example.com',
            'password' => 'Pass1',
            'password_confirmation' => 'Pass1',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    public function test_registration_requires_unique_email_with_clear_message(): void
    {
        User::create([
            'name' => 'Existing User',
            'email' => 'existing@example.com',
            'password' => Hash::make('Secret123'),
            'role' => UserRole::CLIENT,
        ]);

        $response = $this->postJson('/api/register', [
            'name' => 'Another User',
            'email' => 'existing@example.com',
            'password' => 'Secret123',
            'password_confirmation' => 'Secret123',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['email']);
        $this->assertStringContainsString('registered', $response->json('errors.email.0'));
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = User::create([
            'name' => 'Test Client',
            'email' => 'client@example.com',
            'password' => Hash::make('Client123'),
            'role' => UserRole::CLIENT,
            'balance' => 2500.50,
            'failed_login_attempts' => 2,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'client@example.com',
            'password' => 'Client123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'token',
                'user' => [
                    'id',
                    'name',
                    'email',
                    'role',
                    'balance',
                    'failed_login_attempts',
                    'locked_until',
                ],
            ]);

        $user->refresh();
        $this->assertSame(0, $user->failed_login_attempts);
        $this->assertNull($user->locked_until);
    }

    public function test_login_fails_with_invalid_credentials_and_exact_message(): void
    {
        $user = User::create([
            'name' => 'Test Client',
            'email' => 'client@example.com',
            'password' => Hash::make('Client123'),
            'role' => UserRole::CLIENT,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'client@example.com',
            'password' => 'WrongPassword',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Email or password is incorrect.',
            ]);

        $user->refresh();
        $this->assertSame(1, $user->failed_login_attempts);
    }

    public function test_login_fails_for_nonexistent_email_with_exact_message(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'SomePassword123',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Email or password is incorrect.',
            ]);
    }

    public function test_five_failed_login_attempts_locks_account_for_15_minutes(): void
    {
        $user = User::create([
            'name' => 'Lockout User',
            'email' => 'lockout@example.com',
            'password' => Hash::make('Correct123'),
            'role' => UserRole::CLIENT,
            'failed_login_attempts' => 0,
        ]);

        // 1st to 4th attempts
        for ($i = 1; $i <= 4; $i++) {
            $res = $this->postJson('/api/login', [
                'email' => 'lockout@example.com',
                'password' => 'BadPassword',
            ]);
            $res->assertStatus(401)
                ->assertJson(['message' => 'Email or password is incorrect.']);
            $user->refresh();
            $this->assertSame($i, $user->failed_login_attempts);
            $this->assertNull($user->locked_until);
        }

        // 5th attempt triggers lockout
        $res5 = $this->postJson('/api/login', [
            'email' => 'lockout@example.com',
            'password' => 'BadPassword',
        ]);
        $res5->assertStatus(401)
            ->assertJson(['message' => 'Email or password is incorrect.']);

        $user->refresh();
        $this->assertSame(5, $user->failed_login_attempts);
        $this->assertNotNull($user->locked_until);
        $this->assertTrue($user->isLocked());

        // 6th attempt should return HTTP 429 with remaining wait minutes (ceil to whole minutes)
        $res6 = $this->postJson('/api/login', [
            'email' => 'lockout@example.com',
            'password' => 'Correct123',
        ]);
        $res6->assertStatus(429)
            ->assertJsonStructure(['message', 'remaining_minutes']);

        $remainingMinutes = $res6->json('remaining_minutes');
        $this->assertGreaterThanOrEqual(1, $remainingMinutes);
        $this->assertLessThanOrEqual(15, $remainingMinutes);
    }

    public function test_authenticated_user_can_access_me_and_logout(): void
    {
        $user = User::create([
            'name' => 'Auth User',
            'email' => 'auth@example.com',
            'password' => Hash::make('Auth1234'),
            'role' => UserRole::CLIENT,
            'balance' => 1234.56,
        ]);

        $token = $user->createToken('test_token')->plainTextToken;

        // Test /api/me
        $meResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/me');

        $meResponse->assertStatus(200)
            ->assertJson([
                'user' => [
                    'id' => $user->id,
                    'name' => 'Auth User',
                    'email' => 'auth@example.com',
                    'role' => 'client',
                ],
            ]);

        // Test /api/logout
        $logoutResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout');

        $logoutResponse->assertStatus(200)
            ->assertJson(['message' => 'Successfully logged out.']);

        $this->assertCount(0, $user->tokens);
    }
}
