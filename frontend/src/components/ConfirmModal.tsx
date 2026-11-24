import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void> | void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'success' | 'primary';
  requireReason?: boolean;
  reasonPlaceholder?: string;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  requireReason = false,
  reasonPlaceholder = 'Please enter a reason...',
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      setError('A reason is required to proceed.');
      return;
    }
    setError(null);
    await onConfirm(reason.trim() || undefined);
    setReason('');
  };

  const handleClose = () => {
    if (isLoading) return;
    setReason('');
    setError(null);
    onClose();
  };

  const variantStyles = {
    danger: 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20',
    success: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20',
    primary: 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/20',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 relative">
        <button
          onClick={handleClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">{message}</p>

        {requireReason && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder={reasonPlaceholder}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 transition-colors"
            />
            {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 transition-colors disabled:opacity-40"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 ${variantStyles[variant]}`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
