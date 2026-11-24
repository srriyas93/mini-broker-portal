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

class KycTest extends TestCase
{
    use RefreshDatabase;

    private User $client;
    private User $admin;
    private string $clientToken;
    private string $adminToken;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->client = User::create([
            'name' => 'John Client',
            'email' => 'client@test.com',
            'password' => Hash::make('Client123'),
            'role' => UserRole::CLIENT,
            'balance' => 1000.00,
        ]);
        $this->clientToken = $this->client->createToken('client_token')->plainTextToken;

        $this->admin = User::create([
            'name' => 'Admin Boss',
            'email' => 'admin@test.com',
            'password' => Hash::make('Admin123'),
            'role' => UserRole::ADMIN,
        ]);
        $this->adminToken = $this->admin->createToken('admin_token')->plainTextToken;
    }

    public function test_validates_required_files_and_types_and_max_size(): void
    {
        // Missing files
        $response = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/kyc/upload', []);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['id_document', 'address_document']);

        // Invalid mimes
        $fakeTxt = UploadedFile::fake()->create('doc.txt', 100, 'text/plain');
        $response2 = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/kyc/upload', [
                'id_document' => $fakeTxt,
                'address_document' => $fakeTxt,
            ]);
        $response2->assertStatus(422)
            ->assertJsonValidationErrors(['id_document', 'address_document']);

        // Exceeding 5120KB
        $largePdf = UploadedFile::fake()->create('large.pdf', 6000, 'application/pdf');
        $response3 = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/kyc/upload', [
                'id_document' => $largePdf,
                'address_document' => $largePdf,
            ]);
        $response3->assertStatus(422)
            ->assertJsonValidationErrors(['id_document', 'address_document']);
    }

    public function test_stores_files_on_private_local_disk_and_does_not_expose_raw_paths(): void
    {
        $idFile = UploadedFile::fake()->image('id_passport.jpg');
        $addressFile = UploadedFile::fake()->create('utility_bill.pdf', 500, 'application/pdf');

        $response = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/kyc/upload', [
                'id_document' => $idFile,
                'address_document' => $addressFile,
                'document_type' => 'passport',
                'document_number' => 'AB123456',
            ]);

        $response->assertStatus(201);
        $data = $response->json('submission');

        $this->assertSame('pending', $data['status']);
        $this->assertSame('passport', $data['document_type']);
        $this->assertSame('AB123456', $data['document_number']);

        // Verify never exposing raw storage paths
        $this->assertStringNotContainsString('kyc_documents/', $data['document_front_path']);
        $this->assertStringNotContainsString('kyc_documents/', $data['document_back_path']);
        $this->assertStringContainsString('/api/kyc-documents/', $data['id_document_url']);
        $this->assertStringContainsString('/api/kyc-documents/', $data['address_document_url']);

        // Verify files stored on private local disk
        $submission = KycSubmission::latest('id')->first();
        $this->assertNotNull($submission);
        $this->assertStringStartsWith('kyc_documents/', $submission->document_front_path);
        $this->assertStringStartsWith('kyc_documents/', $submission->document_back_path);
        Storage::disk('local')->assertExists($submission->document_front_path);
        Storage::disk('local')->assertExists($submission->document_back_path);
    }

    public function test_allows_reupload_only_if_no_submission_exists_or_latest_is_rejected(): void
    {
        $idFile = UploadedFile::fake()->image('id.jpg');
        $addressFile = UploadedFile::fake()->create('address.pdf', 200, 'application/pdf');

        // First upload succeeds (status = pending)
        $res1 = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/kyc/upload', [
                'id_document' => $idFile,
                'address_document' => $addressFile,
            ]);
        $res1->assertStatus(201);

        // Immediate re-upload while pending must be rejected with 422
        $res2 = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/kyc/upload', [
                'id_document' => $idFile,
                'address_document' => $addressFile,
            ]);
        $res2->assertStatus(422);

        // Admin rejects previous submission
        $submission = KycSubmission::latest('id')->first();
        $submission->update([
            'status' => KycStatus::REJECTED,
            'rejection_reason' => 'Blurry document image.',
        ]);

        // Re-upload after rejection succeeds
        $res3 = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/kyc/upload', [
                'id_document' => $idFile,
                'address_document' => $addressFile,
            ]);
        $res3->assertStatus(201);
    }

    public function test_stream_document_checks_authorization_and_streams_file(): void
    {
        $idFile = UploadedFile::fake()->image('passport.png');
        $addressFile = UploadedFile::fake()->create('bill.pdf', 150, 'application/pdf');

        $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->postJson('/api/kyc/upload', [
                'id_document' => $idFile,
                'address_document' => $addressFile,
            ]);

        $submission = KycSubmission::latest('id')->first();

        // 1. Other client trying to view => 403 Forbidden
        $otherClient = User::create([
            'name' => 'Stranger',
            'email' => 'stranger@test.com',
            'password' => Hash::make('Pass1234'),
            'role' => UserRole::CLIENT,
        ]);
        $otherToken = $otherClient->createToken('stranger_token')->plainTextToken;

        $this->app['auth']->forgetGuards();
        $unauthRes = $this->withHeader('Authorization', "Bearer {$otherToken}")
            ->getJson("/api/kyc-documents/{$submission->id}/id");
        $unauthRes->assertStatus(403);

        // 2. Owner client accessing id document => 200 Stream
        $this->app['auth']->forgetGuards();
        $ownerRes = $this->withHeader('Authorization', "Bearer {$this->clientToken}")
            ->get("/api/kyc-documents/{$submission->id}/id");
        $ownerRes->assertStatus(200);

        // 3. Admin accessing address document => 200 Stream
        $this->app['auth']->forgetGuards();
        $adminRes = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->get("/api/kyc-documents/{$submission->id}/address");
        $adminRes->assertStatus(200);

        // 4. Invalid document type => 404
        $this->app['auth']->forgetGuards();
        $invalidTypeRes = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson("/api/kyc-documents/{$submission->id}/invalid");
        $invalidTypeRes->assertStatus(404);
    }
}
