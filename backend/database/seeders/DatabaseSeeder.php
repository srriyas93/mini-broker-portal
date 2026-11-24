<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\KycSubmission;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Admin User
        $admin = User::firstOrCreate(
            ['email' => 'admin@test.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('Admin@123'),
                'role' => 'admin',
                'phone' => '+1234567890',
                'balance' => 10000.00,
                'failed_login_attempts' => 0,
                'locked_until' => null,
                'email_verified_at' => now(),
            ]
        );

        // 2. Create Client User
        $client = User::firstOrCreate(
            ['email' => 'client@test.com'],
            [
                'name' => 'Client User',
                'password' => Hash::make('Client@123'),
                'role' => 'client',
                'phone' => '+1987654321',
                'balance' => 5000.00,
                'failed_login_attempts' => 0,
                'locked_until' => null,
                'email_verified_at' => now(),
            ]
        );

        // 3. Seed sample KYC Submission for client
        KycSubmission::create([
            'user_id' => $client->id,
            'document_type' => 'passport',
            'document_number' => 'PASS987654321',
            'document_front_path' => 'kyc/sample_passport_front.jpg',
            'document_back_path' => null,
            'status' => 'approved',
            'rejection_reason' => null,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);

        // 4. Seed sample Transactions for client
        Transaction::create([
            'user_id' => $client->id,
            'type' => 'deposit',
            'amount' => 5000.00,
            'fee' => 0.00,
            'status' => 'completed',
            'reference_id' => 'TXN-' . strtoupper(Str::random(10)),
            'description' => 'Initial Account Deposit via Wire Transfer',
            'metadata' => [
                'payment_method' => 'bank_transfer',
                'bank_name' => 'Global Forex Bank',
            ],
        ]);

        // 5. Seed sample Activity Logs
        ActivityLog::create([
            'user_id' => $admin->id,
            'action' => 'admin_seeded',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Seeder Script',
            'details' => ['message' => 'Admin account initialized'],
        ]);

        ActivityLog::create([
            'user_id' => $client->id,
            'action' => 'account_created',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Seeder Script',
            'details' => ['message' => 'Client account initialized with initial deposit'],
        ]);
    }
}
