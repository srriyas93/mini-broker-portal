import React, { useEffect, useState } from 'react';
import { kycApi } from '../api/client';
import { X, Download, FileText, Loader2, AlertCircle } from 'lucide-react';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  submissionId: number;
  type: 'id' | 'address';
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  title,
  submissionId,
  type,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let activeUrl: string | null = null;
    setIsLoading(true);
    setError(null);

    const fetchDocument = async () => {
      try {
        const blob = await kycApi.getDocumentBlob(submissionId, type);
        setMimeType(blob.type);
        const url = URL.createObjectURL(blob);
        activeUrl = url;
        setBlobUrl(url);
      } catch {
        setError('Failed to fetch document. You may not have permission or file is missing.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();

    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [isOpen, submissionId, type]);

  if (!isOpen) return null;

  const isPdf = mimeType.includes('pdf');
  const isImage = mimeType.includes('image') || mimeType.includes('jpeg') || mimeType.includes('png');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/60">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-white text-sm sm:text-base">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {blobUrl && (
              <a
                href={blobUrl}
                download={`kyc_${submissionId}_${type}.${isPdf ? 'pdf' : 'jpg'}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-950/50 min-h-[400px]">
          {isLoading && (
            <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
              <span>Fetching secure document blob...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isLoading && !error && blobUrl && (
            <>
              {isImage && (
                <img
                  src={blobUrl}
                  alt={title}
                  className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-800"
                />
              )}
              {isPdf && (
                <iframe
                  src={blobUrl}
                  title={title}
                  className="w-full h-[70vh] rounded-xl border border-slate-800 bg-white"
                />
              )}
              {!isImage && !isPdf && (
                <div className="text-center text-xs text-slate-400 space-y-3">
                  <p>Document preview is not directly supported in this browser.</p>
                  <a
                    href={blobUrl}
                    download={`kyc_${submissionId}_${type}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 text-white font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

