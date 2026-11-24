<?php

declare(strict_types=1);

namespace App\Enums;

enum TransactionType: string
{
    case DEPOSIT = 'deposit';
    case WITHDRAWAL = 'withdrawal';
    case TRANSFER = 'transfer';
    case TRADE_PROFIT = 'trade_profit';
    case TRADE_LOSS = 'trade_loss';

    public function label(): string
    {
        return match ($this) {
            self::DEPOSIT => 'Deposit',
            self::WITHDRAWAL => 'Withdrawal',
            self::TRANSFER => 'Transfer',
            self::TRADE_PROFIT => 'Trade Profit',
            self::TRADE_LOSS => 'Trade Loss',
        };
    }
}

