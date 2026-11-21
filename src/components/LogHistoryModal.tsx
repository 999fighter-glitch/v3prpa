import { AlertCircle, CheckCircle2, Clock, History, Trash2, X } from 'lucide-react';

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  source: string;
  title: string;
  message: string;
  level?: 'error' | 'success';
}

interface LogHistoryModalProps {
  open: boolean;
  logs: ErrorLogEntry[];
  onClearLogs: () => void;
  onClose: () => void;
}

function formatLogDateTime(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  const d = String(dt.getDate()).padStart(2, '0');
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const y = dt.getFullYear();
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  const ss = String(dt.getSeconds()).padStart(2, '0');
  return `${d}/${m}/${y} · ${hh}:${mm}:${ss}`;
}

export function LogHistoryModal({ open, logs, onClearLogs, onClose }: LogHistoryModalProps) {
  if (!open) return null;

  const successCount = logs.filter((entry) => entry.level === 'success').length;
  const errorCount = logs.length - successCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logHistoryTitle"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="logHistoryTitle" className="text-sm sm:text-base font-bold text-slate-900 truncate">
                Log History (Catatan Aktiviti &amp; Ralat)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 tabular-nums">
                {logs.length} rekod dicatat ({successCount} berjaya · {errorCount} ralat)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup log history"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {logs.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-8 text-center space-y-1.5">
              <History className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Tiada rekod log buat masa ini</p>
              <p className="text-xs text-slate-500">
                Notifikasi simpanan helaian Google Sheets serta sebarang ralat sambungan akan direkodkan di sini bersama masa kejadian.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs.map((entry) => {
                const isSuccess = entry.level === 'success';
                return (
                  <div
                    key={entry.id}
                    className={`rounded-xl border p-3.5 space-y-1.5 text-xs ${
                      isSuccess
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-red-200 bg-red-50/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div
                        className={`flex items-center gap-1.5 font-bold min-w-0 ${
                          isSuccess ? 'text-emerald-900' : 'text-red-900'
                        }`}
                      >
                        {isSuccess ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span className="truncate">{entry.title}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-mono-tabular shrink-0">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatLogDateTime(entry.timestamp)}</span>
                      </span>
                    </div>
                    <p
                      className={`text-[11px] font-semibold ${
                        isSuccess ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      Sumber: {entry.source}
                    </p>
                    <p
                      className={`text-xs text-slate-700 bg-white/90 border rounded-lg p-2.5 whitespace-pre-line break-words leading-relaxed ${
                        isSuccess ? 'border-emerald-100' : 'border-red-100'
                      }`}
                    >
                      {entry.message}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between gap-2.5 pt-2 border-t border-slate-100 shrink-0">
          {logs.length > 0 ? (
            <button
              type="button"
              onClick={onClearLogs}
              className="min-h-[42px] inline-flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold py-2 px-4 rounded-xl text-xs sm:text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Padam Semua Log</span>
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-5 rounded-xl text-xs sm:text-sm transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
