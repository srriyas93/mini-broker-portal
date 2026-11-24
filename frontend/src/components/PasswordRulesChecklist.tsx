import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface PasswordRulesChecklistProps {
  password: string;
  confirmation?: string;
}

export const PasswordRulesChecklist: React.FC<PasswordRulesChecklistProps> = ({
  password,
  confirmation,
}) => {
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const isConfirmed =
    confirmation !== undefined && confirmation.length > 0
      ? password === confirmation
      : null;

  const rules = [
    { label: 'At least 8 characters long', valid: hasMinLength },
    { label: 'Contains at least one letter (a-z, A-Z)', valid: hasLetter },
    { label: 'Contains at least one number (0-9)', valid: hasNumber },
  ];

  if (confirmation !== undefined) {
    rules.push({
      label: 'Passwords match',
      valid: isConfirmed === true,
    });
  }

  return (
    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60 space-y-2 text-xs">
      <div className="font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
        <span>Password Requirements</span>
        <span
          className={`text-[11px] font-mono ${
            hasMinLength && hasLetter && hasNumber
              ? 'text-emerald-400'
              : 'text-slate-400'
          }`}
        >
          {hasMinLength && hasLetter && hasNumber ? 'Strong' : 'Incomplete'}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {rules.map((rule, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-2 transition-colors ${
              rule.valid ? 'text-emerald-400 font-medium' : 'text-slate-400'
            }`}
          >
            {rule.valid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-slate-600 flex-shrink-0" />
            )}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

