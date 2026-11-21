import { AlertTriangle, Check, ExternalLink, FileText, X } from 'lucide-react';

export interface NotificationState {
  open: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning';
  showSheetPreview: boolean;
  fileUrl?: string;
  buttonLabel?: string;
  onAfterClose?: () => void;
}

interface NotificationModalProps {
  notification: NotificationState;
  sheetUrl: string;
  sheetName?: string;
  onClose: () => void;
}

export function NotificationModal({ notification, sheetUrl, sheetName, onClose }: NotificationModalProps) {
  if (!notification.open) return null;

  const isError = notification.type === 'error';
  const isWarning = notification.type === 'warning';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-sm p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifTitle"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 shadow-xl text-center space-y-3.5 sm:space-y-4 max-h-[90vh] overflow-y-auto">
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mx-auto ${
            isError
              ? 'bg-red-100 text-red-600'
              : isWarning
                ? 'bg-amber-100 text-amber-600'
                : 'bg-emerald-100 text-emerald-600'
          }`}
        >
          {isError ? (
            <X className="w-6 h-6 sm:w-7 sm:h-7" />
          ) : isWarning ? (
            <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />
          ) : (
            <Check className="w-6 h-6 sm:w-7 sm:h-7" />
          )}
        </div>

        <h3 id="notifTitle" className="text-base sm:text-lg font-bold text-slate-900">
          {notification.title}
        </h3>
        <p
          className={`text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line break-words ${
            notification.type !== 'success' && notification.message.includes('\n')
              ? 'text-left bg-slate-50 rounded-xl p-3 sm:p-3.5 border border-slate-200'
              : ''
          }`}
        >
          {notification.message}
        </p>

        {notification.fileUrl && notification.fileUrl.startsWith('http') && (
          <div className="pt-1">
            <a
              href={notification.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold py-2.5 px-4 rounded-xl border border-emerald-200 text-xs sm:text-sm transition-colors"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Lihat Fail Surat Kelulusan di Google Drive</span>
            </a>
          </div>
        )}

        {notification.showSheetPreview && sheetUrl && (
          <div className="pt-1">
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={sheetName ? `Papar rekod pada helaian: ${sheetName}` : 'Pratonton Rekod di Google Sheets'}
              className="inline-flex items-center justify-center gap-2 w-full bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold py-2.5 px-4 rounded-xl border border-sky-200 text-xs sm:text-sm transition-colors"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span>Pratonton Rekod di Google Sheets</span>
            </a>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          {notification.buttonLabel || 'Tutup'}
        </button>
      </div>
    </div>
  );
}
