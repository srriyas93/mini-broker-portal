<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\KycStatus;
use App\Enums\UserRole;
use App\Models\KycSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class KycDocumentPrivacyTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;
    private User $stranger;
    private User $admin;
    private string $ownerToken;
    private string $strangerToken;
    private string $adminToken;
    private KycSubmission $submission;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        // 1. Create Owner Client & Upload Documents
        $this->owner = User::create([
            'name' => 'Document Owner',
            'email' => 'owner@test.com',
            'password' => Hash::make('Password123'),
            'role' => UserRole::CLIENT,
        ]);
        $this->ownerToken = $this->owner->createToken('owner_token')->plainTextToken;

        $idFile = UploadedFile::fake()->image('owner_passport.jpg');
        $addressFile = UploadedFile::fake()->create('owner_utility.pdf', 300, 'application/pdf');

        $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
            ->postJson('/api/kyc/upload', [
                'id_document' => $idFile,
                'address_document' => $addressFile,
                'document_type' => 'passport',
            ]);

        $this->submission = KycSubmission::latest('id')->firstOrFail();

        // 2. Create Stranger Client
        $this->stranger = User::create([
            'name' => 'Stranger Client',
            'email' => 'stranger@test.com',
            'password' => Hash::make('Password123'),
            'role' => UserRole::CLIENT,
        ]);
        $this->strangerToken = $this->stranger->createToken('stranger_token')->plainTextToken;

        // 3. Create Admin
        $this->admin = User::create([
            'name' => 'Compliance Admin',
            'email' => 'admin@test.com',
            'password' => Hash::make('Password123'),
            'role' => UserRole::ADMIN,
        ]);
        $this->adminToken = $this->admin->createToken('admin_token')->plainTextToken;
    }

    public function test_client_cannot_download_another_clients_private_kyc_file(): void
    {
        $this->app['auth']->forgetGuards();

        // Stranger attempting to access owner's ID document => 403 Forbidden
        $resId = $this->withHeader('Authorization', "Bearer {$this->strangerToken}")
            ->getJson("/api/kyc-documents/{$this->submission->id}/id");

        $resId->assertStatus(403)
            ->assertJson([
                'message' => 'Forbidden. You do not have permission to view this document.',
            ]);

        $this->app['auth']->forgetGuards();

        // Stranger attempting to access owner's Address document => 403 Forbidden
        $resAddress = $this->withHeader('Authorization', "Bearer {$this->strangerToken}")
            ->getJson("/api/kyc-documents/{$this->submission->id}/address");

        $resAddress->assertStatus(403)
            ->assertJson([
                'message' => 'Forbidden. You do not have permission to view this document.',
            ]);
    }

    public function test_owner_and_admin_succeed_streaming_kyc_file(): void
    {
        $this->app['auth']->forgetGuards();

        // Owner streaming own ID document => 200 Stream
        $ownerRes = $this->withHeader('Authorization', "Bearer {$this->ownerToken}")
            ->get("/api/kyc-documents/{$this->submission->id}/id");

        $ownerRes->assertStatus(200);

        $this->app['auth']->forgetGuards();

        // Admin streaming client's ID document => 200 Stream
        $adminResId = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->get("/api/kyc-documents/{$this->submission->id}/id");

        $adminResId->assertStatus(200);

        $this->app['auth']->forgetGuards();

        // Admin streaming client's Address document => 200 Stream
        $adminResAddr = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->get("/api/kyc-documents/{$this->submission->id}/address");

        $adminResAddr->assertStatus(200);
    }
}

