<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\UserRole;
use App\Exceptions\AccountLockedException;
use App\Exceptions\InvalidCredentialsException;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    /**
     * Register a new user.
     *
     * @param array<string, mixed> $data
     * @return array{user: User, token: string}
     */
    public function register(array $data): array
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => UserRole::CLIENT,
            'phone' => $data['phone'] ?? null,
            'balance' => 0.00,
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    /**
     * Authenticate a user and issue a token.
     *
     * @param array<string, mixed> $credentials
     * @return array{user: User, token: string}
     *
     * @throws AccountLockedException
     * @throws InvalidCredentialsException
     */
    public function login(array $credentials): array
    {
        $user = User::where('email', $credentials['email'])->first();

        // 1. If user exists, check lockout status
        if ($user !== null && $user->locked_until !== null) {
            if ($user->locked_until->isFuture()) {
                $remainingSeconds = (int) now()->diffInSeconds($user->locked_until, false);
                $remainingMinutes = (int) max(1, (int) ceil($remainingSeconds / 60));

                throw new AccountLockedException(
                    $remainingMinutes,
                    "Account is locked. Please try again in {$remainingMinutes} minute(s)."
                );
            }

            // Lock has expired; reset lockout fields
            $user->locked_until = null;
            $user->failed_login_attempts = 0;
            $user->save();
        }

        // 2. Validate credentials
        if ($user === null || !Hash::check($credentials['password'], $user->password)) {
            if ($user !== null) {
                $user->failed_login_attempts += 1;

                if ($user->failed_login_attempts >= 5) {
                    $user->locked_until = now()->addMinutes(15);
                }

                $user->save();
            }

            throw new InvalidCredentialsException('Email or password is incorrect.');
        }

        // 3. Successful login: reset attempts and lockout
        $user->failed_login_attempts = 0;
        $user->locked_until = null;
        $user->save();

        $tokenName = !empty($credentials['remember']) ? 'remember_token' : 'auth_token';
        $token = $user->createToken($tokenName)->plainTextToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    /**
     * Log out user by deleting their current access token.
     */
    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();
    }
}

