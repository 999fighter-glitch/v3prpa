import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  FileSpreadsheet,
  FolderCheck,
  Info,
  KeyRound,
  Lock,
  MessageCircle,
  RefreshCw,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { buildGasCode } from '../data/gasCodeTemplate';
import { AppConfig, ApplicationRecord, ForceStatus, normalizeAppVersion } from '../data/rosterData';
import {
  ADMIN_GUIDELINE_SECTIONS,
  buildUserGuidelineShareSummary,
  generateUserGuidelinePdfBlob,
  USER_GUIDELINE_SECTIONS,
} from '../data/userGuidelineData';
import '../types/gas';

const ADMIN_ACCESS_CODE = 'ADMIN007';

interface AdminUser {
  name: string;
  role: string;
}

interface ConnectionCheckResult {
  status: 'idle' | 'checking' | 'connected' | 'error';
  message: string;
  checkedAt: string;
  latencyMs: number | null;
  targetUrl?: string;
}

interface FolderCheckResult {
  status: 'idle' | 'checking' | 'valid' | 'warning';
  message: string;
  checkedAt: string;
  folderName?: string;
}

interface AdminModalProps {
  open: boolean;
  config: AppConfig;
  records: ApplicationRecord[];
  onClose: () => void;
  onSaveConfig: (nextConfig: AppConfig) => void;
  onClearRecords: () => void;
  onDeleteRecord: (id: string) => void;
  onRecordLog?: (source: string, title: string, message: string, level?: 'error' | 'success') => void;
}

export function AdminModal({
  open,
  config,
  records,
  onClose,
  onSaveConfig,
  onClearRecords,
  onDeleteRecord,
  onRecordLog,
}: AdminModalProps) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'form' | 'system' | 'records' | 'gas' | 'guideline' | 'about'>('form');
  const [guidelineRole, setGuidelineRole] = useState<'user' | 'admin'>('user');
  const [pdfFeedback, setPdfFeedback] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedGas, setCopiedGas] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [htmlExportError, setHtmlExportError] = useState('');
  const [cachedIndexHtml, setCachedIndexHtml] = useState('');
  const [isLoadingHtml, setIsLoadingHtml] = useState(false);
  const [showHtmlManualBox, setShowHtmlManualBox] = useState(false);

  const [startDate, setStartDate] = useState(config.startDate);
  const [endDate, setEndDate] = useState(config.endDate);
  const [closingDate, setClosingDate] = useState(config.closingDate);
  const [svName, setSvName] = useState(config.svName);
  const [forceStatus, setForceStatus] = useState<ForceStatus>(config.forceStatus);
  const [recordSpreadsheetUrl, setRecordSpreadsheetUrl] = useState(config.recordSpreadsheetUrl);
  const [gasWebAppUrl, setGasWebAppUrl] = useState(config.gasWebAppUrl || '');
  const [approvalFolderUrl, setApprovalFolderUrl] = useState(config.approvalFolderUrl || '');
  const [enableSaveNotification, setEnableSaveNotification] = useState(
    config.enableSaveNotification !== false
  );
  const [logoUrl, setLogoUrl] = useState(config.logoUrl);
  const [tajuk1, setTajuk1] = useState(config.tajuk1 || 'Unit PRPA HTAR');
  const [footerText, setFooterText] = useState(config.footerText || 'Hak Cipta Terpelihara © 2026');
  const [appVersion, setAppVersion] = useState(normalizeAppVersion(config.appVersion, '3.0'));
  const [editionName, setEditionName] = useState(config.editionName || 'Edisi Terkini Dis 2026');
  const [versionUpdatedAt, setVersionUpdatedAt] = useState(config.versionUpdatedAt || 'Disember 2026');

  const [connectionCheck, setConnectionCheck] = useState<ConnectionCheckResult>({
    status: 'idle',
    message: 'Belum diuji.',
    checkedAt: '',
    latencyMs: null,
  });

  const [folderCheck, setFolderCheck] = useState<FolderCheckResult>({
    status: 'idle',
    message: '',
    checkedAt: '',
  });

  useEffect(() => {
    if (open) {
      setStartDate(config.startDate);
      setEndDate(config.endDate);
      setClosingDate(config.closingDate);
      setSvName(config.svName);
      setForceStatus(config.forceStatus);
      setRecordSpreadsheetUrl(config.recordSpreadsheetUrl);
      setGasWebAppUrl(config.gasWebAppUrl || '');
      setApprovalFolderUrl(config.approvalFolderUrl || '');
      setEnableSaveNotification(config.enableSaveNotification !== false);
      setLogoUrl(config.logoUrl);
      setTajuk1(config.tajuk1 || 'Unit PRPA HTAR');
      setFooterText(config.footerText || 'Hak Cipta Terpelihara © 2026');
      setAppVersion(normalizeAppVersion(config.appVersion, '3.0'));
      setEditionName(config.editionName || 'Edisi Terkini Dis 2026');
      setVersionUpdatedAt(config.versionUpdatedAt || 'Disember 2026');
      setLoginError('');
      setFolderCheck({ status: 'idle', message: '', checkedAt: '' });
      setHtmlExportError('');
      setPdfFeedback(null);
    }
  }, [open, config]);

  useEffect(() => {
    if (!open || !adminUser || activeTab !== 'gas' || cachedIndexHtml || window.google?.script?.run) {
      return;
    }
    let cancelled = false;
    setIsLoadingHtml(true);
    fetch(`/appsscript-index.html?t=${Date.now()}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Fail Index.html belum dijana.');
        const text = await res.text();
        if (text.length < 150000 || new RegExp('\\x3cscript[^>]+src=["\']/src/').test(text)) {
          throw new Error('Fail binaan tunggal Index.html sedang dijana. Sila muat semula atau cuba sebentar lagi.');
        }
        if (!cancelled) {
          setCachedIndexHtml(text);
          setHtmlExportError('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setHtmlExportError(err instanceof Error ? err.message : 'Gagal memuatkan Index.html.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHtml(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, adminUser, activeTab, cachedIndexHtml]);

  if (!open) return null;

  const formatTimestampNow = () => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
  };

  const handleCodeLogin = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = accessCodeInput.trim();
    if (trimmed === ADMIN_ACCESS_CODE) {
      setAdminUser({
        name: 'Admin PPP U5',
        role: 'Pentadbir Sistem (ADMIN007)',
      });
      setAccessCodeInput('');
      setLoginError('');
    } else {
      setLoginError('Kod akses admin tidak sah. Sila masukkan kod yang betul.');
    }
  };

  const handleCheckConnection = async () => {
    const gasRun = window.google?.script?.run;
    if (gasRun) {
      setConnectionCheck({
        status: 'checking',
        message: 'Sedang menyemak sambungan Google Sheet & helaian Senarai Nama PPPU5...',
        checkedAt: formatTimestampNow(),
        latencyMs: null,
      });
      const startedAt = performance.now();
      gasRun
        .withSuccessHandler((res: unknown) => {
          const data = (res || {}) as Partial<AppConfig> & { status?: string };
          if (!(data.recordSpreadsheetUrl || data.logoUrl || data.svName || data.status === 'ok')) {
            const elapsedMs = Math.round(performance.now() - startedAt);
            setConnectionCheck({
              status: 'error',
              message: 'Respons diterima tetapi data konfigurasi Google Sheet tidak lengkap.',
              checkedAt: formatTimestampNow(),
              latencyMs: elapsedMs,
            });
            return;
          }

          gasRun
            .withSuccessHandler((dirRes: unknown) => {
              const elapsedMs = Math.round(performance.now() - startedAt);
              const dirData = (dirRes || {}) as {
                status?: string;
                sheetName?: string;
                totalRecords?: number;
                recordsByName?: Record<string, unknown>;
                message?: string;
              };
              if (dirData.status === 'ok') {
                const count =
                  typeof dirData.totalRecords === 'number'
                    ? dirData.totalRecords
                    : dirData.recordsByName
                      ? Object.keys(dirData.recordsByName).length
                      : 0;
                const sheetLabel = dirData.sheetName || 'Senarai Nama PPPU5';
                const successMsg = `Sambungan aktif ke Google Sheet & helaian "${sheetLabel}" (${count} rekod PPP).`;
                setConnectionCheck({
                  status: 'connected',
                  message: successMsg,
                  checkedAt: formatTimestampNow(),
                  latencyMs: elapsedMs,
                  targetUrl: data.recordSpreadsheetUrl || recordSpreadsheetUrl,
                });
                onRecordLog?.(
                  'Senarai Nama PPPU5 (Uji Sambungan)',
                  'Sambungan Senarai Nama PPP Berjaya',
                  `${successMsg} (${elapsedMs} ms)`,
                  'success'
                );
              } else {
                const errMsg =
                  dirData.message ||
                  'Sambungan utama aktif, tetapi gagal membaca helaian "Senarai Nama PPPU5".';
                setConnectionCheck({
                  status: 'error',
                  message: errMsg,
                  checkedAt: formatTimestampNow(),
                  latencyMs: elapsedMs,
                });
                onRecordLog?.(
                  'Senarai Nama PPPU5 (Uji Sambungan)',
                  'Ralat Uji Sambungan Senarai Nama PPP',
                  errMsg,
                  'error'
                );
              }
            })
            .withFailureHandler((dirErr: unknown) => {
              const elapsedMs = Math.round(performance.now() - startedAt);
              const errMsg = `Sambungan utama aktif, tetapi gagal memanggil gasGetStaffDirectory(): ${String(dirErr)}`;
              setConnectionCheck({
                status: 'error',
                message: errMsg,
                checkedAt: formatTimestampNow(),
                latencyMs: elapsedMs,
              });
              onRecordLog?.(
                'Senarai Nama PPPU5 (Uji Sambungan)',
                'Ralat Uji Sambungan Senarai Nama PPP',
                errMsg,
                'error'
              );
            })
            .gasGetStaffDirectory(data.recordSpreadsheetUrl || recordSpreadsheetUrl);
        })
        .withFailureHandler((err: unknown) => {
          const elapsedMs = Math.round(performance.now() - startedAt);
          setConnectionCheck({
            status: 'error',
            message: `Gagal berhubung dengan fungsi gasGetConfig(): ${String(err)}`,
            checkedAt: formatTimestampNow(),
            latencyMs: elapsedMs,
          });
        })
        .gasGetConfig();
      return;
    }

    const targetGasUrl = gasWebAppUrl.trim() || config.gasWebAppUrl.trim();
    if (!targetGasUrl) {
      setConnectionCheck({
        status: 'error',
        message: 'URL Web App Google Apps Script (/exec) belum diisi.',
        checkedAt: formatTimestampNow(),
        latencyMs: 0,
      });
      return;
    }

    setConnectionCheck({
      status: 'checking',
      message: 'Sedang menyemak sambungan Google Sheet & helaian Senarai Nama PPPU5...',
      checkedAt: formatTimestampNow(),
      latencyMs: null,
    });

    const startedAt = performance.now();
    try {
      const sep = targetGasUrl.includes('?') ? '&' : '?';
      const checkUrl = `${targetGasUrl}${sep}action=getConfig&t=${Date.now()}`;
      const dirUrl = `${targetGasUrl}${sep}action=getStaffDirectory&fallbackUrl=${encodeURIComponent(
        recordSpreadsheetUrl.trim() || config.recordSpreadsheetUrl
      )}&t=${Date.now()}`;

      const [response, dirResponse] = await Promise.all([
        fetch(checkUrl, { method: 'GET', cache: 'no-store' }),
        fetch(dirUrl, { method: 'GET', cache: 'no-store' }),
      ]);
      const elapsedMs = Math.round(performance.now() - startedAt);
      const checkedAt = formatTimestampNow();

      if (!response.ok) {
        setConnectionCheck({
          status: 'error',
          message: `Pelayan GAS memulangkan ralat HTTP ${response.status}.`,
          checkedAt,
          latencyMs: elapsedMs,
        });
        return;
      }

      const data = (await response.json()) as Partial<AppConfig> & { status?: string };
      if (!(data && (data.recordSpreadsheetUrl || data.logoUrl || data.svName || data.status === 'ok'))) {
        setConnectionCheck({
          status: 'error',
          message: 'Respons diterima tetapi data konfigurasi Google Sheet tidak lengkap.',
          checkedAt,
          latencyMs: elapsedMs,
        });
        return;
      }

      if (!dirResponse.ok) {
        setConnectionCheck({
          status: 'error',
          message: `Sambungan utama aktif, tetapi helaian Senarai Nama PPPU5 memulangkan HTTP ${dirResponse.status}.`,
          checkedAt,
          latencyMs: elapsedMs,
        });
        return;
      }

      const dirData = (await dirResponse.json()) as {
        status?: string;
        sheetName?: string;
        totalRecords?: number;
        recordsByName?: Record<string, unknown>;
        message?: string;
      };

      if (dirData && dirData.status === 'ok') {
        const count =
          typeof dirData.totalRecords === 'number'
            ? dirData.totalRecords
            : dirData.recordsByName
              ? Object.keys(dirData.recordsByName).length
              : 0;
        const sheetLabel = dirData.sheetName || 'Senarai Nama PPPU5';
        const successMsg = `Sambungan aktif ke Google Sheet & helaian "${sheetLabel}" (${count} rekod PPP).`;
        setConnectionCheck({
          status: 'connected',
          message: successMsg,
          checkedAt,
          latencyMs: elapsedMs,
          targetUrl: data.recordSpreadsheetUrl || recordSpreadsheetUrl,
        });
        onRecordLog?.(
          'Senarai Nama PPPU5 (Uji Sambungan)',
          'Sambungan Senarai Nama PPP Berjaya',
          `${successMsg} (${elapsedMs} ms)`,
          'success'
        );
      } else {
        const errMsg =
          dirData?.message ||
          'Sambungan utama aktif, tetapi gagal membaca helaian "Senarai Nama PPPU5".';
        setConnectionCheck({
          status: 'error',
          message: errMsg,
          checkedAt,
          latencyMs: elapsedMs,
        });
        onRecordLog?.(
          'Senarai Nama PPPU5 (Uji Sambungan)',
          'Ralat Uji Sambungan Senarai Nama PPP',
          errMsg,
          'error'
        );
      }
    } catch (err) {
      const elapsedMs = Math.round(performance.now() - startedAt);
      setConnectionCheck({
        status: 'error',
        message: `Gagal berhubung dengan pelayan GAS (${err instanceof Error ? err.message : 'Ralat rangkaian'}). Pastikan Web App di-deploy dengan akses "Anyone".`,
        checkedAt: formatTimestampNow(),
        latencyMs: elapsedMs,
      });
    }
  };

  const handleCheckDriveFolder = async () => {
    const rawFolder = approvalFolderUrl.trim();
    const checkedAt = formatTimestampNow();

    if (!rawFolder) {
      setFolderCheck({
        status: 'warning',
        message: 'Amaran: Pautan folder lokasi Surat Kelulusan belum diisi. Sila masukkan URL folder Google Drive.',
        checkedAt,
      });
      return;
    }

    const isValidDrivePattern =
      /\/folders\/[a-zA-Z0-9-_]+/.test(rawFolder) ||
      /[?&]id=[a-zA-Z0-9-_]+/.test(rawFolder) ||
      /^[a-zA-Z0-9-_]{15,}$/.test(rawFolder);

    if (!isValidDrivePattern) {
      setFolderCheck({
        status: 'warning',
        message: 'Amaran: Format pautan folder Google Drive salah atau tidak sah. Gunakan URL seperti https://drive.google.com/drive/folders/...',
        checkedAt,
      });
      return;
    }

    const gasRun = window.google?.script?.run;
    if (gasRun) {
      setFolderCheck({
        status: 'checking',
        message: 'Menyemak kewujudan & kebenaran tulis folder rujukan di Google Drive...',
        checkedAt,
      });
      gasRun
        .withSuccessHandler((res: unknown) => {
          const data = (res || {}) as {
            valid?: boolean;
            folderName?: string;
            message?: string;
            supportsDriveWriteTest?: boolean;
          };
          if (!data.valid) {
            setFolderCheck({
              status: 'warning',
              message: data.message || 'Amaran: Folder rujukan Google Drive tidak dijumpai atau tiada akses.',
              checkedAt: formatTimestampNow(),
            });
            return;
          }
          gasRun
            .withSuccessHandler((writeRes: unknown) => {
              const writeData = (writeRes || {}) as {
                valid?: boolean;
                status?: string;
                message?: string;
              };
              const isOk = writeData.valid !== false && writeData.status !== 'permission_error';
              setFolderCheck({
                status: isOk ? 'valid' : 'warning',
                folderName: data.folderName,
                message: writeData.message || data.message || `Folder "${data.folderName}" disahkan.`,
                checkedAt: formatTimestampNow(),
              });
            })
            .withFailureHandler(() => {
              setFolderCheck({
                status: 'valid',
                folderName: data.folderName,
                message: data.message || `Folder "${data.folderName}" disahkan.`,
                checkedAt: formatTimestampNow(),
              });
            })
            .gasTestDriveWrite(rawFolder);
        })
        .withFailureHandler((err: unknown) => {
          setFolderCheck({
            status: 'warning',
            message: `Gagal menyemak folder melalui Apps Script: ${String(err)}`,
            checkedAt: formatTimestampNow(),
          });
        })
        .gasCheckDriveFolder(rawFolder);
      return;
    }

    const targetGasUrl = gasWebAppUrl.trim() || config.gasWebAppUrl.trim();
    if (!targetGasUrl) {
      setFolderCheck({
        status: 'warning',
        message: 'Amaran: URL Web App GAS diperlukan untuk mengesahkan lokasi folder di Google Drive.',
        checkedAt,
      });
      return;
    }

    setFolderCheck({
      status: 'checking',
      message: 'Menyemak kewujudan folder rujukan di Google Drive...',
      checkedAt,
    });

    try {
      const sep = targetGasUrl.includes('?') ? '&' : '?';
      const url = `${targetGasUrl}${sep}action=checkDriveFolder&folderUrl=${encodeURIComponent(rawFolder)}&t=${Date.now()}`;
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        setFolderCheck({
          status: 'warning',
          message:
            'Amaran: Pelayan GAS belum menggunakan kod terbaharu (action=checkDriveFolder tiada). Sila kemaskini kod GAS daripada tab "Kod GAS" dan buat New Deployment.',
          checkedAt: formatTimestampNow(),
        });
        return;
      }

      const data = (await res.json()) as {
        valid?: boolean;
        folderName?: string;
        message?: string;
        supportsDriveWriteTest?: boolean;
      };

      if (data.valid) {
        let finalMsg = data.message || `Folder rujukan disahkan: "${data.folderName || 'Google Drive'}"`;
        let finalStatus: 'valid' | 'warning' = 'valid';
        if (data.supportsDriveWriteTest) {
          try {
            const writeRes = await fetch(targetGasUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'testDriveWrite', folderUrl: rawFolder }),
            });
            const writeCt = writeRes.headers.get('content-type') || '';
            if (writeCt.includes('application/json')) {
              const writeData = (await writeRes.json()) as {
                valid?: boolean;
                status?: string;
                message?: string;
              };
              if (writeData.status === 'permission_error' || writeData.valid === false) {
                finalStatus = 'warning';
                finalMsg = writeData.message || finalMsg;
              } else if (writeData.valid && writeData.message) {
                finalMsg = writeData.message;
              }
            }
          } catch {
            // Abaikan jika ralat sementara rangkaian
          }
        }
        setFolderCheck({
          status: finalStatus,
          folderName: data.folderName,
          message: finalMsg,
          checkedAt: formatTimestampNow(),
        });
      } else {
        const rawMsg = data.message || '';
        const friendlyMsg =
          rawMsg.includes('You do not have permission') || rawMsg.includes('DriveApp')
            ? 'Ralat Kebenaran DriveApp: Buka Google Apps Script Editor → pilih fungsi "authorizeDriveAndSheets" → klik Run & Allow permissions (atau semak oauthScopes di appsscript.json), kemudian buat New Deployment.'
            : rawMsg || 'Amaran: Folder rujukan Google Drive tidak dijumpai atau salah lokasi.';
        setFolderCheck({
          status: 'warning',
          message: friendlyMsg,
          checkedAt: formatTimestampNow(),
        });
      }
    } catch {
      setFolderCheck({
        status: 'warning',
        message:
          'Amaran: Gagal menyemak lokasi folder Google Drive. Sila pastikan skrip GAS terkini telah di-deploy dan mempunyai kebenaran DriveApp.',
        checkedAt: formatTimestampNow(),
      });
    }
  };

  const handleSave = () => {
    onSaveConfig({
      startDate: startDate || config.startDate,
      endDate: endDate || config.endDate,
      closingDate: closingDate || config.closingDate,
      forceStatus: forceStatus || 'AUTO',
      svName: svName.trim() || 'En. Ravi',
      recordSpreadsheetUrl: recordSpreadsheetUrl.trim(),
      gasWebAppUrl: gasWebAppUrl.trim(),
      approvalFolderUrl: approvalFolderUrl.trim(),
      enableSaveNotification,
      logoUrl: logoUrl.trim() || config.logoUrl,
      tajuk1: tajuk1.trim() || 'Unit PRPA HTAR',
      footerText: footerText.trim() || 'Hak Cipta Terpelihara © 2026',
      appVersion: normalizeAppVersion(appVersion, '3.0'),
      editionName: editionName.trim() || 'Edisi Terkini Dis 2026',
      versionUpdatedAt: versionUpdatedAt.trim() || 'Disember 2026',
    });
  };

  const handleExportCsv = () => {
    if (records.length === 0) return;
    const latestSheetDateCols =
      records[0]?.sheetDateColumns && records[0].sheetDateColumns.length > 0
        ? records[0].sheetDateColumns
        : records[0]?.dateColumns || [];

    const headers = [
      'Timestamp',
      'Email Address',
      'PERINGATAN PENTING ',
      'NAMA PEMOHON ',
      ...latestSheetDateCols,
      'Surat Kelulusan',
    ];
    const escapeCsv = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = records.map((r) => [
      r.timestamp,
      r.email,
      'FAHAM & DISAHKAN',
      r.namaPemohon,
      ...latestSheetDateCols.map((_, idx) => r.orderedShifts[idx] || ''),
      r.suratKelulusan,
    ]);
    const csvContent = [headers.map(escapeCsv).join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekod_Permohonan_PPP_U5_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resolvedGasCode = buildGasCode(approvalFolderUrl);

  const copyTextSafely = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback ke execCommand apabila sekatan iframe berlaku
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  };

  const handleCopyGasCode = async () => {
    const ok = await copyTextSafely(resolvedGasCode);
    setCopiedGas(ok);
    if (ok) setTimeout(() => setCopiedGas(false), 2000);
  };

  const fetchSingleFileHtml = async (): Promise<string> => {
    setHtmlExportError('');
    if (cachedIndexHtml) {
      return cachedIndexHtml;
    }
    if (window.google?.script?.run) {
      const docHtml = `<!DOCTYPE html>\n${document.documentElement.outerHTML}`;
      setCachedIndexHtml(docHtml);
      return docHtml;
    }
    setIsLoadingHtml(true);
    try {
      const res = await fetch(`/appsscript-index.html?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Fail binaan tunggal Index.html belum tersedia.');
      }
      const htmlText = await res.text();
      if (htmlText.length < 150000 || new RegExp('\\x3cscript[^>]+src=["\']/src/').test(htmlText)) {
        throw new Error(
          'Pelayan pembangunan sedang menyediakan binaan tunggal. Sila tunggu beberapa saat atau cuba klik sekali lagi.'
        );
      }
      setCachedIndexHtml(htmlText);
      return htmlText;
    } finally {
      setIsLoadingHtml(false);
    }
  };

  const triggerHtmlFileDownload = (htmlText: string) => {
    const blob = new Blob([htmlText], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Index.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadIndexHtml = async () => {
    try {
      const htmlText = cachedIndexHtml || (await fetchSingleFileHtml());
      triggerHtmlFileDownload(htmlText);
    } catch (err) {
      setHtmlExportError(err instanceof Error ? err.message : 'Gagal memuat turun Index.html.');
    }
  };

  const handleCopyIndexHtml = async () => {
    try {
      const htmlText = cachedIndexHtml || (await fetchSingleFileHtml());
      const ok = await copyTextSafely(htmlText);
      if (ok) {
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 2500);
      } else {
        setShowHtmlManualBox(true);
        setHtmlExportError(
          'Pelayar menyekat salinan papan klip automatik dalam bingkai pratonton. Sila salin secara manual daripada kotak kod di bawah atau gunakan butang Muat Turun Index.html.'
        );
      }
    } catch (err) {
      setCopiedHtml(false);
      setHtmlExportError(err instanceof Error ? err.message : 'Gagal menyalin kod Index.html.');
    }
  };

  const getPdfFileName = () => {
    const safeVer = normalizeAppVersion(appVersion.trim() || config.appVersion, '3.0').replace(/[^a-zA-Z0-9._-]/g, '_');
    return `Panduan_Pengguna_PPPU5_v${safeVer}.pdf`;
  };

  const getEffectiveGuidelineConfig = (): AppConfig => ({
    ...config,
    tajuk1: tajuk1.trim() || config.tajuk1,
    footerText: footerText.trim() || config.footerText,
    appVersion: normalizeAppVersion(appVersion.trim() || config.appVersion, '3.0'),
    editionName: editionName.trim() || config.editionName,
    versionUpdatedAt: versionUpdatedAt.trim() || config.versionUpdatedAt,
    svName: svName.trim() || config.svName,
    startDate: startDate || config.startDate,
    endDate: endDate || config.endDate,
  });

  const triggerPdfBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleDownloadUserGuidelinePdf = () => {
    setIsGeneratingPdf(true);
    setPdfFeedback(null);
    try {
      const effectiveCfg = getEffectiveGuidelineConfig();
      const pdfBlob = generateUserGuidelinePdfBlob(effectiveCfg);
      const filename = getPdfFileName();
      triggerPdfBlobDownload(pdfBlob, filename);
      setPdfFeedback({
        type: 'success',
        message: `Fail "${filename}" berjaya dijana dan dimuat turun untuk edaran kepada pengguna (User).`,
      });
    } catch (err) {
      setPdfFeedback({
        type: 'info',
        message: `Gagal menjana fail PDF: ${err instanceof Error ? err.message : 'Ralat tidak diketahui.'}`,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareUserGuidelinePdf = async () => {
    setIsGeneratingPdf(true);
    setPdfFeedback(null);
    try {
      const effectiveCfg = getEffectiveGuidelineConfig();
      const pdfBlob = generateUserGuidelinePdfBlob(effectiveCfg);
      const filename = getPdfFileName();
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      const navWithShare = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
        share?: (data?: ShareData) => Promise<void>;
      };

      if (
        typeof navWithShare.share === 'function' &&
        typeof navWithShare.canShare === 'function' &&
        navWithShare.canShare({ files: [pdfFile] })
      ) {
        await navWithShare.share({
          title: `Panduan Pengguna PPP U5 (Versi ${normalizeAppVersion(effectiveCfg.appVersion, '3.0')})`,
          text: 'Sila rujuk fail PDF Panduan Pengguna (User Guideline) Permohonan Jadual Tugas PPP U5.',
          files: [pdfFile],
        });
        setPdfFeedback({
          type: 'success',
          message: `Fail PDF "${filename}" berjaya dikongsi.`,
        });
        return;
      }

      // Fallback untuk pelayar / iframe desktop yang tidak menyokong perkongsian fail terus
      triggerPdfBlobDownload(pdfBlob, filename);
      const shareSummary = buildUserGuidelineShareSummary(effectiveCfg);
      await copyTextSafely(shareSummary);
      setPdfFeedback({
        type: 'info',
        message: `Fail PDF "${filename}" telah dimuat turun secara automatik (dan ringkasan disalin ke papan klip). Pelayar/bingkai semasa tidak menyokong tetingkap kongsi fail terus — sila lampirkan fail PDF yang dimuat turun ke WhatsApp, Telegram atau E-mel.`,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const effectiveCfg = getEffectiveGuidelineConfig();
      const pdfBlob = generateUserGuidelinePdfBlob(effectiveCfg);
      const filename = getPdfFileName();
      triggerPdfBlobDownload(pdfBlob, filename);
      setPdfFeedback({
        type: 'info',
        message: `Fail PDF "${filename}" telah dimuat turun supaya anda boleh melampirkannya terus ke WhatsApp atau E-mel.`,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2.5 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adminModalTitle"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 border border-slate-200 shadow-2xl space-y-4 sm:space-y-5 my-2 sm:my-8 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 sticky top-0 bg-white z-10 -mx-4 px-4 sm:-mx-6 sm:px-6 pt-1">
          <div className="flex items-center gap-2 text-sky-700 min-w-0">
            <Settings className="w-5 h-5 shrink-0" />
            <h3 id="adminModalTitle" className="text-base sm:text-lg font-bold text-slate-900 truncate">
              Log Masuk &amp; Tetapan Admin
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel admin"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!adminUser ? (
          <form onSubmit={handleCodeLogin} className="py-4 sm:py-6 max-w-md mx-auto space-y-4 sm:space-y-5 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto">
              <KeyRound className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-lg sm:text-xl font-bold text-slate-900">Pengesahan Kod Akses Admin</h4>
              <p className="text-xs sm:text-sm text-slate-600">
                Sila masukkan kod akses pentadbir untuk membuka papan pemuka tetapan dan semakan sambungan Google Sheet.
              </p>
            </div>

            <div className="space-y-3 text-left">
              <label htmlFor="adminAccessCodeInput" className="block text-xs font-semibold text-slate-700">
                Kod Akses Admin
              </label>
              <input
                id="adminAccessCodeInput"
                type="password"
                value={accessCodeInput}
                onChange={(e) => {
                  setAccessCodeInput(e.target.value);
                  setLoginError('');
                }}
                placeholder="Masukkan kod akses..."
                autoFocus
                required
                className="w-full text-sm px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono-tabular tracking-wider min-h-[44px]"
              />
              {loginError && (
                <p role="alert" className="text-xs text-red-600 font-semibold">
                  {loginError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-xl shadow-sm transition-colors text-sm"
            >
              Sahkan Kod &amp; Masuk
            </button>
          </form>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-sky-600 text-white font-bold rounded-full flex items-center justify-center shrink-0">
                  A
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{adminUser.name}</p>
                  <p className="text-xs text-slate-500 truncate">{adminUser.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-semibold text-emerald-700">Disahkan</span>
                <button
                  type="button"
                  onClick={() => setAdminUser(null)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 underline"
                >
                  Log Keluar
                </button>
              </div>
            </div>

            {/* Navigasi Panel Admin */}
            <nav
              aria-label="Navigasi Panel Admin"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 p-1.5 bg-slate-100 rounded-xl"
            >
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`px-2 py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 min-h-[38px] ${
                  activeTab === 'form'
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Tetapan Borang</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('system')}
                className={`px-2 py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 min-h-[38px] ${
                  activeTab === 'system'
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Tetapan Sistem</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('records')}
                className={`px-2 py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 min-h-[38px] tabular-nums ${
                  activeTab === 'records'
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Rekod ({records.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('gas')}
                className={`px-2 py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 min-h-[38px] ${
                  activeTab === 'gas'
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Kod Script G.A.S</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('guideline')}
                className={`px-2 py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 min-h-[38px] ${
                  activeTab === 'guideline'
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">User Guideline</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('about')}
                className={`px-2 py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 min-h-[38px] ${
                  activeTab === 'about'
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">About</span>
              </button>
            </nav>

            {/* 1. TETAPAN BORANG */}
            {activeTab === 'form' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 sm:p-4 space-y-4">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Tetapan Borang &amp; Tempoh Tugasan
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="adminStartDate" className="block text-xs font-semibold text-slate-700 mb-1">
                        Tarikh Mula Tugasan
                      </label>
                      <input
                        id="adminStartDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none tabular-nums min-h-[42px]"
                      />
                    </div>
                    <div>
                      <label htmlFor="adminEndDate" className="block text-xs font-semibold text-slate-700 mb-1">
                        Tarikh Tamat Tugasan
                      </label>
                      <input
                        id="adminEndDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none tabular-nums min-h-[42px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="adminSvName" className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Penyelia (SV) Incaj
                      </label>
                      <input
                        id="adminSvName"
                        type="text"
                        value={svName}
                        onChange={(e) => setSvName(e.target.value)}
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none min-h-[42px]"
                      />
                    </div>
                    <div>
                      <label htmlFor="adminClosingDate" className="block text-xs font-semibold text-slate-700 mb-1">
                        Tarikh Tamat Borang (Tarikh Tutup)
                      </label>
                      <input
                        id="adminClosingDate"
                        type="date"
                        value={closingDate}
                        onChange={(e) => setClosingDate(e.target.value)}
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none tabular-nums min-h-[42px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="adminForceStatus" className="block text-xs font-semibold text-slate-700 mb-1">
                      Aktifkan Borang / Status Paparan Borang
                    </label>
                    <select
                      id="adminForceStatus"
                      value={forceStatus}
                      onChange={(e) => setForceStatus(e.target.value as ForceStatus)}
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none min-h-[42px]"
                    >
                      <option value="AUTO">Automatik (Mengikut Tarikh Tamat Borang)</option>
                      <option value="OPEN">Aktifkan Borang (Paksa BUKA)</option>
                      <option value="CLOSED">Tutup Borang (Paksa TUTUP)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full min-h-[44px] bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-xl shadow-sm transition-colors text-xs sm:text-sm"
                >
                  Simpan Tetapan Borang
                </button>
              </div>
            )}

            {/* 2. TETAPAN SISTEM */}
            {activeTab === 'system' && (
              <div className="space-y-4">
                {/* Pautan URL Sistem */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 sm:p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Pautan URL Sistem
                  </h4>

                  <div>
                    <label htmlFor="adminRecordSheetUrl" className="block text-xs font-semibold text-slate-700 mb-1">
                      Pautan URL Rekod Google Sheets
                    </label>
                    <input
                      id="adminRecordSheetUrl"
                      type="text"
                      value={recordSpreadsheetUrl}
                      onChange={(e) => setRecordSpreadsheetUrl(e.target.value)}
                      placeholder="Kosongkan untuk guna Active Sheet daripada Google Apps Script"
                      className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none min-h-[40px]"
                    />
                  </div>

                  <div>
                    <label htmlFor="adminGasWebAppUrl" className="block text-xs font-semibold text-slate-700 mb-1">
                      URL Web App Google Apps Script (/exec)
                    </label>
                    <input
                      id="adminGasWebAppUrl"
                      type="url"
                      value={gasWebAppUrl}
                      onChange={(e) => setGasWebAppUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none min-h-[40px]"
                    />
                  </div>

                  <div>
                    <label htmlFor="adminLogoUrl" className="block text-xs font-semibold text-slate-700 mb-1">
                      Pautan URL Logo / Banner
                    </label>
                    <input
                      id="adminLogoUrl"
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none min-h-[40px]"
                    />
                  </div>
                </div>

                {/* Pautan Folder Kelulusan & Semak Folder */}
                <div className="rounded-xl border border-slate-200 p-3.5 sm:p-4 space-y-2.5 bg-slate-50/50">
                  <label htmlFor="adminApprovalFolderUrl" className="block text-xs font-bold text-slate-800">
                    Pautan Folder Google Drive Surat Kelulusan
                  </label>
                  <input
                    id="adminApprovalFolderUrl"
                    type="text"
                    value={approvalFolderUrl}
                    onChange={(e) => {
                      setApprovalFolderUrl(e.target.value);
                      setFolderCheck({ status: 'idle', message: '', checkedAt: '' });
                    }}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none min-h-[40px]"
                  />

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 pt-0.5">
                    <button
                      type="button"
                      onClick={handleCheckDriveFolder}
                      disabled={folderCheck.status === 'checking'}
                      className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <FolderCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>{folderCheck.status === 'checking' ? 'Menyemak...' : 'Semak Folder'}</span>
                    </button>

                    <div
                      className={`flex-1 min-w-0 rounded-lg border px-2.5 py-1.5 text-[11px] flex items-center gap-1.5 ${
                        folderCheck.status === 'valid'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : folderCheck.status === 'checking'
                            ? 'bg-sky-50 border-sky-200 text-sky-900'
                            : folderCheck.status === 'warning'
                              ? 'bg-amber-50 border-amber-300 text-amber-900'
                              : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      {folderCheck.status === 'valid' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : folderCheck.status === 'warning' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      ) : (
                        <FolderCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate font-medium" title={folderCheck.message || 'Belum disemak.'}>
                        {folderCheck.message || 'Belum disemak.'}
                        {folderCheck.checkedAt ? ` (${folderCheck.checkedAt})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Semakan Sambungan ke Google Sheets (Butang Uji Kecil + Keputusan Di Sebelah) */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 sm:p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-600 shrink-0" />
                    <h4 className="text-xs font-bold text-slate-800">
                      Semakan Sambungan ke Google Sheets
                    </h4>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleCheckConnection}
                      disabled={connectionCheck.status === 'checking'}
                      className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 shrink-0 ${connectionCheck.status === 'checking' ? 'animate-spin' : ''}`}
                      />
                      <span>{connectionCheck.status === 'checking' ? 'Menguji...' : 'Uji Sambungan'}</span>
                    </button>

                    <div
                      className={`flex-1 min-w-0 rounded-lg border px-2.5 py-1.5 text-[11px] flex items-center gap-1.5 ${
                        connectionCheck.status === 'connected'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : connectionCheck.status === 'error'
                            ? 'bg-red-50 border-red-200 text-red-900'
                            : connectionCheck.status === 'checking'
                              ? 'bg-sky-50 border-sky-200 text-sky-900'
                              : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      {connectionCheck.status === 'connected' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : connectionCheck.status === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      ) : (
                        <Activity className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span
                        className="truncate font-medium"
                        title={
                          connectionCheck.message +
                          (connectionCheck.checkedAt ? ` (${connectionCheck.checkedAt})` : '')
                        }
                      >
                        {connectionCheck.message}
                        {connectionCheck.latencyMs !== null && connectionCheck.status !== 'checking'
                          ? ` · ${connectionCheck.latencyMs} ms`
                          : ''}
                        {connectionCheck.checkedAt ? ` · ${connectionCheck.checkedAt}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Toggle Notifikasi "Data Telah Disimpan" */}
                <div className="rounded-xl border border-slate-200 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                  <div className="flex items-start gap-2.5">
                    <Bell className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Notifikasi Laman Web: &ldquo;Data Telah Disimpan&rdquo;
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Aktifkan atau nyahaktifkan paparan tetingkap notifikasi selepas data direkodkan.
                      </p>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl shrink-0">
                    <button
                      type="button"
                      onClick={() => setEnableSaveNotification(true)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap text-center ${
                        enableSaveNotification
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Aktif
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnableSaveNotification(false)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap text-center ${
                        !enableSaveNotification
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tidak Aktif
                    </button>
                  </div>
                </div>

                {/* Kemaskini Versi, Tajuk 1 & Footer Paparan Web */}
                <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-3.5 sm:p-4 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                      Kemaskini Versi &amp; Paparan Web (Header / Footer)
                    </h4>
                    <span className="text-[11px] font-bold text-sky-800 bg-white border border-sky-200 px-2 py-0.5 rounded-md tabular-nums">
                      Versi {normalizeAppVersion(appVersion, '3.0')}
                    </span>
                  </div>

                  {/* 1. Tajuk 1 dan Footer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="adminTajuk1" className="block text-xs font-semibold text-slate-700 mb-1">
                        Tajuk 1 (Subtajuk Header Web)
                      </label>
                      <input
                        id="adminTajuk1"
                        type="text"
                        value={tajuk1}
                        onChange={(e) => setTajuk1(e.target.value)}
                        placeholder="Unit PRPA HTAR"
                        className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none min-h-[40px]"
                      />
                    </div>
                    <div>
                      <label htmlFor="adminFooterText" className="block text-xs font-semibold text-slate-700 mb-1">
                        Teks Footer (Hak Cipta)
                      </label>
                      <input
                        id="adminFooterText"
                        type="text"
                        value={footerText}
                        onChange={(e) => setFooterText(e.target.value)}
                        placeholder="Hak Cipta Terpelihara © 2026"
                        className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none min-h-[40px]"
                      />
                    </div>
                  </div>

                  {/* 2. Kemaskini Versi, Tarikh/Bulan Kemaskini, Nama Edisi */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="adminAppVersion" className="block text-xs font-semibold text-slate-700 mb-1">
                        Kemaskini Versi
                      </label>
                      <input
                        id="adminAppVersion"
                        type="text"
                        value={appVersion}
                        onChange={(e) => setAppVersion(e.target.value)}
                        placeholder="3.0"
                        className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono-tabular min-h-[40px]"
                      />
                    </div>
                    <div>
                      <label htmlFor="adminVersionUpdatedAt" className="block text-xs font-semibold text-slate-700 mb-1">
                        Tarikh / Bulan Kemaskini
                      </label>
                      <input
                        id="adminVersionUpdatedAt"
                        type="text"
                        value={versionUpdatedAt}
                        onChange={(e) => setVersionUpdatedAt(e.target.value)}
                        placeholder="Disember 2026"
                        className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none min-h-[40px]"
                      />
                    </div>
                    <div>
                      <label htmlFor="adminEditionName" className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Edisi
                      </label>
                      <input
                        id="adminEditionName"
                        type="text"
                        value={editionName}
                        onChange={(e) => setEditionName(e.target.value)}
                        placeholder="Edisi Terkini Dis 2026"
                        className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none min-h-[40px]"
                      />
                    </div>
                  </div>

                  {/* Pratonton Paparan Web */}
                  <div className="rounded-lg border border-sky-200/80 bg-white p-3 space-y-1.5 text-[11px]">
                    <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                      Pratonton Paparan Web:
                    </p>
                    <div className="text-center border-b border-slate-100 pb-2">
                      <p className="font-semibold text-slate-700">{tajuk1.trim() || 'Unit PRPA HTAR'}</p>
                      <p className="font-bold text-sky-800">
                        Versi {normalizeAppVersion(appVersion, '3.0')}
                        {(editionName.trim() || 'Edisi Terkini Dis 2026')
                          ? ` (${editionName.trim() || 'Edisi Terkini Dis 2026'})`
                          : ''}
                      </p>
                    </div>
                    <div className="text-center pt-1 text-slate-500 space-y-0.5">
                      <p className="text-[9.5px] sm:text-[11px] whitespace-nowrap overflow-x-auto">
                        {footerText.trim() || 'Hak Cipta Terpelihara © 2026'},{' '}
                        <span className="font-semibold text-slate-700">
                          PPPU5 Roster Management System &bull; Versi {normalizeAppVersion(appVersion, '3.0')}
                        </span>
                      </p>
                      <p>Kemaskini Terakhir : {versionUpdatedAt.trim() || 'Disember 2026'}.</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="inline-flex items-center justify-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white font-semibold py-2 px-4 rounded-xl text-xs shadow-xs transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                      <span>Kemaskini Versi &amp; Paparan</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full min-h-[44px] bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-xl shadow-sm transition-colors text-xs sm:text-sm"
                >
                  Simpan Tetapan Sistem
                </button>
              </div>
            )}

            {activeTab === 'records' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <p className="text-xs text-slate-600">
                    Eksport CSV dijana mengikut susunan lajur helaian terkini (Timestamp, Email Address, PERINGATAN PENTING, NAMA PEMOHON, Date: D/M/YYYY, Surat Kelulusan).
                  </p>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      disabled={records.length === 0}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-sky-50 hover:bg-sky-100 disabled:opacity-40 text-sky-700 px-3 py-2 rounded-lg border border-sky-200 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Muat Turun CSV</span>
                    </button>
                    {records.length > 0 && (
                      <button
                        type="button"
                        onClick={onClearRecords}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg border border-red-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Padam Semua</span>
                      </button>
                    )}
                  </div>
                </div>

                {records.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-8 text-center">
                    <p className="text-sm font-semibold text-slate-700">Tiada rekod permohonan lagi</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Sebarang permohonan yang dihantar melalui borang akan dipaparkan di sini.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {records.map((rec) => {
                        const chosenCount = rec.orderedShifts.filter(Boolean).length;
                        return (
                          <div key={rec.id} className="p-3.5 bg-white hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{rec.namaPemohon}</p>
                                <p className="text-xs text-slate-500 mt-0.5 tabular-nums break-words">
                                  {rec.tempohTugasan} · {rec.email} · {rec.noTelefon}
                                </p>
                                <p className="text-xs text-sky-700 font-medium mt-1 tabular-nums truncate">
                                  {chosenCount} tarikh syif diisi
                                  {rec.suratKelulusan ? ` · Surat: ${rec.suratKelulusan}` : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => onDeleteRecord(rec.id)}
                                aria-label={`Padam rekod ${rec.namaPemohon}`}
                                className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg transition-colors shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'gas' && (
              <div className="space-y-4">
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 sm:p-4 space-y-2 text-xs text-sky-900">
                  <p className="font-bold">Penyelarasan Kod Google Apps Script (Code.gs) Terkini:</p>
                  <ul className="list-disc pl-4 space-y-1 text-sky-800">
                    <li>
                      <strong>Semakan &amp; Muat Naik Folder Drive</strong>: <span className="font-mono-tabular">checkDriveFolder</span> dan <span className="font-mono-tabular">saveApprovalFileToDrive</span> menyemak kewujudan folder rujukan dan menyimpan fail Surat Kelulusan ke subfolder mengikut Tempoh Tugasan.
                    </li>
                    <li>
                      <strong>Simpan Pautan Fail ke Sheet</strong>: Pautan fail Google Drive disimpan terus ke lajur <span className="font-mono-tabular">Surat Kelulusan</span> pada helaian tempoh berkenaan.
                    </li>
                    <li>
                      <strong>Auto-Cipta Database &lsquo;Senarai Nama PPPU5&rsquo;</strong>: Mencipta helaian <span className="font-mono-tabular">Senarai Nama PPPU5</span> secara automatik dengan header <span className="font-mono-tabular">Email</span>, <span className="font-mono-tabular">Nama</span>, <span className="font-mono-tabular">No Telefon</span> (atau jalankan <span className="font-mono-tabular">setupSenaraiNamaPPPU5()</span>). Menyemak nombor telefon melalui <span className="font-mono-tabular">gasLookupStaffPhone</span> dan auto-simpan/kemaskini rekod (<span className="font-mono-tabular">Email, Nama, No Telefon</span>) secara automatik semasa borang dihantar tanpa mengubah susunan lajur helaian jadual tugasan.
                    </li>
                    <li>
                      <strong>Pengesanan Emel Sejarah Pelayar (Gaya Google Forms)</strong>: Borang mengesan dan mengingati emel daripada sejarah pelayar/autofill pengguna sendiri (bukan emel log masuk Admin GAS) untuk dipaparkan dengan kotak tanda <em>Gunakan emel ini</em> serta pilihan tukar akaun.
                    </li>
                    <li>
                      <strong>Notifikasi Backend &ldquo;Data Telah Disimpan&rdquo;</strong>: Respons JSON memulangkan <span className="font-mono-tabular">notifyUser</span> mengikut tetapan Admin (<span className="font-mono-tabular">Aktif / Tidak Aktif</span>).
                    </li>
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 sm:p-4 space-y-2 text-xs text-amber-950">
                  <p className="font-bold">Bahagian Kod yang Perlu Ditukar untuk Link Folder Surat Kelulusan:</p>
                  <p className="text-amber-900 leading-relaxed">
                    Tukar nilai pada pemboleh ubah{' '}
                    <code className="bg-amber-200/80 text-amber-950 px-1.5 py-0.5 rounded font-mono-tabular font-bold break-all">
                      DEFAULT_APPROVAL_FOLDER_URL
                    </code>{' '}
                    di bahagian atas <span className="font-mono-tabular font-semibold">Code.gs</span> (ditanda warna kuning di bawah), atau masukkan terus melalui medan <strong>Pautan Folder Google Drive Surat Kelulusan</strong> di tab Tetapan Sistem sebelum menyalin kod ini.
                  </p>
                  <pre className="bg-slate-900 text-amber-300 rounded-lg px-3 py-2 text-[11px] font-mono-tabular overflow-x-auto">
                    {`var DEFAULT_APPROVAL_FOLDER_URL = "${(approvalFolderUrl || '').trim() || 'https://drive.google.com/drive/folders/ID_FOLDER_ANDA'}";`}
                  </pre>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 sm:p-4 space-y-2 text-xs text-red-950">
                  <p className="font-bold">Jika Ralat Kebenaran &ldquo;DriveApp.getFolderById&rdquo; atau &ldquo;DriveApp.Folder.createFile&rdquo; Berlaku:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-red-900 leading-relaxed">
                    <li>
                      Pastikan anda telah menyalin kod <code className="bg-red-100 px-1 py-0.5 rounded font-mono-tabular font-bold">Code.gs</code> terkini (yang mempunyai ujian tulis dalam <code className="bg-red-100 px-1 py-0.5 rounded font-mono-tabular font-bold">authorizeDriveAndSheets</code>), pilih fungsi itu di bar atas Editor, dan klik <strong>Run</strong> → <strong>Review permissions</strong> → <strong>Allow</strong>.
                    </li>
                    <li>
                      Jika masih gagal memuat naik, buka <strong>Project Settings</strong> → tanda <em>Show &ldquo;appsscript.json&rdquo; manifest file in editor</em>, dan pastikan <code className="bg-red-100 px-1 py-0.5 rounded font-mono-tabular">oauthScopes</code> menggunakan skop penuh <code className="bg-red-100 px-1 py-0.5 rounded font-mono-tabular break-all">https://www.googleapis.com/auth/drive</code> (bukan <code className="bg-red-100 px-1 py-0.5 rounded font-mono-tabular">drive.readonly</code>):
                    </li>
                  </ol>
                  <pre className="bg-slate-900 text-emerald-300 rounded-lg px-3 py-2 text-[11px] font-mono-tabular overflow-x-auto">{`"oauthScopes": [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/script.send_mail"
]`}</pre>
                  <p className="text-red-900">
                    Selepas lulus kebenaran penuh Drive, klik <strong>Deploy → New deployment</strong> dan uji semula menggunakan butang <strong>Semak Folder</strong>.
                  </p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 sm:p-4 space-y-2.5 text-xs text-emerald-950">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold">Deploy Terus HTML di dalam Google Apps Script (Code.gs + Index.html):</p>
                    {cachedIndexHtml ? (
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md tabular-nums">
                        Sedia ({Math.round(cachedIndexHtml.length / 1024)} KB)
                      </span>
                    ) : isLoadingHtml ? (
                      <span className="text-[11px] font-semibold text-sky-700">Menyediakan fail...</span>
                    ) : null}
                  </div>
                  <p className="text-emerald-900 leading-relaxed">
                    Untuk membuka borang terus daripada URL Google Apps Script tanpa bergantung kepada laman luar (atau apabila disalin ke akaun Google lain), muat turun / salin fail tunggal <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono-tabular font-bold">Index.html</code> dan cipta fail HTML bernama <strong>Index</strong> di dalam Apps Script Editor.
                  </p>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isLoadingHtml}
                      onClick={handleDownloadIndexHtml}
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>{isLoadingHtml ? 'Menyediakan...' : 'Muat Turun Index.html'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isLoadingHtml}
                      onClick={handleCopyIndexHtml}
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-white hover:bg-emerald-100 disabled:opacity-60 text-emerald-900 border border-emerald-300 px-4 py-2.5 rounded-xl transition-colors"
                    >
                      {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                      <span>{copiedHtml ? 'Kod Index.html Disalin!' : 'Salin Kod Index.html'}</span>
                    </button>
                    {cachedIndexHtml && (
                      <button
                        type="button"
                        onClick={() => setShowHtmlManualBox((prev) => !prev)}
                        className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-2.5 rounded-xl transition-colors"
                      >
                        <span>{showHtmlManualBox ? 'Tutup Paparan Kod' : 'Papar Kod Manual'}</span>
                      </button>
                    )}
                  </div>
                  {showHtmlManualBox && cachedIndexHtml && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] font-semibold text-emerald-900">
                        Klik di dalam kotak di bawah → tekan <kbd className="px-1 py-0.5 bg-white border border-emerald-300 rounded">Ctrl+A</kbd> → <kbd className="px-1 py-0.5 bg-white border border-emerald-300 rounded">Ctrl+C</kbd> untuk salin semua kod <span className="font-mono-tabular">Index.html</span>:
                      </p>
                      <textarea
                        readOnly
                        value={cachedIndexHtml}
                        onFocus={(e) => e.currentTarget.select()}
                        rows={5}
                        className="w-full text-[11px] font-mono-tabular bg-slate-900 text-emerald-200 rounded-lg p-2.5 border border-emerald-300 focus:outline-none"
                      />
                    </div>
                  )}
                  {htmlExportError && (
                    <p role="alert" className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                      {htmlExportError}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleCopyGasCode}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl transition-colors"
                  >
                    {copiedGas ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                    <span>{copiedGas ? 'Kod GAS Disalin!' : 'Salin Kod GAS Lengkap (Code.gs)'}</span>
                  </button>
                </div>

                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 text-[11px] font-mono-tabular overflow-x-auto max-h-80 overflow-y-auto leading-relaxed">
                  {resolvedGasCode.split('\n').map((line, idx) => {
                    const isHighlighted =
                      line.includes('DEFAULT_APPROVAL_FOLDER_URL') ||
                      line.includes('TUKAR DI SINI') ||
                      line.includes('SEMAK DI SINI') ||
                      line.includes('var folderReferenceUrl');
                    return (
                      <div
                        key={idx}
                        className={
                          isHighlighted
                            ? 'bg-amber-400/20 text-amber-200 font-semibold px-2 -mx-2 rounded'
                            : 'whitespace-pre'
                        }
                      >
                        <span className="inline-block w-8 select-none text-slate-500 text-right pr-3 tabular-nums">
                          {idx + 1}
                        </span>
                        <span className="whitespace-pre">{line || ' '}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. USER GUIDELINE (A. ADMIN & B. USER) */}
            {activeTab === 'guideline' && (
              <div className="space-y-4">
                {/* Ringkasan & Penukar Akses */}
                <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 sm:p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                        Panduan Penggunaan Sistem (User Guideline)
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Panduan lengkap dari awal hingga akhir mengikut tahap akses: <strong>A. Pentadbir (Admin)</strong> &amp; <strong>B. Pengguna (User)</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Pilihan Sub-Panduan A. Admin vs B. User */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGuidelineRole('user');
                        setPdfFeedback(null);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 ${
                        guidelineRole === 'user'
                          ? 'bg-white border-emerald-400 ring-1 ring-emerald-300 shadow-xs'
                          : 'bg-white/70 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">B. Panduan Pengguna (User)</p>
                          <p className="text-[11px] text-emerald-700 font-medium truncate">
                            Boleh Muat Turun &amp; Kongsi PDF
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setGuidelineRole('admin');
                        setPdfFeedback(null);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 ${
                        guidelineRole === 'admin'
                          ? 'bg-white border-sky-400 ring-1 ring-sky-300 shadow-xs'
                          : 'bg-white/70 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">A. Panduan Pentadbir (Admin)</p>
                          <p className="text-[11px] text-sky-700 font-medium truncate">
                            Kekal Dalam Sistem Sahaja
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* B. PANDUAN PENGGUNA (USER) — BOLEH MUAT TURUN & KONGSI PDF */}
                {guidelineRole === 'user' && (
                  <div className="space-y-3.5">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div>
                          <p className="text-xs font-bold text-emerald-950">
                            Edaran PDF Panduan Pengguna (User Sahaja)
                          </p>
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            Muat turun atau kongsi panduan ini sebagai fail PDF untuk diedarkan kepada staf PPP U5.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={isGeneratingPdf}
                            onClick={handleDownloadUserGuidelinePdf}
                            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white px-3.5 py-2 rounded-xl transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 shrink-0" />
                            <span>Muat Turun PDF</span>
                          </button>
                          <button
                            type="button"
                            disabled={isGeneratingPdf}
                            onClick={() => void handleShareUserGuidelinePdf()}
                            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-white hover:bg-emerald-100 disabled:opacity-60 text-emerald-900 border border-emerald-300 px-3.5 py-2 rounded-xl transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Kongsi PDF</span>
                          </button>
                          <a
                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                              buildUserGuidelineShareSummary(getEffectiveGuidelineConfig())
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-2 rounded-xl transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>

                      {pdfFeedback && (
                        <div
                          role="status"
                          className={`rounded-lg border px-3 py-2 text-[11px] font-medium leading-relaxed ${
                            pdfFeedback.type === 'success'
                              ? 'bg-white border-emerald-300 text-emerald-900'
                              : 'bg-sky-50 border-sky-200 text-sky-900'
                          }`}
                        >
                          {pdfFeedback.message}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                      {USER_GUIDELINE_SECTIONS.map((sec) => (
                        <div
                          key={sec.stepNumber}
                          className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                              {sec.stepNumber}
                            </span>
                            <div className="min-w-0">
                              <h5 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                {sec.title}
                              </h5>
                              <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-relaxed">
                                {sec.summary}
                              </p>
                            </div>
                          </div>
                          <ul className="list-disc pl-8 space-y-1 text-xs text-slate-700 leading-relaxed">
                            {sec.bullets.map((b, bIdx) => (
                              <li key={bIdx}>{b}</li>
                            ))}
                          </ul>
                          {sec.importantNote && (
                            <div className="ml-8 rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-2 text-[11px] font-medium text-amber-900 flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span>{sec.importantNote}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* A. PANDUAN PENTADBIR (ADMIN) — KEKAL DALAM SISTEM SAHAJA */}
                {guidelineRole === 'admin' && (
                  <div className="space-y-3.5">
                    <div className="rounded-xl border border-slate-300 bg-slate-100/80 p-3.5 flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-700 leading-relaxed">
                        <p className="font-bold text-slate-900">
                          Panduan Akses Pentadbir (Kekal Dalam Sistem Sahaja)
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Dokumen ini khusus untuk rujukan dalaman Pentadbir Sistem melalui Panel Admin dan tidak disediakan untuk muat turun atau kongsi PDF.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                      {ADMIN_GUIDELINE_SECTIONS.map((sec) => (
                        <div
                          key={sec.stepNumber}
                          className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-sky-700 text-white text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                              A{sec.stepNumber}
                            </span>
                            <div className="min-w-0">
                              <h5 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                {sec.title}
                              </h5>
                              <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-relaxed">
                                {sec.summary}
                              </p>
                            </div>
                          </div>
                          <ul className="list-disc pl-8 space-y-1 text-xs text-slate-700 leading-relaxed">
                            {sec.bullets.map((b, bIdx) => (
                              <li key={bIdx}>{b}</li>
                            ))}
                          </ul>
                          {sec.importantNote && (
                            <div className="ml-8 rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-2 text-[11px] font-medium text-amber-900 flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span>{sec.importantNote}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. ABOUT SISTEM */}
            {activeTab === 'about' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                        PERMOHONAN JADUAL TUGAS PPP U5
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {config.tajuk1 || 'Unit PRPA HTAR'} · Versi {normalizeAppVersion(config.appVersion, '3.0')} ({config.editionName || 'Edisi Terkini Dis 2026'})
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-sky-800 bg-white border border-sky-200 px-2.5 py-1 rounded-lg tabular-nums">
                      v{normalizeAppVersion(config.appVersion, '3.0')}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-sky-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-800">
                      Created by AMZ Studio — PPP Ahmad
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {config.footerText || 'Hak Cipta Terpelihara © 2026'} · Kemaskini: {config.versionUpdatedAt || 'Disember 2026'}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Semua Fungsi Dalam Sistem
                  </h5>
                  <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700 leading-relaxed">
                    <li>
                      <strong>Pengakuan Peringatan 2 Langkah</strong>: Pengesahan 5 syarat wajib sebelum mengakses borang permohonan jadual bertugas.
                    </li>
                    <li>
                      <strong>Pengesanan Emel Sejarah Pelayar (Gaya Google Forms)</strong>: Mengesan dan mengingati emel daripada sejarah/autofill pelayar pengguna sendiri dengan kotak tanda <em>Gunakan emel ini</em> serta pilihan tukar akaun.
                    </li>
                    <li>
                      <strong>Direktori Auto-Semak &amp; Simpan &lsquo;Senarai Nama PPPU5&rsquo;</strong>: Menyemak nombor telefon secara automatik apabila nama dipilih, pengesahan nombor telefon (butang <em>Sahkan</em> bertanda hijau), serta auto-simpan/kemaskini rekod ke Google Sheets.
                    </li>
                    <li>
                      <strong>Pilihan Syif Harian &amp; Tarikh Gantian</strong>: Menyokong semua pilihan syif termasuk tarikh gantian (<span className="font-mono-tabular">CG</span>, <span className="font-mono-tabular">HKA OFF</span>, <span className="font-mono-tabular">HK OFF</span>) dan catatan wajib bertanda <span className="text-red-500 font-bold">*</span> (<span className="font-mono-tabular">KURSUS</span>, <span className="font-mono-tabular">LAIN-LAIN</span>).
                    </li>
                    <li>
                      <strong>Muat Naik Surat Kelulusan ke Google Drive</strong>: Menyimpan fail permohonan ke subfolder mengikut tempoh tugasan atau melalui pautan Google Drive.
                    </li>
                    <li>
                      <strong>Auto-Simpan Draf &amp; Pulih Sesi</strong>: Menyimpan pengisian borang secara automatik ke dalam <span className="font-mono-tabular">localStorage</span> bagi mengelakkan kehilangan data sekiranya pelayar dimuat semula atau tertutup.
                    </li>
                    <li>
                      <strong>Pengesahan Akhir &amp; Integrasi WhatsApp</strong>: Semakan ringkasan permohonan (<em>Sahkan dan Hantar</em>), rekod terus ke Google Sheets mengikut helaian tempoh, serta pratonton dan penghantaran salinan terus ke WhatsApp.
                    </li>
                    <li>
                      <strong>Pengurusan Versi Dinamik &amp; Panel Pentadbir</strong>: Kawalan pentadbir untuk mengemaskini versi, nama edisi, tarikh/bulan kemaskini, Tajuk 1, dan teks Footer secara langsung pada paparan web serta diselaraskan ke Google Sheets.
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Perubahan Mengikut Versi Dalam Sistem
                  </h5>

                  <div className="space-y-2.5 text-xs">
                    <div className="rounded-lg border border-sky-200 bg-white p-3 space-y-1">
                      <p className="font-bold text-sky-800">
                        Versi {normalizeAppVersion(config.appVersion, '3.0')} ({config.editionName || 'Edisi Terkini Dis 2026'} — Semasa)
                      </p>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600 leading-relaxed">
                        <li>Naik taraf sistem kepada <strong>Versi 3.0</strong> dengan paparan Tajuk 1, versi, nama edisi, tarikh/bulan kemaskini, dan footer dinamik mengikut tetapan Admin.</li>
                        <li>Penambahan modul <em>Kemaskini Versi &amp; Paparan Web</em> di Panel Admin (tab Tetapan Sistem) berserta pratonton langsung dan penyegerakan ke helaian <span className="font-mono-tabular">SETTINGS</span> Google Sheets.</li>
                        <li>Penambahan penanda wajib bertanda <span className="text-red-500 font-bold">*</span> pada medan catatan bagi pilihan syif <span className="font-mono-tabular">KURSUS</span> dan <span className="font-mono-tabular">LAIN-LAIN</span>.</li>
                      </ul>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
                      <p className="font-bold text-slate-800">Versi 2.4 (Edisi Roster 2026/2027)</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600 leading-relaxed">
                        <li>Susunan semula Panel Admin kepada 5 bahagian navigasi (<em>Tetapan Borang</em>, <em>Tetapan Sistem</em>, <em>Rekod</em>, <em>Kod Script G.A.S</em>, <em>About</em>) dengan butang uji ringkas bersebelahan keputusan.</li>
                        <li>Auto-simpan draf dan pemulihan sesi borang secara automatik pada pelayar.</li>
                        <li>Pengesahan nombor telefon melalui butang <em>Sahkan</em> bertanda hijau (status <em>No belum disahkan</em> / <em>No. Telefon Telah direkodkan.</em>).</li>
                        <li>Pengesanan emel berasaskan sejarah pelayar pengguna sendiri (bebas daripada emel log masuk Admin GAS).</li>
                        <li>Modal pengesahan sebelum penghantaran (<em>Sahkan dan Hantar</em>), status pemprosesan terperinci, skrin <em>Permohonan Berjaya</em> dengan butang <em>Tamat Permohonan</em>, dan <em>Log History</em> ralat.</li>
                        <li>Sokongan binaan tunggal <span className="font-mono-tabular">Index.html</span> yang serasi dengan pautan kongsi Google AI Studio dan Google Apps Script <span className="font-mono-tabular">HtmlService</span>.</li>
                      </ul>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
                      <p className="font-bold text-slate-800">Versi 2.2 – 2.3</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600 leading-relaxed">
                        <li>Penambahan auto-cipta helaian <span className="font-mono-tabular">Senarai Nama PPPU5</span> (<em>Email, Nama, No Telefon</em>) dan carian pantas nombor telefon pemohon.</li>
                        <li>Sokongan muat naik fail Surat Kelulusan terus ke subfolder Google Drive mengikut tempoh tugasan serta ujian kebenaran tulis <span className="font-mono-tabular">DriveApp</span>.</li>
                      </ul>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
                      <p className="font-bold text-slate-800">Versi 2.0 – 2.1</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600 leading-relaxed">
                        <li>Pemetaan dinamik helaian Google Sheets bagi tempoh tugasan 14 hari dengan pengekalan susunan lajur rasmi serta eksport CSV.</li>
                        <li>Reka bentuk responsif mudah alih, pautan ikon Admin di penjuru kanan atas, dan senarai nama PPP U5 tersusun mengikut abjad.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
