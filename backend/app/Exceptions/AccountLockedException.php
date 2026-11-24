<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AccountLockedException extends HttpException
{
    public function __construct(
        public readonly int $remainingMinutes,
        string $message = '',
        ?\Throwable $previous = null,
        int $code = 0
    ) {
        $message = $message ?: "Account is locked. Please try again in {$remainingMinutes} minute(s).";
        parent::__construct(429, $message, $previous, [], $code);
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'remaining_minutes' => $this->remainingMinutes,
        ], 429);
    }
}

