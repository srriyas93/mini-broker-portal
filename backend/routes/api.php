<?php

use App\Http\Controllers\AdminClientController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\KycController;
use App\Http\Controllers\TransactionController;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Authentication Routes
|--------------------------------------------------------------------------
*/
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

/*
|--------------------------------------------------------------------------
| Authenticated User Routes (Sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    // Auth & Profile
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/user', [AuthController::class, 'me']);

    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });

    // KYC Module (Client)
    Route::prefix('kyc')->group(function () {
        Route::post('/upload', [KycController::class, 'upload']);
        Route::get('/status', [KycController::class, 'status']);
    });

    // Secure KYC Document Streaming
    Route::get('/kyc-documents/{submission}/{type}', [KycController::class, 'streamDocument']);

    // Transactions (Client)
    Route::prefix('transactions')->group(function () {
        Route::get('/', [TransactionController::class, 'index']);
        Route::post('/', [TransactionController::class, 'store']);
    });

    /*
    |--------------------------------------------------------------------------
    | Protected Admin Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', function () {
            return response()->json([
                'message' => 'Admin dashboard authorized.',
                'status' => 'success',
            ]);
        });

        Route::get('/users', function () {
            return response()->json([
                'users' => UserResource::collection(\App\Models\User::all()),
            ]);
        });

        // Clients Management
        Route::get('/clients', [AdminClientController::class, 'index']);
        Route::get('/clients/{client}', [AdminClientController::class, 'show']);

        // KYC Management
        Route::post('/kyc/{submission}/review', [AdminClientController::class, 'reviewKyc']);
        Route::post('/kyc/{submission}/approve', [AdminClientController::class, 'approveKyc']);
        Route::post('/kyc/{submission}/reject', [AdminClientController::class, 'rejectKyc']);

        // Transaction Management
        Route::get('/transactions', [AdminClientController::class, 'transactions']);
        Route::post('/transactions/{transaction}/approve', [AdminClientController::class, 'approveTransaction']);
        Route::post('/transactions/{transaction}/reject', [AdminClientController::class, 'rejectTransaction']);

        // Audit Trail
        Route::get('/activity-logs', [AdminClientController::class, 'activityLogs']);
    });
});
