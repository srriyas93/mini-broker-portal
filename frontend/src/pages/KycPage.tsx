import React, { useEffect, useState, useRef } from 'react';
import { kycApi } from '../api/client';
import type { KycSubmission, ApiErrorResponse } from '../types';
import {
  ShieldCheck,
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  FileCheck,
} from 'lucide-react';
import axios from 'axios';

export const KycPage: React.FC = () => {
  const [submission, setSubmission] = useState<KycSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [documentType, setDocumentType] = useState('passport');
  const [documentNumber, setDocumentNumber] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [addressFile, setAddressFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const idInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  const loadStatus = async () => {
    try {
      const res = await kycApi.status();
      setSubmission(res.submission);
    } catch {
      // Ignore background error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (f: File | null) => void,
    fieldLabel: string
  ) => {
    setFormError(null);
    if (!e.target.files || e.target.files.length === 0) {
      setter(null);
      return;
    }
    const file = e.target.files[0];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setFormError(`${fieldLabel} must be a JPG, PNG, or PDF file.`);
      e.target.value = '';
      setter(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError(`${fieldLabel} exceeds maximum allowed size of 5MB.`);
      e.target.value = '';
      setter(null);
      return;
    }
    setter(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!idFile) {
      setFormError('Please select your ID Document file.');
      return;
    }
    if (!addressFile) {
      setFormError('Please select your Proof of Address document file.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('id_document', idFile);
      formData.append('address_document', addressFile);
      formData.append('document_type', documentType);
      if (documentNumber.trim()) {
        formData.append('document_number', documentNumber.trim());
      }

      const res = await kycApi.upload(formData);
      setSubmission(res.submission);
      setSuccessMessage('KYC documents submitted successfully. Compliance review is in progress.');
      setIdFile(null);
      setAddressFile(null);
      if (idInputRef.current) idInputRef.current.value = '';
      if (addressInputRef.current) addressInputRef.current.value = '';
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(err) && err.response) {
        setFormError(
          err.response.data?.message || 'Failed to submit KYC documents. Please check file formats.'
        );
      } else {
        setFormError('Network error. Unable to upload documents.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canUpload = !submission || submission.status === 'rejected';

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        <p className="text-xs text-slate-400">Loading KYC record...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Page Title */}
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Identity Compliance</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          KYC Document Verification
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Regulatory compliance verification for secure withdrawals and account protection
        </p>
      </div>

      {/* Rejection Reason Alert */}
      {submission?.status === 'rejected' && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-4 text-rose-300 text-sm shadow-xl">
          <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-rose-200">Previous Submission Rejected</h3>
            <p className="text-xs text-rose-300/90 leading-relaxed">
              Reason provided by compliance:{' '}
              <span className="font-semibold text-white">
                "{submission.rejection_reason || 'Unreadable or expired documents.'}"
              </span>
            </p>
            <p className="text-xs text-rose-400 pt-1">
              You are eligible to re-upload corrected copies below.
            </p>
          </div>
        </div>
      )}

      {/* Approved Status Banner */}
      {submission?.status === 'approved' && (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-4 text-emerald-300 text-sm shadow-xl">
          <CheckCircle2 className="w-7 h-7 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-emerald-200">Account Fully Verified</h3>
            <p className="text-xs text-emerald-300/90 leading-relaxed">
              Your identity has been verified on{' '}
              {submission.reviewed_at
                ? new Date(submission.reviewed_at).toLocaleDateString()
                : 'file'}
              . All trading capabilities, deposits, and unrestricted withdrawals are available.
            </p>
            <div className="flex items-center gap-4 text-xs font-mono text-emerald-400/80 pt-2">
              <div>Type: {submission.document_type}</div>
              {submission.document_number && <div>Number: {submission.document_number}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Pending Status Banner */}
      {submission?.status === 'pending' && (
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-4 text-amber-300 text-sm shadow-xl">
          <Clock className="w-7 h-7 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-amber-200">Documents Under Review</h3>
            <p className="text-xs text-amber-300/90 leading-relaxed">
              Your documents were submitted on{' '}
              {new Date(submission.created_at).toLocaleDateString()} and are being reviewed by our
              compliance administrators. Re-uploading is disabled until the review is finished.
            </p>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-xs">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Upload Form - Enabled only if no submission or rejected */}
      {canUpload && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">
              {submission?.status === 'rejected' ? 'Re-upload KYC Documents' : 'Submit Documents'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Please upload clear, colored copies of your government ID and recent utility bill or bank
              statement (Max 5MB each, JPG, PNG, or PDF).
            </p>
          </div>

          {formError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-xs">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ID Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500 transition-colors"
                >
                  <option value="passport">International Passport</option>
                  <option value="national_id">National Identity Card</option>
                  <option value="driving_license">Driver's License</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Document Number <span className="text-slate-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="e.g. PASS12345678"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </div>

            {/* Document 1: ID Document */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>1. Government-Issued Photo ID (Passport / ID / License)</span>
                </label>
                <span className="text-[11px] text-slate-500 font-mono">Required • Max 5MB</span>
              </div>
              <input
                ref={idInputRef}
                type="file"
                required
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => handleFileChange(e, setIdFile, 'ID Document')}
                className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/20 cursor-pointer"
              />
              {idFile && (
                <div className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>
                    Selected: {idFile.name} ({(idFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>

            {/* Document 2: Proof of Address */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>2. Proof of Address (Utility Bill / Bank Statement)</span>
                </label>
                <span className="text-[11px] text-slate-500 font-mono">Required • Max 5MB</span>
              </div>
              <input
                ref={addressInputRef}
                type="file"
                required
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => handleFileChange(e, setAddressFile, 'Proof of Address')}
                className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 cursor-pointer"
              />
              {addressFile && (
                <div className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>
                    Selected: {addressFile.name} ({(addressFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !idFile || !addressFile}
              className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading to Secure Storage...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Submit Documents for Verification</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
