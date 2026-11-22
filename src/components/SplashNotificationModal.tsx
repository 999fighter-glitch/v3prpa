import { Globe, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SplashNotificationModalProps {
  open: boolean;
  tajuk1: string;
  appVersion: string;
  onClose: () => void;
}

const AUTO_CLOSE_SECONDS = 5;

export function SplashNotificationModal({
  open,
  tajuk1,
  appVersion,
  onClose,
}: SplashNotificationModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_SECONDS);

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(AUTO_CLOSE_SECONDS);

    const intervalId = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timeoutId = window.setTimeout(() => {
      onClose();
    }, AUTO_CLOSE_SECONDS * 1000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const progressPct = Math.max(0, Math.min(100, (secondsLeft / AUTO_CLOSE_SECONDS) * 100));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="splashNotifTitle"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Banner */}
        <div className="bg-sky-700 px-5 pt-5 pb-4 text-white relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup notifikasi permulaan"
            className="absolute top-3 right-3 text-sky-100 hover:text-white hover:bg-sky-600/70 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>

          <h2 id="splashNotifTitle" className="text-base sm:text-lg font-extrabold tracking-tight">
            Permohonan Jadual Tugas PPP U5
          </h2>
          <p className="text-xs text-sky-100 mt-0.5 font-medium">{tajuk1}</p>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3.5 space-y-1.5">
            <div className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-sky-700 uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>Makluman Versi Deployment</span>
            </div>
            <p className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight font-mono-tabular">
              THIS VERSION UPLOADED THRU GITHUB-NETLIFY V3.3
            </p>
            <p className="text-[11px] text-slate-600">
              Tetapan Sistem Semasa: <span className="font-semibold text-slate-800">Versi {appVersion}</span>
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-full h-1.5 bg-slate-100 rounded-md overflow-hidden">
              <div
                className="h-full bg-sky-600 transition-all duration-1000 ease-linear"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 tabular-nums">
              {secondsLeft > 0
                ? `Tetingkap ini akan ditutup automatik dalam ${secondsLeft} saat...`
                : 'Membuka borang permohonan...'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 text-sm"
          >
            Teruskan ke Borang
          </button>
        </div>
      </div>
    </div>
  );
}
