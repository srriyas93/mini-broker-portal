<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('description') && !$this->has('note')) {
            $this->merge(['note' => $this->input('description')]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'in:deposit,withdrawal'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'type.required' => 'Transaction type is required.',
            'type.in' => 'Transaction type must be either deposit or withdrawal.',
            'amount.required' => 'Amount is required.',
            'amount.gt' => 'Amount must be greater than 0.',
        ];
    }
}

