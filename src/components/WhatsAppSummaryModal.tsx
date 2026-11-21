import { Check, Copy, ExternalLink, MessageCircle, X } from 'lucide-react';
import { useState } from 'react';

interface WhatsAppSummaryModalProps {
  open: boolean;
  summaryText: string;
  onClose: () => void;
}

export function WhatsAppSummaryModal({ open, summaryText, onClose }: WhatsAppSummaryModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(summaryText)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-sm p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="waModalTitle"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 border border-slate-200 shadow-xl space-y-3.5 sm:space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-emerald-700 min-w-0">
            <MessageCircle className="w-5 h-5 shrink-0" />
            <h3 id="waModalTitle" className="text-sm sm:text-base font-bold text-slate-900 truncate">
              Hantar Salinan Permohonan ke WhatsApp
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal WhatsApp"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Permohonan anda telah berjaya direkodkan.
          <br />
          Klik butang di bawah untuk menghantar satu salinan permohonan jadual ke WhatsApp.
        </p>

        <pre className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-[11px] sm:text-xs text-slate-800 whitespace-pre-wrap break-words font-mono-tabular max-h-60 sm:max-h-64 overflow-y-auto leading-relaxed">
          {summaryText}
        </pre>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Disalin!' : 'Salin Teks'}</span>
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>Terus Hantar ke WhatsApp</span>
            <ExternalLink className="w-4 h-4 shrink-0" />
          </a>
        </div>
      </div>
    </div>
  );
}
