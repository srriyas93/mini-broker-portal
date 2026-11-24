<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthLockoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_locks_account_for_15_minutes_after_5_failed_login_attempts_and_returns_wait_time(): void
    {
        $user = User::create([
            'name' => 'Lockout Candidate',
            'email' => 'lockout@test.com',
            'password' => Hash::make('CorrectPassword123'),
            'role' => UserRole::CLIENT,
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ]);

        // Attempts 1 through 4: Should return 401 with generic error, incrementing failure counter
        for ($i = 1; $i <= 4; $i++) {
            $response = $this->postJson('/api/login', [
                'email' => 'lockout@test.com',
                'password' => 'WrongPassword',
            ]);

            $response->assertStatus(401)
                ->assertJson(['message' => 'Email or password is incorrect.']);

            $user->refresh();
            $this->assertSame($i, $user->failed_login_attempts);
            $this->assertNull($user->locked_until);
        }

        // 5th Attempt: Triggers the 15-minute account lock
        $response5 = $this->postJson('/api/login', [
            'email' => 'lockout@test.com',
            'password' => 'WrongPassword',
        ]);

        $response5->assertStatus(401)
            ->assertJson(['message' => 'Email or password is incorrect.']);

        $user->refresh();
        $this->assertSame(5, $user->failed_login_attempts);
        $this->assertNotNull($user->locked_until);
        $this->assertTrue($user->isLocked());

        // 6th Attempt: Locked account returns HTTP 429 with remaining wait minutes (ceil to whole minutes)
        $response6 = $this->postJson('/api/login', [
            'email' => 'lockout@test.com',
            'password' => 'CorrectPassword123',
        ]);

        $response6->assertStatus(429)
            ->assertJsonStructure(['message', 'remaining_minutes']);

        $remainingMinutes = $response6->json('remaining_minutes');
        $this->assertIsInt($remainingMinutes);
        $this->assertGreaterThanOrEqual(1, $remainingMinutes);
        $this->assertLessThanOrEqual(15, $remainingMinutes);
        $this->assertStringContainsString('Account is locked', $response6->json('message'));
    }

    public function test_successful_login_resets_failed_attempts_and_clears_lockout(): void
    {
        $user = User::create([
            'name' => 'Recovery User',
            'email' => 'recovery@test.com',
            'password' => Hash::make('ValidPassword123'),
            'role' => UserRole::CLIENT,
            'failed_login_attempts' => 3,
            'locked_until' => null,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'recovery@test.com',
            'password' => 'ValidPassword123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'user']);

        $user->refresh();
        $this->assertSame(0, $user->failed_login_attempts);
        $this->assertNull($user->locked_until);
    }
}

