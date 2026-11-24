<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class KycUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'id_document' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'address_document' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'document_type' => ['sometimes', 'string', 'max:100'],
            'document_number' => ['sometimes', 'nullable', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'id_document.required' => 'An identity document file is required.',
            'id_document.mimes' => 'The identity document must be a file of type: jpg, jpeg, png, pdf.',
            'id_document.max' => 'The identity document may not be greater than 5MB.',
            'address_document.required' => 'A proof of address document file is required.',
            'address_document.mimes' => 'The proof of address document must be a file of type: jpg, jpeg, png, pdf.',
            'address_document.max' => 'The proof of address document may not be greater than 5MB.',
        ];
    }
}

