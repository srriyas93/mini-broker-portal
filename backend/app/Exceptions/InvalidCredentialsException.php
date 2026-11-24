<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class InvalidCredentialsException extends HttpException
{
    public function __construct(
        string $message = 'Email or password is incorrect.',
        ?\Throwable $previous = null,
        int $code = 0
    ) {
        parent::__construct(401, $message, $previous, [], $code);
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'Email or password is incorrect.',
        ], 401);
    }
}

