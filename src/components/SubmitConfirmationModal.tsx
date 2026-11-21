import { AlertCircle, CheckCircle2, Loader2, MessageCircle, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface ConfirmationShiftItem {
  dateTitle: string;
  shiftDisplay: string;
}

export interface SubmitConfirmationSummary {
  tempohTugasan: string;
  svName: string;
  email: string;
  namaPemohon: string;
  noTelefon: string;
  suratKelulusanDisplay: string;
  sendEmailCopy: boolean;
  selectedShifts: ConfirmationShiftItem[];
}

interface SubmitConfirmationModalProps {
  open: boolean;
  isSubmitting: boolean;
  defaultSendWhatsapp?: boolean;
  summary: SubmitConfirmationSummary | null;
  onClose: () => void;
  onConfirmSubmit: (sendToWhatsapp: boolean) => void;
}

export function SubmitConfirmationModal({
  open,
  isSubmitting,
  defaultSendWhatsapp = true,
  summary,
  onClose,
  onConfirmSubmit,
}: SubmitConfirmationModalProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [sendWhatsapp, setSendWhatsapp] = useState(defaultSendWhatsapp);
  const [showConfirmWarning, setShowConfirmWarning] = useState(false);

  useEffect(() => {
    if (open) {
      setIsConfirmed(false);
      setSendWhatsapp(defaultSendWhatsapp);
      setShowConfirmWarning(false);
    }
  }, [open, defaultSendWhatsapp]);

  if (!open || !summary) return null;

  const handleConfirmClick = () => {
    if (!isConfirmed) {
      setShowConfirmWarning(true);
      return;
    }
    setShowConfirmWarning(false);
    onConfirmSubmit(sendWhatsapp);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmSubmitTitle"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="confirmSubmitTitle" className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                Pengesahan
                <br />
                Maklumat Permohonan
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Sila semak maklumat permohonan anda sebelum dihantar.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Tutup modal pengesahan"
            className="text-slate-400 hover:text-slate-600 disabled:opacity-40 p-1.5 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Tempoh Tugasan</span>
              <p className="font-bold text-slate-900 tabular-nums mt-0.5">{summary.tempohTugasan}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Penyelia (SV) Incaj</span>
              <p className="font-bold text-sky-800 mt-0.5">{summary.svName}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Nama Pemohon</span>
              <p className="font-bold text-slate-900 mt-0.5 break-words">{summary.namaPemohon}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">No. Telefon Bimbit</span>
              <p className="font-bold text-slate-900 tabular-nums mt-0.5">{summary.noTelefon}</p>
            </div>
            <div className="sm:col-span-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Alamat Emel</span>
              <p className="font-semibold text-slate-800 mt-0.5 break-all">{summary.email}</p>
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Surat Kelulusan: </span>
                <span className="font-semibold text-slate-800">
                  {summary.suratKelulusanDisplay || 'Tiada lampiran'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Salinan Emel: </span>
                <span className="font-semibold text-slate-800">{summary.sendEmailCopy ? 'Ya' : 'Tidak'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Shifts List */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Pilihan Syif Tarikh Harian</span>
            <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md tabular-nums">
              {summary.selectedShifts.length} hari dipilih
            </span>
          </div>
          <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
            {summary.selectedShifts.map((item) => (
              <div
                key={item.dateTitle}
                className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
              >
                <span className="font-medium text-slate-700 tabular-nums">{item.dateTitle}</span>
                <span className="font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md text-[11px] shrink-0">
                  {item.shiftDisplay}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp Notice */}
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900">
          <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Satu salinan permohonan jadual akan dihantar ke WhatsApp selepas borang berjaya dihantar.
          </p>
        </div>

        {/* Confirmation Checkboxes */}
        <div className="space-y-2.5">
          <label
            htmlFor="confirmAccuracyCheckbox"
            className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
              isConfirmed
                ? 'border-emerald-300 bg-emerald-50/60'
                : showConfirmWarning
                  ? 'border-red-400 bg-red-50/40'
                  : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              id="confirmAccuracyCheckbox"
              type="checkbox"
              disabled={isSubmitting}
              checked={isConfirmed}
              onChange={(e) => {
                setIsConfirmed(e.target.checked);
                if (e.target.checked) setShowConfirmWarning(false);
              }}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 shrink-0"
            />
            <span className="text-xs font-semibold text-slate-800 leading-relaxed">
              Saya sahkan semua maklumat permohonan di atas adalah benar, tepat dan lengkap.
            </span>
          </label>

          <label
            htmlFor="confirmWhatsappCheckbox"
            className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
              sendWhatsapp
                ? 'border-sky-300 bg-sky-50/50'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              id="confirmWhatsappCheckbox"
              type="checkbox"
              disabled={isSubmitting}
              checked={sendWhatsapp}
              onChange={(e) => setSendWhatsapp(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 shrink-0"
            />
            <span className="text-xs font-medium text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Simpan dan hantar ke WhatsApp</strong>
            </span>
          </label>
        </div>

        {showConfirmWarning && (
          <div
            role="alert"
            className="flex items-center gap-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Sila tandakan kotak pengesahan maklumat terlebih dahulu sebelum meneruskan.</span>
          </div>
        )}

        {isSubmitting && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-3 text-xs text-sky-900"
          >
            <Loader2 className="w-4 h-4 text-sky-600 animate-spin shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <p className="font-bold text-slate-900">Permohonan sedang diproses, harap bersabar.</p>
              {sendWhatsapp && (
                <p className="text-sky-800">
                  Anda akan dibawa ke bukaan ke WhatsApp selepas permohonan berjaya direkodkan.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-colors"
          >
            <span>Semak Semula</span>
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmClick}
            className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-2.5 px-5 rounded-xl text-xs sm:text-sm shadow-sm transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Permohonan sedang diproses...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Sahkan dan Hantar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
