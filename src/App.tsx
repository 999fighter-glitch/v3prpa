import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  History,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  RotateCcw,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AdminModal } from './components/AdminModal';
import { ErrorLogEntry, LogHistoryModal } from './components/LogHistoryModal';
import { NotificationModal, NotificationState } from './components/NotificationModal';
import {
  ConfirmationShiftItem,
  SubmitConfirmationModal,
  SubmitConfirmationSummary,
} from './components/SubmitConfirmationModal';
import { WhatsAppSummaryModal } from './components/WhatsAppSummaryModal';
import './types/gas';
import {
  AppConfig,
  ApplicationRecord,
  buildWarningItems,
  DailyShiftSelection,
  DEFAULT_BANNER_LOGO_URL,
  DEFAULT_CONFIG,
  formatDateDayMonth,
  formatDateDisplay,
  generateDateItems,
  generateRosterPeriods,
  normalizeAppVersion,
  SHIFT_OPTIONS,
  STAFF_NAMES,
  WARNING_ITEMS,
} from './data/rosterData';

const STORAGE_CONFIG_KEY = 'ppp_u5_roster_config_v24';
const STORAGE_RECORDS_KEY = 'ppp_u5_roster_records_v24';
const STORAGE_STAFF_DIRECTORY_KEY = 'ppp_u5_staff_directory_v2';
const LEGACY_STORAGE_BROWSER_EMAIL_KEY = 'ppp_u5_browser_login_email_v1';
const STORAGE_BROWSER_EMAIL_HISTORY_KEY = 'ppp_u5_browser_email_history_v2';
const STORAGE_BROWSER_ACTIVE_EMAIL_KEY = 'ppp_u5_browser_active_email_v2';
const STORAGE_ERROR_LOGS_KEY = 'ppp_u5_error_logs_v1';
const STORAGE_FORM_DRAFT_KEY = 'ppp_u5_form_draft_v1';

interface FormDraftData {
  step: 1 | 2;
  checks: boolean[];
  email: string;
  useDetectedEmail: boolean;
  namaPemohon: string;
  phone: string;
  phoneVerified: boolean;
  phoneLookupStatus: 'idle' | 'checking' | 'found' | 'missing';
  dailySelections: Record<string, DailyShiftSelection>;
  suratMode: 'upload' | 'link';
  suratKelulusan: string;
  sendEmailCopy: boolean;
  updatedAt: string;
}

interface StaffDirectoryEntry {
  email: string;
  nama: string;
  noTelefon: string;
}

const normalizeStaffKey = (name: string) => name.replace(/\s+/g, ' ').trim().toUpperCase();
const normalizeEmailKey = (addr: string) => addr.trim().toLowerCase();
const isValidEmailAddress = (addr: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr.trim());
const isFormResponsesSheetUrl = (url: string, sheetName?: string): boolean => {
  if (sheetName && /^Form Responses/i.test(sheetName.trim())) return true;
  return /(?:[?&#])gid=379069437\b/i.test(url || '');
};
const stripSheetGid = (url: string): string => {
  if (!url) return '';
  return url
    .trim()
    .replace(/#gid=\d+/gi, '')
    .replace(/([?&])gid=\d+(&|$)/g, (_, prefix: string, suffix: string) =>
      suffix === '&' ? prefix : ''
    )
    .replace(/[?&]+$/, '');
};

const dedupeEmailsPreserveOrder = (list: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of list) {
    const trimmed = (raw || '').trim();
    if (!isValidEmailAddress(trimmed)) continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(trimmed);
    }
  }
  return result;
};

const readBrowserEmailHistoryInitial = (): { history: string[]; activeEmail: string } => {
  const candidates: string[] = [];
  let activeEmail = '';
  try {
    // Buang kunci lama jika pernah menyimpan emel sesi pelayan/admin
    localStorage.removeItem(LEGACY_STORAGE_BROWSER_EMAIL_KEY);
  } catch {
    // Ignore storage removal errors
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const paramEmail = (params.get('userEmail') || params.get('email') || '').trim();
    if (isValidEmailAddress(paramEmail)) {
      candidates.push(paramEmail);
      activeEmail = paramEmail;
    }
  } catch {
    // Ignore URL read errors
  }
  try {
    const savedActive = (localStorage.getItem(STORAGE_BROWSER_ACTIVE_EMAIL_KEY) || '').trim();
    if (isValidEmailAddress(savedActive)) {
      candidates.push(savedActive);
      if (!activeEmail) activeEmail = savedActive;
    }
    const savedHistRaw = localStorage.getItem(STORAGE_BROWSER_EMAIL_HISTORY_KEY);
    if (savedHistRaw) {
      const parsedHist = JSON.parse(savedHistRaw);
      if (Array.isArray(parsedHist)) {
        parsedHist.forEach((item) => {
          if (typeof item === 'string' && isValidEmailAddress(item)) {
            candidates.push(item.trim());
          }
        });
      }
    }
    const savedRecsRaw = localStorage.getItem(STORAGE_RECORDS_KEY);
    if (savedRecsRaw) {
      const parsedRecs = JSON.parse(savedRecsRaw);
      if (Array.isArray(parsedRecs)) {
        parsedRecs.forEach((rec) => {
          if (rec && typeof rec === 'object' && typeof rec.email === 'string' && isValidEmailAddress(rec.email)) {
            candidates.push(rec.email.trim());
          }
        });
      }
    }
  } catch {
    // Ignore storage read errors
  }
  const history = dedupeEmailsPreserveOrder(candidates).slice(0, 10);
  if (!activeEmail && history.length > 0) {
    activeEmail = history[0];
  }
  return { history, activeEmail };
};

const readSavedFormDraft = (): FormDraftData | null => {
  try {
    const raw = localStorage.getItem(STORAGE_FORM_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FormDraftData>;
    if (!parsed || typeof parsed !== 'object') return null;

    const checks =
      Array.isArray(parsed.checks) && parsed.checks.length === WARNING_ITEMS.length
        ? parsed.checks.map(Boolean)
        : WARNING_ITEMS.map(() => false);
    const step: 1 | 2 = parsed.step === 2 ? 2 : 1;
    const email = typeof parsed.email === 'string' ? parsed.email : '';
    const useDetectedEmail = typeof parsed.useDetectedEmail === 'boolean' ? parsed.useDetectedEmail : true;
    const namaPemohon = typeof parsed.namaPemohon === 'string' ? parsed.namaPemohon : '';
    const phone = typeof parsed.phone === 'string' ? parsed.phone : '';
    const phoneVerified = Boolean(parsed.phoneVerified);
    const phoneLookupStatus: 'idle' | 'checking' | 'found' | 'missing' =
      parsed.phoneLookupStatus === 'found' || parsed.phoneLookupStatus === 'missing'
        ? parsed.phoneLookupStatus
        : 'idle';
    const dailySelections =
      parsed.dailySelections && typeof parsed.dailySelections === 'object'
        ? parsed.dailySelections
        : {};
    const suratMode: 'upload' | 'link' = parsed.suratMode === 'link' ? 'link' : 'upload';
    const suratKelulusan = typeof parsed.suratKelulusan === 'string' ? parsed.suratKelulusan : '';
    const sendEmailCopy = Boolean(parsed.sendEmailCopy);
    const updatedAt = typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString();

    const hasMeaningfulProgress =
      step === 2 ||
      checks.some(Boolean) ||
      Boolean(namaPemohon.trim()) ||
      Boolean(phone.trim()) ||
      Object.values(dailySelections).some((sel) => Boolean(sel && sel.shift)) ||
      Boolean(suratKelulusan.trim()) ||
      sendEmailCopy;

    if (!hasMeaningfulProgress) return null;

    return {
      step,
      checks,
      email,
      useDetectedEmail,
      namaPemohon,
      phone,
      phoneVerified,
      phoneLookupStatus,
      dailySelections,
      suratMode,
      suratKelulusan,
      sendEmailCopy,
      updatedAt,
    };
  } catch {
    return null;
  }
};

export default function App() {
  const [appConfig, setAppConfig] = useState<AppConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AppConfig>;
        const legacyGasUrls = [
          'https://script.google.com/macros/s/AKfycbxMS0zt3vyURCHIuK442D81nC8s5ZCgujgjvp3Y00kSz4eumXkv1s9p7Vi3Cc1srfy4MQ/exec',
          'https://script.google.com/macros/s/AKfycbz7SsEI3L1zSljsJ5_nr4tjvNquojxa6a1tQWKLZzA9s8-xDHHpHQapmJUCgJbjmqCK5A/exec',
          'https://script.google.com/macros/s/AKfycby48gQV4ga0HnjOzMQXbwkiZy9CpUEvHFxzRyfMVuwgILOBmkR_OEhALG0-QzRd4GK12A/exec',
          'https://script.google.com/macros/s/AKfycbxnasmGq5FupA8GeQ1A9CODyRqaEQhvHu1zWuqW6TUdXwP4QU2FGSDMjYs1WzRWDhKO1A/exec',
          'https://script.google.com/macros/s/AKfycbwXWas9GBKTFb-uUEZJBc1PdaMY6boNvvrso1W4SmHntc7DJWlvr9byh5XN6kQc7I4G2g/exec',
          'https://script.google.com/macros/s/AKfycby-V6DD2pN418FGbX999bDmMjVaYs-BN1A5yoaFpb8-DaSrG9Yqepx7pYI2Ge8XZodsDw/exec',
          'https://script.google.com/macros/s/AKfycbyTXQ5G32JWd7WfHs0IMGPAKKZZL2daZwnUX0Lr1AeeXXQ4eFLWwK3UgHV08xjelvCq/exec',
          'https://script.google.com/macros/s/AKfycbzxQRBVfBGOOlRQoZfsekfU8ULNEV4aygDUEzQS0EOn8fTPrNcJQQ2x1q-Hs6N4u8tx5g/exec',
          'https://script.google.com/macros/s/AKfycbwkr0hiEuDjdWFfkYGqcD25hQpuGC4qA3054LQs6FDtANX3dT7wSR2o5J8ShwsXPuJlQg/exec',
          'https://script.google.com/macros/s/AKfycbwo658onRKeksqp4vULUYYMG31L9tvHNvZK9291MP3jOpwpZjDhpTbNarbd6LdvloLrMQ/exec',
        ];
        const resolvedGasUrl =
          !parsed.gasWebAppUrl || legacyGasUrls.includes(parsed.gasWebAppUrl)
            ? DEFAULT_CONFIG.gasWebAppUrl
            : parsed.gasWebAppUrl;
        const isLegacySheetUrl =
          !parsed.recordSpreadsheetUrl ||
          parsed.recordSpreadsheetUrl.includes('1ibZUZIs6vFiwDVhNNa1G_K9Fz4oRmoIgtoGsJg3vp6c') ||
          parsed.recordSpreadsheetUrl.includes('1n_Esf6YOSVe1OuWiSoJHbXmYSAmcii8IADyfqoHekQQ');
        const resolvedSheetUrl =
          isLegacySheetUrl || !parsed.recordSpreadsheetUrl
            ? DEFAULT_CONFIG.recordSpreadsheetUrl
            : isFormResponsesSheetUrl(parsed.recordSpreadsheetUrl)
              ? stripSheetGid(parsed.recordSpreadsheetUrl)
              : parsed.recordSpreadsheetUrl;
        const isLegacyLogoUrl =
          !parsed.logoUrl ||
          parsed.logoUrl.includes('1C9KN3ncJTrifXlaIP7zgW380zlEb1Kle') ||
          parsed.logoUrl.includes('Upgrade_Ambulance_Logo_cfcf8ac5.png');
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          gasWebAppUrl: resolvedGasUrl,
          recordSpreadsheetUrl: resolvedSheetUrl,
          logoUrl: isLegacyLogoUrl ? DEFAULT_BANNER_LOGO_URL : (parsed.logoUrl || DEFAULT_BANNER_LOGO_URL),
          approvalFolderUrl:
            parsed.approvalFolderUrl && parsed.approvalFolderUrl.trim()
              ? parsed.approvalFolderUrl.trim()
              : DEFAULT_CONFIG.approvalFolderUrl,
          tajuk1:
            parsed.tajuk1 !== undefined && parsed.tajuk1 !== null && String(parsed.tajuk1).trim()
              ? String(parsed.tajuk1).trim()
              : DEFAULT_CONFIG.tajuk1,
          footerText:
            parsed.footerText !== undefined && parsed.footerText !== null && String(parsed.footerText).trim()
              ? String(parsed.footerText).trim()
              : DEFAULT_CONFIG.footerText,
          appVersion:
            parsed.appVersion !== undefined && parsed.appVersion !== null && String(parsed.appVersion).trim()
              ? normalizeAppVersion(parsed.appVersion, DEFAULT_CONFIG.appVersion)
              : DEFAULT_CONFIG.appVersion,
          editionName:
            parsed.editionName !== undefined && parsed.editionName !== null && String(parsed.editionName).trim()
              ? String(parsed.editionName).trim()
              : DEFAULT_CONFIG.editionName,
          versionUpdatedAt:
            parsed.versionUpdatedAt !== undefined &&
            parsed.versionUpdatedAt !== null &&
            String(parsed.versionUpdatedAt).trim()
              ? String(parsed.versionUpdatedAt).trim()
              : DEFAULT_CONFIG.versionUpdatedAt,
        };
      }
    } catch {
      // Ignore storage read errors
    }
    return DEFAULT_CONFIG;
  });

  const [records, setRecords] = useState<ApplicationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RECORDS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      // Ignore storage read errors
    }
    return [];
  });

  const initialFormDraft = useMemo(() => readSavedFormDraft(), []);
  const initialBrowserEmailData = useMemo(() => readBrowserEmailHistoryInitial(), []);

  const [logoLoadError, setLogoLoadError] = useState(false);
  const [logoFallbackAttempted, setLogoFallbackAttempted] = useState(false);
  const [activeTargetSheetUrl, setActiveTargetSheetUrl] = useState('');
  const [activeTargetSheetName, setActiveTargetSheetName] = useState('');
  const [lastSubmittedSheetUrl, setLastSubmittedSheetUrl] = useState('');
  const [lastSubmittedSheetName, setLastSubmittedSheetName] = useState('');
  const [targetSheetRefreshNonce, setTargetSheetRefreshNonce] = useState(0);
  const [step, setStep] = useState<1 | 2>(initialFormDraft?.step ?? 1);
  const [checks, setChecks] = useState<boolean[]>(
    () => initialFormDraft?.checks ?? WARNING_ITEMS.map(() => false)
  );
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(
    initialFormDraft?.updatedAt ?? null
  );
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(
    initialFormDraft?.updatedAt ?? null
  );
  const [showStep1Alert, setShowStep1Alert] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedFileUrl, setLastSavedFileUrl] = useState('');

  // Step 2 Form States (Semakan emel berdasarkan sejarah & autofill pelayar sendiri, bukan sesi Admin GAS)
  const [browserEmailHistory, setBrowserEmailHistory] = useState<string[]>(initialBrowserEmailData.history);
  const [detectedLoginEmail, setDetectedLoginEmail] = useState<string>(initialBrowserEmailData.activeEmail);
  const [detectedEmailSource, setDetectedEmailSource] = useState<'browser_history' | 'none'>(
    initialBrowserEmailData.activeEmail ? 'browser_history' : 'none'
  );
  const [useDetectedEmail, setUseDetectedEmail] = useState<boolean>(() => {
    if (initialFormDraft) return initialFormDraft.useDetectedEmail;
    return Boolean(initialBrowserEmailData.activeEmail);
  });
  const [email, setEmail] = useState<string>(() => {
    if (initialFormDraft && initialFormDraft.email.trim()) return initialFormDraft.email;
    return initialBrowserEmailData.activeEmail;
  });
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [phone, setPhone] = useState<string>(initialFormDraft?.phone ?? '');
  const [phoneVerified, setPhoneVerified] = useState<boolean>(initialFormDraft?.phoneVerified ?? false);
  const [namaPemohon, setNamaPemohon] = useState<string>(initialFormDraft?.namaPemohon ?? '');
  const [staffPhoneDirectory, setStaffPhoneDirectory] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_STAFF_DIRECTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
      }
    } catch {
      // Ignore storage read errors
    }
    return {};
  });
  const [staffRecordsByName, setStaffRecordsByName] = useState<Record<string, StaffDirectoryEntry>>({});
  const [staffRecordsByEmail, setStaffRecordsByEmail] = useState<Record<string, StaffDirectoryEntry>>({});
  const [phoneLookupStatus, setPhoneLookupStatus] = useState<'idle' | 'checking' | 'found' | 'missing'>(
    initialFormDraft?.phoneLookupStatus ?? 'idle'
  );
  const [dailySelections, setDailySelections] = useState<Record<string, DailyShiftSelection>>(
    initialFormDraft?.dailySelections ?? {}
  );
  const [suratMode, setSuratMode] = useState<'upload' | 'link'>(initialFormDraft?.suratMode ?? 'upload');
  const [suratKelulusan, setSuratKelulusan] = useState<string>(initialFormDraft?.suratKelulusan ?? '');
  const [suratFile, setSuratFile] = useState<{
    name: string;
    mimeType: string;
    size: number;
    base64: string;
  } | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [folderWarning, setFolderWarning] = useState<string>('');
  const [sendEmailCopy, setSendEmailCopy] = useState<boolean>(initialFormDraft?.sendEmailCopy ?? false);

  // Modals & Logs
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [logHistoryOpen, setLogHistoryOpen] = useState(false);
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ERROR_LOGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? (parsed as ErrorLogEntry[]) : [];
      }
    } catch {
      // Ignore storage read errors
    }
    return [];
  });
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmDefaultWhatsapp, setConfirmDefaultWhatsapp] = useState(true);
  const [confirmSummary, setConfirmSummary] = useState<SubmitConfirmationSummary | null>(null);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [whatsappSummaryText, setWhatsappSummaryText] = useState('');
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    title: '',
    message: '',
    type: 'success',
    showSheetPreview: false,
  });

  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const namaPemohonRef = useRef<HTMLSelectElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const phoneLookupReqRef = useRef(0);
  const lastResolvedPeriodRef = useRef('');
  const lastLoggedStaffDirKeyRef = useRef('');

  const rosterPeriods = useMemo(() => generateRosterPeriods(), []);
  const dateItems = useMemo(
    () => generateDateItems(appConfig.startDate, appConfig.endDate),
    [appConfig.startDate, appConfig.endDate]
  );

  // Persist config & records locally
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(appConfig));
    } catch {
      // Ignore storage write errors
    }
  }, [appConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_RECORDS_KEY, JSON.stringify(records));
    } catch {
      // Ignore storage write errors
    }
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_STAFF_DIRECTORY_KEY, JSON.stringify(staffPhoneDirectory));
    } catch {
      // Ignore storage write errors
    }
  }, [staffPhoneDirectory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ERROR_LOGS_KEY, JSON.stringify(errorLogs));
    } catch {
      // Ignore storage write errors
    }
  }, [errorLogs]);

  // Auto-save draft borang ke localStorage supaya tidak hilang bila refresh atau terkeluar
  useEffect(() => {
    if (submittedSuccess) return;

    const hasMeaningfulProgress =
      step === 2 ||
      checks.some(Boolean) ||
      Boolean(namaPemohon.trim()) ||
      Boolean(phone.trim()) ||
      Object.values(dailySelections).some((sel) => Boolean(sel && sel.shift)) ||
      Boolean(suratKelulusan.trim()) ||
      sendEmailCopy;

    if (!hasMeaningfulProgress) {
      try {
        localStorage.removeItem(STORAGE_FORM_DRAFT_KEY);
      } catch {
        // Ignore storage errors
      }
      setLastDraftSavedAt(null);
      return;
    }

    const nowIso = new Date().toISOString();
    const draftPayload: FormDraftData = {
      step,
      checks,
      email,
      useDetectedEmail,
      namaPemohon,
      phone,
      phoneVerified,
      phoneLookupStatus: phoneLookupStatus === 'checking' ? 'idle' : phoneLookupStatus,
      dailySelections,
      suratMode,
      suratKelulusan,
      sendEmailCopy,
      updatedAt: nowIso,
    };

    try {
      localStorage.setItem(STORAGE_FORM_DRAFT_KEY, JSON.stringify(draftPayload));
      setLastDraftSavedAt(nowIso);
    } catch {
      // Ignore storage write errors
    }
  }, [
    submittedSuccess,
    step,
    checks,
    email,
    useDetectedEmail,
    namaPemohon,
    phone,
    phoneVerified,
    phoneLookupStatus,
    dailySelections,
    suratMode,
    suratKelulusan,
    sendEmailCopy,
  ]);

  // Reset logo fallback flag whenever logo URL changes
  useEffect(() => {
    setLogoLoadError(false);
    setLogoFallbackAttempted(false);
  }, [appConfig.logoUrl]);

  // Auto-detect ?gasUrl=... from GAS wrapper and hydrate config from GAS backend
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramGasUrl = params.get('gasUrl');
    if (paramGasUrl && paramGasUrl.startsWith('https://script.google.com/')) {
      setAppConfig((prev) => ({ ...prev, gasWebAppUrl: paramGasUrl }));
    }

    const effectiveGasUrl =
      paramGasUrl && paramGasUrl.startsWith('https://script.google.com/')
        ? paramGasUrl
        : appConfig.gasWebAppUrl;

    const applyRemoteConfig = (
      res: Partial<AppConfig>,
      fallbackGasUrl?: string,
      isFromGasRun = false
    ) => {
      const remoteSheetUrl = res.recordSpreadsheetUrl || '';
      const isLegacyRemoteSheet =
        !remoteSheetUrl ||
        (!isFromGasRun &&
          (remoteSheetUrl.includes('1ibZUZIs6vFiwDVhNNa1G_K9Fz4oRmoIgtoGsJg3vp6c') ||
            remoteSheetUrl.includes('1n_Esf6YOSVe1OuWiSoJHbXmYSAmcii8IADyfqoHekQQ')));
      const legacyGasUrls = [
        'https://script.google.com/macros/s/AKfycbxMS0zt3vyURCHIuK442D81nC8s5ZCgujgjvp3Y00kSz4eumXkv1s9p7Vi3Cc1srfy4MQ/exec',
        'https://script.google.com/macros/s/AKfycbz7SsEI3L1zSljsJ5_nr4tjvNquojxa6a1tQWKLZzA9s8-xDHHpHQapmJUCgJbjmqCK5A/exec',
        'https://script.google.com/macros/s/AKfycby48gQV4ga0HnjOzMQXbwkiZy9CpUEvHFxzRyfMVuwgILOBmkR_OEhALG0-QzRd4GK12A/exec',
        'https://script.google.com/macros/s/AKfycbxnasmGq5FupA8GeQ1A9CODyRqaEQhvHu1zWuqW6TUdXwP4QU2FGSDMjYs1WzRWDhKO1A/exec',
        'https://script.google.com/macros/s/AKfycbwXWas9GBKTFb-uUEZJBc1PdaMY6boNvvrso1W4SmHntc7DJWlvr9byh5XN6kQc7I4G2g/exec',
        'https://script.google.com/macros/s/AKfycby-V6DD2pN418FGbX999bDmMjVaYs-BN1A5yoaFpb8-DaSrG9Yqepx7pYI2Ge8XZodsDw/exec',
        'https://script.google.com/macros/s/AKfycbyTXQ5G32JWd7WfHs0IMGPAKKZZL2daZwnUX0Lr1AeeXXQ4eFLWwK3UgHV08xjelvCq/exec',
        'https://script.google.com/macros/s/AKfycbzxQRBVfBGOOlRQoZfsekfU8ULNEV4aygDUEzQS0EOn8fTPrNcJQQ2x1q-Hs6N4u8tx5g/exec',
        'https://script.google.com/macros/s/AKfycbwkr0hiEuDjdWFfkYGqcD25hQpuGC4qA3054LQs6FDtANX3dT7wSR2o5J8ShwsXPuJlQg/exec',
        'https://script.google.com/macros/s/AKfycbwo658onRKeksqp4vULUYYMG31L9tvHNvZK9291MP3jOpwpZjDhpTbNarbd6LdvloLrMQ/exec',
      ];
      const remoteGasUrl =
        res.gasWebAppUrl && (isFromGasRun || !legacyGasUrls.includes(res.gasWebAppUrl))
          ? res.gasWebAppUrl
          : '';
      const remoteLogoUrl =
        res.logoUrl &&
        !res.logoUrl.includes('1C9KN3ncJTrifXlaIP7zgW380zlEb1Kle') &&
        !res.logoUrl.includes('Upgrade_Ambulance_Logo_cfcf8ac5.png') &&
        (res.logoUrl.startsWith('http') || res.logoUrl.startsWith('/'))
          ? res.logoUrl
          : '';
      const resolvedSheet = isLegacyRemoteSheet
        ? ''
        : isFormResponsesSheetUrl(remoteSheetUrl)
          ? stripSheetGid(remoteSheetUrl)
          : remoteSheetUrl;
      const remoteHasValidGid = Boolean(resolvedSheet && /gid=\d+/i.test(resolvedSheet));
      if (remoteHasValidGid) {
        setActiveTargetSheetUrl(resolvedSheet);
        if (res.startDate && res.endDate) {
          const remoteTempoh = `${formatDateDisplay(res.startDate)} - ${formatDateDisplay(res.endDate)}`;
          setActiveTargetSheetName(`TUGAS PPPU5 ${remoteTempoh}`);
        }
      }
      setTargetSheetRefreshNonce((n) => n + 1);
      setAppConfig((prev) => ({
        ...prev,
        ...res,
        logoUrl: remoteLogoUrl || prev.logoUrl,
        approvalFolderUrl:
          typeof res.approvalFolderUrl === 'string' && res.approvalFolderUrl.trim()
            ? res.approvalFolderUrl.trim()
            : prev.approvalFolderUrl,
        recordSpreadsheetUrl:
          resolvedSheet ||
          (isFormResponsesSheetUrl(prev.recordSpreadsheetUrl)
            ? stripSheetGid(prev.recordSpreadsheetUrl)
            : prev.recordSpreadsheetUrl) ||
          DEFAULT_CONFIG.recordSpreadsheetUrl,
        gasWebAppUrl: remoteGasUrl || fallbackGasUrl || prev.gasWebAppUrl,
        tajuk1:
          res.tajuk1 !== undefined && res.tajuk1 !== null && String(res.tajuk1).trim()
            ? String(res.tajuk1).trim()
            : prev.tajuk1 || DEFAULT_CONFIG.tajuk1,
        footerText:
          res.footerText !== undefined && res.footerText !== null && String(res.footerText).trim()
            ? String(res.footerText).trim()
            : prev.footerText || DEFAULT_CONFIG.footerText,
        appVersion:
          res.appVersion !== undefined && res.appVersion !== null && String(res.appVersion).trim()
            ? normalizeAppVersion(res.appVersion, prev.appVersion || DEFAULT_CONFIG.appVersion)
            : prev.appVersion || DEFAULT_CONFIG.appVersion,
        editionName:
          res.editionName !== undefined && res.editionName !== null && String(res.editionName).trim()
            ? String(res.editionName).trim()
            : prev.editionName || DEFAULT_CONFIG.editionName,
        versionUpdatedAt:
          res.versionUpdatedAt !== undefined &&
          res.versionUpdatedAt !== null &&
          String(res.versionUpdatedAt).trim()
            ? String(res.versionUpdatedAt).trim()
            : prev.versionUpdatedAt || DEFAULT_CONFIG.versionUpdatedAt,
      }));
    };

    const gasRun = window.google?.script?.run;
    if (gasRun) {
      gasRun
        .withSuccessHandler((res: unknown) => {
          if (res && typeof res === 'object' && 'recordSpreadsheetUrl' in res) {
            applyRemoteConfig(res as Partial<AppConfig>, undefined, true);
          }
        })
        .withFailureHandler(() => {})
        .gasGetConfig();
    } else if (effectiveGasUrl) {
      const sep = effectiveGasUrl.includes('?') ? '&' : '?';
      fetch(`${effectiveGasUrl}${sep}action=getConfig&t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      })
        .then((r) => r.json())
        .then((res: Partial<AppConfig>) => {
          if (res && typeof res === 'object') {
            applyRemoteConfig(res, effectiveGasUrl);
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync target Google Sheet link (#gid=...) for the active duty period
  useEffect(() => {
    const tempohTugasan = `${formatDateDisplay(appConfig.startDate)} - ${formatDateDisplay(appConfig.endDate)}`;
    const firstDateHeader = dateItems[0]?.sheetColTitle || '';
    if (!appConfig.startDate || !appConfig.endDate) return;

    if (lastResolvedPeriodRef.current !== tempohTugasan) {
      lastResolvedPeriodRef.current = tempohTugasan;
      setActiveTargetSheetUrl('');
      setActiveTargetSheetName('');
      setLastSubmittedSheetUrl('');
      setLastSubmittedSheetName('');
    }

    let cancelled = false;
    const handleTargetSheetResponse = (
      res: { sheetUrl?: string; sheetName?: string; sheetMatched?: boolean } | null
    ) => {
      if (cancelled || !res?.sheetUrl || !res.sheetUrl.startsWith('http')) return;
      const hasGid = /gid=\d+/i.test(res.sheetUrl);
      const isFormResponseFallback = isFormResponsesSheetUrl(res.sheetUrl, res.sheetName);
      const isMatched =
        !isFormResponseFallback &&
        (res.sheetMatched === true ||
          (typeof res.sheetMatched === 'undefined' && Boolean(res.sheetName)));
      const normalizedUrl = isMatched
        ? res.sheetUrl
        : hasGid
          ? stripSheetGid(res.sheetUrl)
          : res.sheetUrl;
      setActiveTargetSheetUrl(normalizedUrl);
      setActiveTargetSheetName(isMatched ? res.sheetName || `TUGAS PPPU5 ${tempohTugasan}` : '');
      setAppConfig((prev) =>
        prev.recordSpreadsheetUrl === normalizedUrl
          ? prev
          : { ...prev, recordSpreadsheetUrl: normalizedUrl }
      );
    };

    const cleanFallbackUrl = stripSheetGid(appConfig.recordSpreadsheetUrl);
    const gasRun = window.google?.script?.run;
    if (gasRun) {
      gasRun
        .withSuccessHandler((res: unknown) => {
          if (res && typeof res === 'object') {
            handleTargetSheetResponse(res as { sheetUrl?: string; sheetName?: string; sheetMatched?: boolean });
          }
        })
        .withFailureHandler(() => {})
        .gasGetTargetSheetUrl(tempohTugasan, firstDateHeader, cleanFallbackUrl);
    } else if (appConfig.gasWebAppUrl) {
      const sep = appConfig.gasWebAppUrl.includes('?') ? '&' : '?';
      const queryUrl = `${appConfig.gasWebAppUrl}${sep}action=getTargetSheetUrl&tempoh=${encodeURIComponent(
        tempohTugasan
      )}&firstDate=${encodeURIComponent(firstDateHeader)}&fallbackUrl=${encodeURIComponent(
        cleanFallbackUrl
      )}&t=${Date.now()}`;
      fetch(queryUrl, { method: 'GET', cache: 'no-store' })
        .then(async (res) => {
          const ct = res.headers.get('content-type') || '';
          if (!ct.includes('application/json')) return null;
          return (await res.json()) as { sheetUrl?: string; sheetName?: string; sheetMatched?: boolean };
        })
        .then((data) => {
          if (data) handleTargetSheetResponse(data);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [appConfig.startDate, appConfig.endDate, appConfig.gasWebAppUrl, dateItems, targetSheetRefreshNonce]);

  const rememberBrowserEmail = (rawEmail: string, setAsActive = true) => {
    const clean = rawEmail.trim();
    if (!isValidEmailAddress(clean)) return;
    setBrowserEmailHistory((prev) => {
      const next = dedupeEmailsPreserveOrder([clean, ...prev]).slice(0, 10);
      try {
        localStorage.setItem(STORAGE_BROWSER_EMAIL_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
    if (setAsActive) {
      try {
        localStorage.setItem(STORAGE_BROWSER_ACTIVE_EMAIL_KEY, clean);
      } catch {
        // Ignore storage write errors
      }
      setDetectedLoginEmail(clean);
      setDetectedEmailSource('browser_history');
    }
  };

  // Detect email silently from browser credential store if supported (strictly local browser, never GAS admin session)
  useEffect(() => {
    let cancelled = false;
    try {
      localStorage.removeItem(LEGACY_STORAGE_BROWSER_EMAIL_KEY);
    } catch {
      // Ignore storage errors
    }

    if (
      typeof navigator !== 'undefined' &&
      'credentials' in navigator &&
      typeof navigator.credentials?.get === 'function'
    ) {
      navigator.credentials
        .get({ password: true, mediation: 'silent' } as CredentialRequestOptions)
        .then((cred) => {
          if (cancelled || !cred || !cred.id) return;
          const credEmail = cred.id.trim();
          if (!isValidEmailAddress(credEmail)) return;
          setBrowserEmailHistory((prev) => {
            const next = dedupeEmailsPreserveOrder([credEmail, ...prev]).slice(0, 10);
            try {
              localStorage.setItem(STORAGE_BROWSER_EMAIL_HISTORY_KEY, JSON.stringify(next));
            } catch {
              // Ignore storage write errors
            }
            return next;
          });
          setDetectedLoginEmail((prevDetected) => {
            if (prevDetected) return prevDetected;
            try {
              localStorage.setItem(STORAGE_BROWSER_ACTIVE_EMAIL_KEY, credEmail);
            } catch {
              // Ignore storage write errors
            }
            setDetectedEmailSource('browser_history');
            setUseDetectedEmail(true);
            setEmail((prevEmail) => (prevEmail.trim() ? prevEmail : credEmail));
            return credEmail;
          });
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate staff directory ('Senarai Nama PPPU5')
  useEffect(() => {
    let cancelled = false;

    const applyDirectoryResponse = (
      res: {
        status?: string;
        message?: string;
        sheetName?: string;
        sheetUrl?: string;
        totalRecords?: number;
        directory?: Record<string, string>;
        recordsByName?: Record<string, StaffDirectoryEntry>;
        recordsByEmail?: Record<string, StaffDirectoryEntry>;
      } | null
    ) => {
      if (cancelled || !res) return;
      if (res.status !== 'ok') {
        recordErrorLog(
          'Senarai Nama PPPU5',
          'Ralat Memuat Senarai Nama PPPU5',
          res.message || 'Gagal membaca data daripada helaian Senarai Nama PPPU5 di Google Sheets.'
        );
        return;
      }
      if (res.directory) {
        setStaffPhoneDirectory((prev) => ({ ...prev, ...res.directory }));
      }
      if (res.recordsByName) {
        setStaffRecordsByName((prev) => ({ ...prev, ...res.recordsByName }));
      }
      if (res.recordsByEmail) {
        setStaffRecordsByEmail((prev) => ({ ...prev, ...res.recordsByEmail }));
      }
      const sheetLabel = res.sheetName || 'Senarai Nama PPPU5';
      const count =
        typeof res.totalRecords === 'number'
          ? res.totalRecords
          : res.recordsByName
            ? Object.keys(res.recordsByName).length
            : res.directory
              ? Object.keys(res.directory).length
              : 0;
      const dirLogKey = `${appConfig.gasWebAppUrl || 'gasRun'}|${sheetLabel}|${count}`;
      if (lastLoggedStaffDirKeyRef.current !== dirLogKey) {
        lastLoggedStaffDirKeyRef.current = dirLogKey;
        recordErrorLog(
          'Senarai Nama PPPU5',
          'Sambungan Senarai Nama PPP Berjaya',
          `Berjaya disambungkan ke helaian "${sheetLabel}" (${count} rekod PPP dimuatkan).`,
          'success'
        );
      }
    };

    const gasRun = window.google?.script?.run;
    if (gasRun) {
      gasRun
        .withSuccessHandler((res: unknown) => {
          if (res && typeof res === 'object') {
            applyDirectoryResponse(
              res as {
                status?: string;
                message?: string;
                sheetName?: string;
                sheetUrl?: string;
                totalRecords?: number;
                directory?: Record<string, string>;
                recordsByName?: Record<string, StaffDirectoryEntry>;
                recordsByEmail?: Record<string, StaffDirectoryEntry>;
              }
            );
          }
        })
        .withFailureHandler((err: unknown) => {
          if (!cancelled) {
            recordErrorLog(
              'Senarai Nama PPPU5',
              'Ralat Pelayan GAS (Senarai Nama PPPU5)',
              `Gagal memanggil gasGetStaffDirectory: ${String(err || 'Ralat pelayan tidak diketahui')}`
            );
          }
        })
        .gasGetStaffDirectory(appConfig.recordSpreadsheetUrl);
    } else if (appConfig.gasWebAppUrl) {
      const sep = appConfig.gasWebAppUrl.includes('?') ? '&' : '?';
      const dirQueryUrl = `${appConfig.gasWebAppUrl}${sep}action=getStaffDirectory&fallbackUrl=${encodeURIComponent(
        appConfig.recordSpreadsheetUrl
      )}&t=${Date.now()}`;
      fetch(dirQueryUrl, { method: 'GET', cache: 'no-store' })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} (${res.statusText || 'Gagal menghubungi pelayan GAS'})`);
          }
          const ct = res.headers.get('content-type') || '';
          if (!ct.includes('application/json')) {
            throw new Error(
              `Respons bukan JSON (${ct || 'text/html'}). Kemungkinan Web App GAS belum dikemaskini (Deploy New Version) atau tiada kebenaran akses.`
            );
          }
          return (await res.json()) as {
            status?: string;
            message?: string;
            sheetName?: string;
            sheetUrl?: string;
            totalRecords?: number;
            directory?: Record<string, string>;
            recordsByName?: Record<string, StaffDirectoryEntry>;
            recordsByEmail?: Record<string, StaffDirectoryEntry>;
          };
        })
        .then((data) => {
          if (data) applyDirectoryResponse(data);
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            const detail = err instanceof Error ? err.message : String(err || 'Ralat rangkaian');
            recordErrorLog(
              'Senarai Nama PPPU5',
              'Ralat Sambungan Senarai Nama PPPU5',
              `Gagal menghubungi Google Apps Script untuk membaca Senarai Nama PPPU5: ${detail}`
            );
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [appConfig.gasWebAppUrl, appConfig.recordSpreadsheetUrl]);

  // Evaluate form open/closed status
  const formStatus = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    if (appConfig.forceStatus === 'OPEN') {
      return { isOpen: true, reason: '' };
    }
    if (appConfig.forceStatus === 'CLOSED') {
      return {
        isOpen: false,
        reason: 'Borang ditutup secara manual oleh pentadbir sistem.',
      };
    }
    if (appConfig.closingDate && today > appConfig.closingDate) {
      return {
        isOpen: false,
        reason: `Tarikh tutup permohonan (${formatDateDisplay(appConfig.closingDate)}) telah tamat.`,
      };
    }
    return { isOpen: true, reason: '' };
  }, [appConfig.forceStatus, appConfig.closingDate]);

  const currentPeriodValue = `${appConfig.startDate}|${appConfig.endDate}`;
  const periodOptionExists = rosterPeriods.some((p) => p.value === currentPeriodValue);

  const showNotification = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' = 'success',
    showSheetPreview = false,
    fileUrl?: string,
    buttonLabel?: string,
    onAfterClose?: () => void
  ) => {
    setNotification({
      open: true,
      title,
      message,
      type,
      showSheetPreview,
      fileUrl,
      buttonLabel,
      onAfterClose,
    });
  };

  const recordErrorLog = (
    source: string,
    title: string,
    message: string,
    level: 'error' | 'success' = 'error'
  ) => {
    const entry: ErrorLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      source,
      title,
      message,
      level,
    };
    setErrorLogs((prev) => [entry, ...prev].slice(0, 100));
  };

  const showMissingPhonePopup = (staffName?: string) => {
    showNotification(
      'Tiada Nombor Telefon Dalam Simpanan',
      `Tiada nombor telefon dalam simpanan untuk nama ${
        staffName ? `"${staffName}"` : 'ini'
      }.\n\nSila masukkan nombor telefon anda. Nombor telefon akan disimpan pada respon pertama semasa menghantar borang.`,
      'warning',
      false,
      undefined,
      'OK',
      () => {
        setTimeout(() => {
          phoneInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          phoneInputRef.current?.focus();
        }, 60);
      }
    );
  };

  // Validate reference Google Drive folder whenever config changes
  useEffect(() => {
    const rawFolder = (appConfig.approvalFolderUrl || '').trim();
    if (!rawFolder) {
      setFolderWarning(
        'Amaran: Folder rujukan Google Drive untuk Surat Kelulusan belum ditetapkan. Sila kemaskini pautan folder di Admin Panel sebelum memuat naik fail.'
      );
      return;
    }

    const isValidDrivePattern =
      /\/folders\/[a-zA-Z0-9-_]+/.test(rawFolder) ||
      /[?&]id=[a-zA-Z0-9-_]+/.test(rawFolder) ||
      /^[a-zA-Z0-9-_]{15,}$/.test(rawFolder);

    if (!isValidDrivePattern) {
      setFolderWarning(
        'Amaran: Format pautan folder rujukan Google Drive tidak sah atau salah lokasi. Sila semak pautan di Admin Panel.'
      );
      return;
    }

    const handleFolderValidationResult = (data: { valid?: boolean; message?: string }) => {
      if (data.valid) {
        setFolderWarning('');
      } else {
        const rawMsg = data.message || '';
        if (rawMsg.includes('You do not have permission') || rawMsg.includes('DriveApp')) {
          setFolderWarning(
            'Amaran Kebenaran Google Drive: Projek Google Apps Script belum diluluskan akses DriveApp. Sila buka Apps Script Editor → jalankan fungsi authorizeDriveAndSheets (Run & Allow), tambah scope Drive di appsscript.json jika perlu, dan buat New Deployment.'
          );
        } else {
          setFolderWarning(
            rawMsg ||
              'Amaran: Folder rujukan Google Drive tidak dijumpai atau salah lokasi. Sila semak di Admin Panel.'
          );
        }
      }
    };

    const gasRun = window.google?.script?.run;
    if (gasRun) {
      let cancelled = false;
      gasRun
        .withSuccessHandler((res: unknown) => {
          if (cancelled || !res || typeof res !== 'object') return;
          handleFolderValidationResult(res as { valid?: boolean; message?: string });
        })
        .withFailureHandler(() => {
          if (!cancelled) setFolderWarning('');
        })
        .gasCheckDriveFolder(rawFolder);

      return () => {
        cancelled = true;
      };
    }

    if (!appConfig.gasWebAppUrl) {
      setFolderWarning('');
      return;
    }

    let cancelled = false;
    const sep = appConfig.gasWebAppUrl.includes('?') ? '&' : '?';
    fetch(
      `${appConfig.gasWebAppUrl}${sep}action=checkDriveFolder&folderUrl=${encodeURIComponent(rawFolder)}&t=${Date.now()}`,
      { method: 'GET', cache: 'no-store' }
    )
      .then(async (res) => {
        if (cancelled) return;
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          setFolderWarning('');
          return;
        }
        const data = (await res.json()) as { valid?: boolean; message?: string };
        if (cancelled) return;
        handleFolderValidationResult(data);
      })
      .catch(() => {
        if (!cancelled) setFolderWarning('');
      });

    return () => {
      cancelled = true;
    };
  }, [appConfig.approvalFolderUrl, appConfig.gasWebAppUrl]);

  const handleRosterPeriodChange = (val: string) => {
    if (!val || !val.includes('|')) return;
    const [newStart, newEnd] = val.split('|');
    setActiveTargetSheetUrl('');
    setActiveTargetSheetName('');
    setLastSubmittedSheetUrl('');
    setLastSubmittedSheetName('');
    setAppConfig((prev) => ({
      ...prev,
      startDate: newStart,
      endDate: newEnd,
      recordSpreadsheetUrl: stripSheetGid(prev.recordSpreadsheetUrl),
    }));
    setDailySelections({});
    const formattedRange = `${formatDateDisplay(newStart)} - ${formatDateDisplay(newEnd)}`;
    showNotification(
      'Pengesahan Tempoh Tugasan',
      `Anda telah memilih interval tarikh tugasan: ${formattedRange}. Sila pastikan anda menanda pengesahan peringatan sebelum meneruskan permohonan.`,
      'success',
      false
    );
  };

  const handleToggleCheck = (idx: number) => {
    setChecks((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      if (next.every(Boolean)) {
        setShowStep1Alert(false);
      }
      return next;
    });
  };

  const handleProceedToStep2 = () => {
    if (!checks.every(Boolean)) {
      setShowStep1Alert(true);
      return;
    }
    setShowStep1Alert(false);
    setShowValidationErrors(false);
    setStep(2);
    setTimeout(() => {
      namaPemohonRef.current?.focus();
    }, 40);
  };

  const handleDemoForceActivate = () => {
    setAppConfig((prev) => ({ ...prev, forceStatus: 'OPEN' }));
    setSubmittedSuccess(false);
    showNotification(
      'Mod Demo Aktif',
      'Borang permohonan telah diaktifkan secara paksa untuk tujuan pengujian demo.',
      'success',
      false
    );
  };

  const handleDemoAutoTickAndOpen = () => {
    setChecks(WARNING_ITEMS.map(() => true));
    setShowStep1Alert(false);
    setShowValidationErrors(false);
    setStep(2);
    setTimeout(() => {
      namaPemohonRef.current?.focus();
    }, 40);
  };

  const syncStaffByEmailIfEmpty = (targetEmail: string) => {
    const matchedEntry = staffRecordsByEmail[normalizeEmailKey(targetEmail)];
    if (matchedEntry && !namaPemohon.trim()) {
      if (matchedEntry.nama && STAFF_NAMES.includes(matchedEntry.nama)) {
        setNamaPemohon(matchedEntry.nama);
      }
      if (matchedEntry.noTelefon) {
        setPhone(matchedEntry.noTelefon);
        setPhoneVerified(false);
        setPhoneLookupStatus('found');
      }
    }
  };

  const handleVerifyPhone = () => {
    const digits = phone.trim().replace(/\D/g, '');
    if (digits.length < 9) {
      setShowValidationErrors(true);
      setPhoneVerified(false);
      showNotification(
        'Nombor Telefon Tidak Lengkap',
        'Sila masukkan nombor telefon bimbit yang sah (minimum 9 digit) sebelum menekan butang Sahkan.',
        'warning',
        false,
        undefined,
        'OK',
        () => {
          setTimeout(() => {
            phoneInputRef.current?.focus();
          }, 40);
        }
      );
      return;
    }
    setPhoneVerified(true);
  };

  const handleToggleUseDetectedEmail = (checked: boolean) => {
    setUseDetectedEmail(checked);
    if (checked && detectedLoginEmail) {
      setEmail(detectedLoginEmail);
      setShowAccountSwitcher(false);
      syncStaffByEmailIfEmpty(detectedLoginEmail);
    } else if (!checked) {
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 40);
    }
  };

  const handleSelectBrowserEmail = (chosenEmail: string) => {
    const clean = chosenEmail.trim();
    if (!isValidEmailAddress(clean)) return;
    rememberBrowserEmail(clean, true);
    setUseDetectedEmail(true);
    setEmail(clean);
    setShowAccountSwitcher(false);
    syncStaffByEmailIfEmpty(clean);
  };

  const handleSwitchToManualEmail = () => {
    setUseDetectedEmail(false);
    setEmail('');
    setShowAccountSwitcher(false);
    setTimeout(() => {
      emailInputRef.current?.focus();
    }, 40);
  };

  const handleNamaPemohonChange = (selectedName: string) => {
    setNamaPemohon(selectedName);
    setPhoneVerified(false);
    const reqId = ++phoneLookupReqRef.current;

    if (!selectedName.trim()) {
      setPhone('');
      setPhoneLookupStatus('idle');
      return;
    }

    const nameKey = normalizeStaffKey(selectedName);
    const cachedEntry = staffRecordsByName[nameKey];
    const cachedPhone = staffPhoneDirectory[nameKey] || cachedEntry?.noTelefon || '';

    if (cachedPhone) {
      setPhone(cachedPhone);
    } else {
      setPhone('');
    }
    if (!email.trim() && cachedEntry?.email && !useDetectedEmail) {
      setEmail(cachedEntry.email);
    }

    const gasRun = window.google?.script?.run;
    const hasBackend = Boolean(gasRun || appConfig.gasWebAppUrl);

    if (!hasBackend) {
      setPhoneLookupStatus(cachedPhone ? 'found' : 'missing');
      if (!cachedPhone) {
        showMissingPhonePopup(selectedName);
      }
      return;
    }

    setPhoneLookupStatus('checking');

    const handleLookupResult = (
      res: { status?: string; found?: boolean; noTelefon?: string; email?: string; message?: string } | null,
      lookupErrorDetail?: string
    ) => {
      if (reqId !== phoneLookupReqRef.current) return;

      if (lookupErrorDetail) {
        recordErrorLog(
          'Carian No. Telefon',
          'Ralat Semakan No. Telefon',
          `Ralat semasa menyemak nombor telefon bagi nama "${selectedName}" dalam Senarai Nama PPPU5: ${lookupErrorDetail}`
        );
        setPhoneLookupStatus(cachedPhone ? 'found' : 'missing');
        if (!cachedPhone) {
          showMissingPhonePopup(selectedName);
        }
        return;
      }

      if (res && res.status === 'error') {
        recordErrorLog(
          'Carian No. Telefon',
          'Ralat Semakan No. Telefon (Senarai Nama PPPU5)',
          res.message || `Pelayan GAS memulangkan ralat semasa menyemak nama "${selectedName}".`
        );
        setPhoneLookupStatus(cachedPhone ? 'found' : 'missing');
        if (!cachedPhone) {
          showMissingPhonePopup(selectedName);
        }
        return;
      }

      if (res && res.status === 'ok') {
        if (res.email && !email.trim() && !useDetectedEmail) {
          setEmail(res.email);
        }
        if (res.found && res.noTelefon) {
          const remotePhone = String(res.noTelefon).trim();
          setPhone(remotePhone);
          setPhoneLookupStatus('found');
          setStaffPhoneDirectory((prev) => ({ ...prev, [nameKey]: remotePhone }));
          setStaffRecordsByName((prev) => ({
            ...prev,
            [nameKey]: {
              email: (res.email || cachedEntry?.email || email.trim()).toLowerCase(),
              nama: nameKey,
              noTelefon: remotePhone,
            },
          }));
        } else {
          setPhoneLookupStatus('missing');
          if (!cachedPhone) {
            setPhone('');
            showMissingPhonePopup(selectedName);
          }
        }
        return;
      }

      setPhoneLookupStatus(cachedPhone ? 'found' : 'missing');
      if (!cachedPhone) {
        showMissingPhonePopup(selectedName);
      }
    };

    if (gasRun) {
      gasRun
        .withSuccessHandler((res: unknown) => {
          handleLookupResult(
            res && typeof res === 'object'
              ? (res as { status?: string; found?: boolean; noTelefon?: string; email?: string; message?: string })
              : null
          );
        })
        .withFailureHandler((err: unknown) => {
          handleLookupResult(null, `gasLookupStaffPhone gagal: ${String(err || 'Ralat pelayan GAS')}`);
        })
        .gasLookupStaffPhone(selectedName, effectiveSheetUrl, email.trim());
    } else if (appConfig.gasWebAppUrl) {
      const sep = appConfig.gasWebAppUrl.includes('?') ? '&' : '?';
      const url = `${appConfig.gasWebAppUrl}${sep}action=lookupStaffPhone&nama=${encodeURIComponent(
        selectedName
      )}&email=${encodeURIComponent(email.trim())}&fallbackUrl=${encodeURIComponent(
        effectiveSheetUrl
      )}&t=${Date.now()}`;
      fetch(url, { method: 'GET', cache: 'no-store' })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} (${res.statusText || 'Ralat HTTP'})`);
          }
          const ct = res.headers.get('content-type') || '';
          if (!ct.includes('application/json')) {
            throw new Error(`Respons pelayan bukan JSON (${ct || 'text/html'}). Pastikan URL GAS & deployment adalah terkini.`);
          }
          return (await res.json()) as {
            status?: string;
            found?: boolean;
            noTelefon?: string;
            email?: string;
            message?: string;
          };
        })
        .then((data) => handleLookupResult(data))
        .catch((err: unknown) => {
          const detail = err instanceof Error ? err.message : String(err || 'Ralat rangkaian');
          handleLookupResult(null, detail);
        });
    }
  };

  const handleShiftChange = (isoKey: string, shiftVal: string) => {
    setDailySelections((prev) => {
      const existing = prev[isoKey] || { shift: '', replacementDate: '', note: '' };
      const needsDate = shiftVal === 'CG' || shiftVal === 'HKA OFF' || shiftVal === 'HK OFF';
      const needsNote = shiftVal === 'KURSUS' || shiftVal === 'LAIN-LAIN';
      return {
        ...prev,
        [isoKey]: {
          shift: shiftVal,
          replacementDate: needsDate ? existing.replacementDate : '',
          note: needsNote ? (existing.note || '').toUpperCase() : '',
        },
      };
    });
  };

  const handleReplacementDateChange = (isoKey: string, dateVal: string) => {
    setDailySelections((prev) => ({
      ...prev,
      [isoKey]: {
        ...(prev[isoKey] || { shift: '', replacementDate: '', note: '' }),
        replacementDate: dateVal,
      },
    }));
  };

  const handleNoteChange = (isoKey: string, noteVal: string) => {
    const upperNote = noteVal.toUpperCase();
    setDailySelections((prev) => ({
      ...prev,
      [isoKey]: {
        ...(prev[isoKey] || { shift: '', replacementDate: '', note: '' }),
        note: upperNote,
      },
    }));
  };

  const compressImageDataUrl = (dataUrl: string, maxDimension = 1600, quality = 0.82): Promise<{ base64: string; size: number; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = compressedUrl.includes(',') ? compressedUrl.split(',')[1] : compressedUrl;
        const approxBytes = Math.round((base64.length * 3) / 4);
        resolve({ base64, size: approxBytes, mimeType: 'image/jpeg' });
      };
      img.onerror = () => reject(new Error('Gagal memproses gambar'));
      img.src = dataUrl;
    });
  };

  const handleApprovalFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (folderWarning) {
      showNotification('Amaran Lokasi Folder', folderWarning, 'warning', false);
    }

    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png)$/i.test(file.name);
    const maxNonImageBytes = 5 * 1024 * 1024;
    const maxRawImageBytes = 15 * 1024 * 1024;

    if (!isImage && file.size > maxNonImageBytes) {
      showNotification(
        'Saiz Fail Terlalu Besar',
        'Had maksimum saiz fail PDF/dokumen ialah 5 MB. Sila pilih fail yang lebih kecil atau gunakan Pautan Google Drive.',
        'warning',
        false
      );
      e.target.value = '';
      return;
    }

    if (isImage && file.size > maxRawImageBytes) {
      showNotification(
        'Saiz Gambar Terlalu Besar',
        'Had maksimum saiz gambar asal ialah 15 MB. Sila pilih gambar yang lebih kecil.',
        'warning',
        false
      );
      e.target.value = '';
      return;
    }

    setIsReadingFile(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (isImage && file.size > 700 * 1024) {
          const compressed = await compressImageDataUrl(dataUrl);
          const baseName = file.name.replace(/\.[^.]+$/, '');
          setSuratFile({
            name: `${baseName}.jpg`,
            mimeType: compressed.mimeType,
            size: compressed.size,
            base64: compressed.base64,
          });
        } else {
          const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
          setSuratFile({
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            base64,
          });
        }
      } catch {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        setSuratFile({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          base64,
        });
      } finally {
        setIsReadingFile(false);
      }
    };
    reader.onerror = () => {
      setIsReadingFile(false);
      recordErrorLog('Muat Naik Fail', 'Ralat Membaca Fail', 'Gagal membaca fail yang dipilih. Sila cuba lagi.');
    };
    reader.readAsDataURL(file);
  };

  const getMissingFormFields = (): string[] => {
    const missing: string[] = [];
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    const cleanName = namaPemohon.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneDigits = cleanPhone.replace(/\D/g, '');

    if (!checks.every(Boolean)) {
      missing.push('Kesemua 5 kotak Peringatan Penting (Langkah 1) belum ditanda.');
    }
    if (dateItems.length === 0) {
      missing.push('Tempoh roster / julat tarikh tugasan tidak sah.');
    }
    if (!cleanEmail) {
      missing.push('Alamat E-mel belum diisi.');
    } else if (!emailPattern.test(cleanEmail)) {
      missing.push('Format Alamat E-mel tidak sah.');
    }
    if (!cleanName) {
      missing.push('Nama Pemohon belum dipilih daripada senarai.');
    }
    if (!cleanPhone) {
      missing.push('No. Telefon Bimbit belum diisi.');
    } else if (phoneDigits.length < 9) {
      missing.push('No. Telefon Bimbit tidak lengkap (minimum 9 digit).');
    } else if (!phoneVerified) {
      missing.push('No. Telefon Bimbit belum disahkan (sila klik butang Sahkan).');
    }

    let selectedShiftCount = 0;
    dateItems.forEach((item) => {
      const sel = dailySelections[item.isoKey];
      if (!sel?.shift) return;
      selectedShiftCount++;
      const needsDate = sel.shift === 'CG' || sel.shift === 'HKA OFF' || sel.shift === 'HK OFF';
      const needsNote = sel.shift === 'KURSUS' || sel.shift === 'LAIN-LAIN';
      if (needsDate && !sel.replacementDate) {
        missing.push(`Tarikh Pilihan / Gantian belum dipilih untuk ${item.fullColTitle} (${sel.shift}).`);
      }
      if (needsNote && !sel.note.trim()) {
        const remarkType = sel.shift === 'KURSUS' ? 'Catatan / nama kursus (wajib *)' : 'Catatan / alasan Lain-lain (wajib *)';
        missing.push(`${remarkType} belum diisi untuk ${item.fullColTitle} (${sel.shift}).`);
      }
    });

    if (dateItems.length > 0 && selectedShiftCount === 0) {
      missing.push('Sekurang-kurangnya satu (1) pilihan syif / status harian mesti dipilih.');
    }

    return missing;
  };

  const submitApplicationData = async (openWhatsapp: boolean) => {
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    const cleanName = namaPemohon.trim().toUpperCase();
    const cleanSuratLink = suratMode === 'link' ? suratKelulusan.trim() : '';

    if (isReadingFile) {
      showNotification(
        'Sila Tunggu Sebentar',
        'Fail Surat Kelulusan sedang diproses sebelum dimuat naik. Sila cuba hantar semula dalam beberapa saat.',
        'warning',
        false
      );
      return;
    }

    const missingFields = getMissingFormFields();
    if (missingFields.length > 0) {
      setShowValidationErrors(true);
      showNotification(
        'Borang Belum Lengkap',
        `Penghantaran dihalang. Sila lengkapkan perkara berikut sebelum menghantar borang:\n\n${missingFields
          .map((item, idx) => `${idx + 1}. ${item}`)
          .join('\n')}\n\nNota: Muat naik Surat Kelulusan bagi permohonan shift malam / kursus atau yang berkenaan.`,
        'warning',
        false
      );
      return;
    }

    setShowValidationErrors(false);

    if (suratMode === 'upload' && suratFile && folderWarning) {
      showNotification('Amaran Lokasi Folder', folderWarning, 'warning', false);
      return;
    }

    const dateColumns: string[] = [];
    const sheetDateColumns: string[] = [];
    const orderedShifts: string[] = [];
    const summaryLines: string[] = [];

    dateItems.forEach((item) => {
      dateColumns.push(item.fullColTitle);
      sheetDateColumns.push(item.sheetColTitle);
      const sel = dailySelections[item.isoKey];
      let val = sel?.shift || '';
      let waVal = val;

      if (val && sel?.replacementDate) {
        const formattedDayMonth = formatDateDayMonth(sel.replacementDate);
        val += `\n${formattedDayMonth}`;
        waVal += ` (${formattedDayMonth})`;
      } else if (val && sel?.note?.trim()) {
        const cleanUpperNote = sel.note.trim().toUpperCase();
        val += `\n(${cleanUpperNote})`;
        waVal += ` (${cleanUpperNote})`;
      }

      orderedShifts.push(val);
      if (val) {
        summaryLines.push(`• ${item.fullColTitle}: ${waVal}`);
      }
    });

    const tempohTugasan = `${formatDateDisplay(appConfig.startDate)} - ${formatDateDisplay(appConfig.endDate)}`;
    const fallbackSuratText =
      suratMode === 'upload' && suratFile ? `Fail Dimuat Naik: ${suratFile.name}` : cleanSuratLink;

    const baseRecord: ApplicationRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      email: cleanEmail,
      noTelefon: cleanPhone,
      namaPemohon: cleanName,
      tempohTugasan,
      dateColumns,
      sheetDateColumns,
      orderedShifts,
      suratKelulusan: fallbackSuratText,
      sendEmailCopy,
    };

    let waText =
      `*PERMOHONAN JADUAL TUGAS PPP U5*\n\n` +
      `*Tempoh:* ${tempohTugasan}\n` +
      `*Nama:* ${cleanName}\n` +
      `*Tel:* ${cleanPhone}\n` +
      `*Emel:* ${cleanEmail}\n`;
    if (fallbackSuratText) {
      waText += `*Surat Kelulusan:* ${fallbackSuratText}\n`;
    }
    waText +=
      `\n*Pilihan Syif Harian:*\n` +
      (summaryLines.length > 0 ? summaryLines.join('\n') : '- Tiada syif khusus dipilih');

    const finalizeSave = (options?: {
      customMsg?: string;
      notifyUser?: boolean;
      savedFileUrl?: string;
      savedSheetUrl?: string;
      savedSheetName?: string;
    }) => {
      const savedUrl = options?.savedFileUrl || '';
      const resolvedSavedSheetUrl =
        options?.savedSheetUrl && options.savedSheetUrl.startsWith('http')
          ? options.savedSheetUrl
          : '';
      const resolvedSavedSheetName =
        options?.savedSheetName || `TUGAS PPPU5 ${tempohTugasan}`;
      if (resolvedSavedSheetUrl) {
        setLastSubmittedSheetUrl(resolvedSavedSheetUrl);
        setLastSubmittedSheetName(resolvedSavedSheetName);
        setActiveTargetSheetUrl(resolvedSavedSheetUrl);
        setActiveTargetSheetName(resolvedSavedSheetName);
        setAppConfig((prev) => ({ ...prev, recordSpreadsheetUrl: resolvedSavedSheetUrl }));
      }
      if (!resolvedSavedSheetUrl || !/gid=\d+/i.test(resolvedSavedSheetUrl)) {
        setTargetSheetRefreshNonce((n) => n + 1);
      }
      const finalRecord: ApplicationRecord = {
        ...baseRecord,
        suratKelulusan: savedUrl || baseRecord.suratKelulusan,
      };
      setRecords((prev) => [finalRecord, ...prev]);
      if (cleanEmail) {
        rememberBrowserEmail(cleanEmail, true);
      }
      if (cleanName && cleanPhone) {
        const nameKey = normalizeStaffKey(cleanName);
        const lowerEmail = normalizeEmailKey(cleanEmail);
        setStaffPhoneDirectory((prev) => ({ ...prev, [nameKey]: cleanPhone }));
        setStaffRecordsByName((prev) => ({
          ...prev,
          [nameKey]: {
            email: lowerEmail || prev[nameKey]?.email || '',
            nama: nameKey,
            noTelefon: cleanPhone,
          },
        }));
        if (lowerEmail) {
          setStaffRecordsByEmail((prev) => ({
            ...prev,
            [lowerEmail]: {
              email: lowerEmail,
              nama: nameKey,
              noTelefon: cleanPhone,
            },
          }));
        }
        setPhoneLookupStatus('found');
      }
      setLastSavedFileUrl(savedUrl);
      setWhatsappSummaryText(waText);
      setConfirmModalOpen(false);
      setSubmittedSuccess(true);
      setRestoredDraftAt(null);
      setLastDraftSavedAt(null);
      try {
        localStorage.removeItem(STORAGE_FORM_DRAFT_KEY);
      } catch {
        // Ignore storage errors
      }

      const sheetSaveLogMessage =
        options?.customMsg ||
        (options?.savedSheetName
          ? `Data berjaya disimpan ke helaian '${options.savedSheetName}'.`
          : `Data berjaya disimpan ke helaian berkenaan (${tempohTugasan}).`);

      recordErrorLog(
        'Simpanan Google Sheets',
        'Data Berjaya Disimpan ke Helaian Berkenaan',
        sheetSaveLogMessage,
        'success'
      );

      const shouldNotify =
        typeof options?.notifyUser === 'boolean'
          ? options.notifyUser
          : appConfig.enableSaveNotification !== false;

      if (openWhatsapp) {
        setWhatsappModalOpen(true);
      } else if (shouldNotify) {
        showNotification(
          `Permohonan bagi Tugasan ${tempohTugasan}`,
          'Berjaya di rekodkan\nTerima kasih.',
          'success',
          true,
          savedUrl || undefined
        );
      }
    };

    const payload = {
      action: 'submitApplication',
      ...baseRecord,
      suratKelulusan: cleanSuratLink,
      suratKelulusanFile: suratMode === 'upload' && suratFile ? suratFile : null,
      approvalFolderUrl: appConfig.approvalFolderUrl,
      enableSaveNotification: appConfig.enableSaveNotification !== false,
      recordSpreadsheetUrl: activeTargetSheetUrl || stripSheetGid(appConfig.recordSpreadsheetUrl),
    };

    const gasRun = window.google?.script?.run;
    if (gasRun) {
      setIsSubmitting(true);
      gasRun
        .withSuccessHandler((res: unknown) => {
          setIsSubmitting(false);
          const result = res as {
            status?: string;
            message?: string;
            notifyUser?: boolean;
            fileUrl?: string;
            sheetUrl?: string;
            sheetName?: string;
          } | null;
          if (result && result.status === 'folder_error') {
            setConfirmModalOpen(false);
            recordErrorLog(
              'Google Drive',
              'Ralat Lokasi Folder Google Drive',
              result.message || 'Lokasi folder rujukan Google Drive tiada atau tidak sah.'
            );
          } else if (result && result.status === 'success') {
            finalizeSave({
              customMsg: result.message,
              notifyUser: result.notifyUser,
              savedFileUrl: result.fileUrl,
              savedSheetUrl: result.sheetUrl,
              savedSheetName: result.sheetName,
            });
          } else {
            setConfirmModalOpen(false);
            recordErrorLog(
              'Hantar Permohonan',
              'Ralat Menyimpan Permohonan (GAS)',
              result?.message || 'Pelayan Google Apps Script gagal menyimpan permohonan (status tidak sah).'
            );
          }
        })
        .withFailureHandler((err: unknown) => {
          setIsSubmitting(false);
          setConfirmModalOpen(false);
          recordErrorLog(
            'Hantar Permohonan',
            'Ralat Pelayan Google Apps Script',
            `Gagal memanggil gasSubmitApplication: ${String(err || 'Ralat pelayan tidak diketahui')}`
          );
        })
        .gasSubmitApplication(payload);
    } else if (appConfig.gasWebAppUrl) {
      setIsSubmitting(true);
      try {
        const res = await fetch(appConfig.gasWebAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          setIsSubmitting(false);
          setConfirmModalOpen(false);
          recordErrorLog(
            'Hantar Permohonan',
            `Ralat Pelayan GAS (HTTP ${res.status})`,
            `Permohonan gagal disimpan. Pelayan memulangkan status HTTP ${res.status} (${res.statusText || 'Ralat HTTP'}).`
          );
          return;
        }
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          setIsSubmitting(false);
          setConfirmModalOpen(false);
          recordErrorLog(
            'Hantar Permohonan',
            'Ralat Respons Pelayan GAS',
            `Pelayan Google Apps Script tidak memulangkan JSON yang sah (Content-Type: ${contentType || 'tidak diketahui'}). Pastikan Code.gs terkini telah dideploy sebagai Web App (Anyone) dan kebenaran akses telah diluluskan.`
          );
          return;
        }
        const result = (await res.json()) as {
          status?: string;
          message?: string;
          notifyUser?: boolean;
          fileUrl?: string;
          sheetUrl?: string;
          sheetName?: string;
        };
        if (result.status === 'folder_error') {
          setIsSubmitting(false);
          setConfirmModalOpen(false);
          recordErrorLog(
            'Google Drive',
            'Ralat Lokasi Folder Google Drive',
            result.message || 'Lokasi folder rujukan Google Drive tiada atau salah.'
          );
          return;
        }
        if (result.status !== 'success') {
          setIsSubmitting(false);
          setConfirmModalOpen(false);
          recordErrorLog(
            'Hantar Permohonan',
            'Ralat Simpanan Google Sheet',
            result.message || `Gagal menyimpan ke Google Sheet (status: ${result.status || 'tidak diketahui'}).`
          );
          return;
        }
        setIsSubmitting(false);
        finalizeSave({
          customMsg: result.message || `Data berjaya disimpan ke helaian berkenaan (${tempohTugasan}).`,
          notifyUser: result.notifyUser,
          savedFileUrl: result.fileUrl,
          savedSheetUrl: result.sheetUrl,
          savedSheetName: result.sheetName,
        });
      } catch (err) {
        setIsSubmitting(false);
        setConfirmModalOpen(false);
        const errDetail = err instanceof Error ? err.message : String(err || 'Ralat rangkaian / CORS');
        recordErrorLog(
          'Hantar Permohonan',
          'Ralat Sambungan / Penghantaran ke Google Sheet',
          payload.suratKelulusanFile
            ? `Gagal memuat naik fail "${payload.suratKelulusanFile.name}" dan menghantar borang ke pelayan GAS: ${errDetail}`
            : `Gagal menghubungi atau menghantar data ke pelayan Google Apps Script: ${errDetail}`
        );
      }
    } else {
      finalizeSave({
        notifyUser: appConfig.enableSaveNotification !== false,
      });
    }
  };

  const handleOpenSubmitConfirmation = (defaultWhatsapp = true) => {
    if (isReadingFile) {
      showNotification(
        'Sila Tunggu Sebentar',
        'Fail Surat Kelulusan sedang diproses sebelum dimuat naik. Sila cuba hantar semula dalam beberapa saat.',
        'warning',
        false
      );
      return;
    }

    const missingFields = getMissingFormFields();
    if (missingFields.length > 0) {
      setShowValidationErrors(true);
      showNotification(
        'Borang Belum Lengkap',
        `Penghantaran dihalang. Sila lengkapkan perkara berikut sebelum menghantar borang:\n\n${missingFields
          .map((item, idx) => `${idx + 1}. ${item}`)
          .join('\n')}\n\nNota: Muat naik Surat Kelulusan bagi permohonan shift malam / kursus atau yang berkenaan.`,
        'warning',
        false
      );
      return;
    }

    setShowValidationErrors(false);

    if (suratMode === 'upload' && suratFile && folderWarning) {
      showNotification('Amaran Lokasi Folder', folderWarning, 'warning', false);
      return;
    }

    const selectedShifts: ConfirmationShiftItem[] = [];
    dateItems.forEach((item) => {
      const sel = dailySelections[item.isoKey];
      if (!sel?.shift) return;
      let shiftDisplay = sel.shift;
      if (sel.replacementDate) {
        shiftDisplay += ` (${formatDateDayMonth(sel.replacementDate)})`;
      } else if (sel.note?.trim()) {
        shiftDisplay += ` (${sel.note.trim().toUpperCase()})`;
      }
      selectedShifts.push({
        dateTitle: item.fullColTitle,
        shiftDisplay,
      });
    });

    const cleanSuratLink = suratMode === 'link' ? suratKelulusan.trim() : '';
    const suratKelulusanDisplay =
      suratMode === 'upload' && suratFile
        ? `Fail: ${suratFile.name}`
        : cleanSuratLink || 'Tiada lampiran';

    setConfirmSummary({
      tempohTugasan: `${formatDateDisplay(appConfig.startDate)} - ${formatDateDisplay(appConfig.endDate)}`,
      svName: appConfig.svName,
      email: email.trim(),
      namaPemohon: namaPemohon.trim().toUpperCase(),
      noTelefon: phone.trim(),
      suratKelulusanDisplay,
      sendEmailCopy,
      selectedShifts,
    });
    setConfirmDefaultWhatsapp(defaultWhatsapp);
    setConfirmModalOpen(true);
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleOpenSubmitConfirmation(true);
  };

  const handleSaveAdminConfig = (nextConfig: AppConfig) => {
    const periodChanged =
      nextConfig.startDate !== appConfig.startDate || nextConfig.endDate !== appConfig.endDate;
    const sanitizedNextConfig: AppConfig = periodChanged
      ? { ...nextConfig, recordSpreadsheetUrl: stripSheetGid(nextConfig.recordSpreadsheetUrl) }
      : nextConfig;
    if (periodChanged) {
      setActiveTargetSheetUrl('');
      setActiveTargetSheetName('');
      setLastSubmittedSheetUrl('');
      setLastSubmittedSheetName('');
    }

    const gasRun = window.google?.script?.run;
    if (gasRun) {
      gasRun
        .withSuccessHandler((res: unknown) => {
          const result = res as {
            status?: string;
            message?: string;
            recordSpreadsheetUrl?: string;
            approvalFolderUrl?: string;
            sheetName?: string;
            sheetMatched?: boolean;
            tajuk1?: string;
            footerText?: string;
            appVersion?: string | number;
            editionName?: string;
            versionUpdatedAt?: string;
          } | null;
          if (result && result.status === 'error') {
            recordErrorLog('Tetapan Admin', 'Ralat Simpan Tetapan', result.message || 'Gagal menyimpan tetapan ke SETTINGS.');
            showNotification('Ralat Simpan Tetapan', result.message || 'Gagal menyimpan tetapan ke Google Sheet.', 'error', false);
            return;
          }
          const rawUpdatedUrl = result?.recordSpreadsheetUrl || sanitizedNextConfig.recordSpreadsheetUrl;
          const isMatched =
            result?.sheetMatched === true ||
            (typeof result?.sheetMatched === 'undefined' && Boolean(result?.sheetName));
          const updatedSheetUrl =
            periodChanged && !isMatched && /gid=\d+/i.test(rawUpdatedUrl)
              ? stripSheetGid(rawUpdatedUrl)
              : rawUpdatedUrl;
          if (updatedSheetUrl) {
            setActiveTargetSheetUrl(updatedSheetUrl);
          }
          if (isMatched && result?.sheetName) {
            setActiveTargetSheetName(result.sheetName);
          }
          setAppConfig({
            ...sanitizedNextConfig,
            recordSpreadsheetUrl: updatedSheetUrl,
            approvalFolderUrl:
              result?.approvalFolderUrl && !sanitizedNextConfig.approvalFolderUrl
                ? result.approvalFolderUrl
                : sanitizedNextConfig.approvalFolderUrl,
            tajuk1: result?.tajuk1 ? String(result.tajuk1).trim() : sanitizedNextConfig.tajuk1,
            footerText: result?.footerText ? String(result.footerText).trim() : sanitizedNextConfig.footerText,
            appVersion:
              result?.appVersion !== undefined && result?.appVersion !== null && String(result.appVersion).trim()
                ? normalizeAppVersion(result.appVersion, sanitizedNextConfig.appVersion)
                : normalizeAppVersion(sanitizedNextConfig.appVersion),
            editionName: result?.editionName ? String(result.editionName).trim() : sanitizedNextConfig.editionName,
            versionUpdatedAt: result?.versionUpdatedAt
              ? String(result.versionUpdatedAt).trim()
              : sanitizedNextConfig.versionUpdatedAt,
          });
          setDailySelections({});
          setAdminModalOpen(false);
          showNotification(
            'Berjaya',
            'Tetapan admin, versi, dan pautan Google Sheets telah berjaya disimpan ke helaian SETTINGS!',
            'success',
            false
          );
        })
        .withFailureHandler((err: unknown) => {
          recordErrorLog('Tetapan Admin', 'Ralat Simpan Tetapan', `Gagal menyimpan tetapan: ${String(err)}`);
        })
        .gasSaveConfig(sanitizedNextConfig);
    } else if (sanitizedNextConfig.gasWebAppUrl) {
      fetch(sanitizedNextConfig.gasWebAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveConfig', config: sanitizedNextConfig }),
      })
        .then((r) => r.json())
        .then(
          (
            res: {
              status?: string;
              message?: string;
              recordSpreadsheetUrl?: string;
              approvalFolderUrl?: string;
              sheetName?: string;
              sheetMatched?: boolean;
              tajuk1?: string;
              footerText?: string;
              appVersion?: string | number;
              editionName?: string;
              versionUpdatedAt?: string;
            } | null
          ) => {
            if (!res) return;
            if (res.status === 'error') {
              recordErrorLog('Tetapan Admin', 'Ralat Simpan Tetapan', res.message || 'Gagal menyimpan tetapan ke SETTINGS.');
              return;
            }
            const isMatched =
              res.sheetMatched === true ||
              (typeof res.sheetMatched === 'undefined' && Boolean(res.sheetName));
            const rawUrl = res.recordSpreadsheetUrl || '';
            const cleanUrl =
              rawUrl && periodChanged && !isMatched && /gid=\d+/i.test(rawUrl)
                ? stripSheetGid(rawUrl)
                : rawUrl;
            if (cleanUrl) {
              setActiveTargetSheetUrl(cleanUrl);
            }
            if (isMatched && res.sheetName) {
              setActiveTargetSheetName(res.sheetName);
            }
            setAppConfig((prev) => ({
              ...prev,
              recordSpreadsheetUrl: cleanUrl || prev.recordSpreadsheetUrl,
              approvalFolderUrl:
                res.approvalFolderUrl && !sanitizedNextConfig.approvalFolderUrl
                  ? res.approvalFolderUrl
                  : prev.approvalFolderUrl,
              tajuk1: res.tajuk1 ? String(res.tajuk1).trim() : prev.tajuk1,
              footerText: res.footerText ? String(res.footerText).trim() : prev.footerText,
              appVersion:
                res.appVersion !== undefined && res.appVersion !== null && String(res.appVersion).trim()
                  ? normalizeAppVersion(res.appVersion, prev.appVersion)
                  : prev.appVersion,
              editionName: res.editionName ? String(res.editionName).trim() : prev.editionName,
              versionUpdatedAt: res.versionUpdatedAt
                ? String(res.versionUpdatedAt).trim()
                : prev.versionUpdatedAt,
            }));
          }
        )
        .catch(() => {
          fetch(sanitizedNextConfig.gasWebAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'saveConfig', config: sanitizedNextConfig }),
          }).catch(() => {});
        });
      setAppConfig(sanitizedNextConfig);
      setDailySelections({});
      setAdminModalOpen(false);
      showNotification('Berjaya', 'Tetapan sistem, versi, dan pautan Google Sheets telah dikemaskini ke helaian SETTINGS.', 'success', false);
    } else {
      setAppConfig(sanitizedNextConfig);
      setDailySelections({});
      setAdminModalOpen(false);
      showNotification('Berjaya', 'Tetapan sistem telah dikemaskini dan disimpan.', 'success', false);
    }
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(STORAGE_FORM_DRAFT_KEY);
    } catch {
      // Ignore storage errors
    }
    setRestoredDraftAt(null);
    setLastDraftSavedAt(null);
    setStep(1);
    setChecks(WARNING_ITEMS.map(() => false));
    setNamaPemohon('');
    setPhone('');
    setPhoneVerified(false);
    setPhoneLookupStatus('idle');
    setDailySelections({});
    setSuratMode('upload');
    setSuratKelulusan('');
    setSuratFile(null);
    setSendEmailCopy(false);
    setShowStep1Alert(false);
    setShowValidationErrors(false);
  };

  const handleResetNewApplication = () => {
    try {
      localStorage.removeItem(STORAGE_FORM_DRAFT_KEY);
    } catch {
      // Ignore storage errors
    }
    setRestoredDraftAt(null);
    setLastDraftSavedAt(null);
    setSubmittedSuccess(false);
    setStep(1);
    setChecks(WARNING_ITEMS.map(() => false));
    setPhoneVerified(false);
    setDailySelections({});
    setSuratKelulusan('');
    setSuratFile(null);
    setLastSavedFileUrl('');
    setLastSubmittedSheetUrl('');
    setLastSubmittedSheetName('');
    setShowStep1Alert(false);
    setShowValidationErrors(false);
  };

  const handleFinishApplication = () => {
    const tempohTugasan = `${formatDateDisplay(appConfig.startDate)} - ${formatDateDisplay(appConfig.endDate)}`;
    handleResetNewApplication();
    setNamaPemohon('');
    setPhone('');
    setPhoneLookupStatus('idle');
    setSendEmailCopy(false);
    setWhatsappSummaryText('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showNotification(
      'Permohonan Selesai',
      `Anda telah selesai memohon bagi jadual ${tempohTugasan}. Terima kasih.`,
      'success',
      false,
      undefined,
      'OK'
    );
  };

  const filledShiftCount = useMemo(
    () => Object.values(dailySelections).filter((item) => Boolean(item.shift)).length,
    [dailySelections]
  );

  const warningItems = useMemo(
    () =>
      buildWarningItems(
        appConfig.startDate,
        appConfig.endDate,
        appConfig.closingDate,
        appConfig.svName
      ),
    [appConfig.startDate, appConfig.endDate, appConfig.closingDate, appConfig.svName]
  );

  const fallbackConfigSheetUrl = isFormResponsesSheetUrl(appConfig.recordSpreadsheetUrl)
    ? stripSheetGid(appConfig.recordSpreadsheetUrl)
    : appConfig.recordSpreadsheetUrl;
  const effectiveSheetUrl =
    lastSubmittedSheetUrl ||
    activeTargetSheetUrl ||
    fallbackConfigSheetUrl ||
    DEFAULT_CONFIG.recordSpreadsheetUrl;
  const effectiveSheetName =
    lastSubmittedSheetName ||
    activeTargetSheetName ||
    (/gid=\d+/i.test(effectiveSheetUrl) && !isFormResponsesSheetUrl(effectiveSheetUrl)
      ? `TUGAS PPPU5 ${formatDateDisplay(appConfig.startDate)} - ${formatDateDisplay(appConfig.endDate)}`
      : '');
  const resolvedLogoSrc =
    logoFallbackAttempted && appConfig.logoUrl === DEFAULT_BANNER_LOGO_URL
      ? `https://ais-pre-7tcn55bgofr3n6meysstl3-258571690397.asia-southeast1.run.app${DEFAULT_BANNER_LOGO_URL}`
      : appConfig.logoUrl;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 text-slate-800 relative">
      {/* Top-Right Icon-Only Admin Panel Button */}
      <button
        type="button"
        onClick={() => setAdminModalOpen(true)}
        aria-label="Admin Panel"
        title="Admin Panel"
        className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/95 hover:bg-sky-50 text-sky-700 hover:text-sky-800 border border-slate-200 shadow-md backdrop-blur-sm flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="sr-only">Admin Panel</span>
      </button>

      <main className="max-w-4xl mx-auto w-full p-2.5 sm:p-6 lg:p-8 flex-grow">
        {/* Top Header & Full-Width Logo Banner */}
        <header className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4 sm:mb-6 text-center shadow-sm">
          <div className="w-full">
            {!logoLoadError && resolvedLogoSrc ? (
              <img
                src={resolvedLogoSrc}
                alt="Banner Rasmi Unit PRPA HTAR"
                referrerPolicy="no-referrer"
                onError={() => {
                  if (!logoFallbackAttempted && appConfig.logoUrl === DEFAULT_BANNER_LOGO_URL) {
                    setLogoFallbackAttempted(true);
                  } else {
                    setLogoLoadError(true);
                  }
                }}
                className="w-full h-auto block object-cover"
              />
            ) : (
              <div className="w-full px-4 sm:px-6 py-5 sm:py-6 bg-sky-700 text-white flex items-center justify-center gap-3">
                <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-sky-200 shrink-0" />
                <div className="text-left">
                  <p className="text-sm sm:text-base font-bold tracking-wide leading-tight">PPP U5 ROSTER</p>
                  <p className="text-xs text-sky-100">{appConfig.tajuk1 || DEFAULT_CONFIG.tajuk1}</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-3.5 sm:p-6">
            <h1 className="text-[13px] min-[380px]:text-sm sm:text-lg font-extrabold text-slate-900 tracking-tight whitespace-nowrap truncate">
              PERMOHONAN JADUAL TUGAS PPP U5
            </h1>

            <div className="mt-1.5 flex flex-col items-center justify-center gap-0.5 text-[11px] sm:text-sm text-slate-500">
              <span className="font-medium text-slate-600">{appConfig.tajuk1 || DEFAULT_CONFIG.tajuk1}</span>
              <span className="font-semibold text-sky-800">
                Versi {normalizeAppVersion(appConfig.appVersion, DEFAULT_CONFIG.appVersion)}
                {(appConfig.editionName || DEFAULT_CONFIG.editionName)
                  ? ` (${appConfig.editionName || DEFAULT_CONFIG.editionName})`
                  : ''}
              </span>
            </div>

            <div className="mt-3.5 sm:mt-4 flex flex-col sm:flex-row sm:flex-wrap justify-center items-stretch sm:items-center gap-2 sm:gap-2.5">
              <a
                href={effectiveSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={
                  effectiveSheetName
                    ? `Buka helaian sasaran: ${effectiveSheetName}`
                    : `Buka Rekod Permohonan Roster (${formatDateDisplay(appConfig.startDate)} - ${formatDateDisplay(appConfig.endDate)})`
                }
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 px-3.5 py-2.5 sm:py-2 rounded-xl transition-colors border border-sky-200 min-h-[42px] sm:min-h-[40px]"
              >
                <ExternalLink className="w-4 h-4 shrink-0" />
                <span>Buka Rekod Permohonan Roster</span>
              </a>

              <button
                type="button"
                onClick={() => setLogHistoryOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2.5 sm:py-2 rounded-xl transition-colors border border-slate-200 min-h-[42px] sm:min-h-[40px]"
              >
                <History className="w-4 h-4 text-slate-600 shrink-0" />
                <span>Log History</span>
                {errorLogs.length > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-md tabular-nums ${
                      errorLogs.some((entry) => entry.level !== 'success')
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {errorLogs.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Form Closed Notice */}
        {!formStatus.isOpen && (
          <section className="bg-red-50 border border-red-200 rounded-2xl p-5 sm:p-8 text-center space-y-4 mb-4 sm:mb-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-red-900">Borang Permohonan Telah Ditutup</h2>
            <p className="text-xs sm:text-sm text-red-700 max-w-md mx-auto">
              {formStatus.reason ||
                'Tempoh permohonan jadual bertugas bagi tarikh yang ditetapkan telah ditutup atau tarikh akhir telah berlalu.'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleDemoForceActivate}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs sm:text-sm transition-colors min-h-[44px]"
              >
                <Zap className="w-4 h-4 shrink-0" />
                <span>Mod Demo: Paksa Buka Borang Sekarang</span>
              </button>
            </div>
          </section>
        )}

        {/* Post-Submission Success Confirmation Banner */}
        {formStatus.isOpen && submittedSuccess && (
          <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 sm:p-8 text-center space-y-4 mb-4 sm:mb-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-emerald-900">Permohonan Berjaya.</h2>
            <p className="text-xs sm:text-sm text-emerald-700 max-w-md mx-auto">
              Permohonan anda bagi jadual{' '}
              <span className="font-semibold text-emerald-900 tabular-nums">
                {formatDateDisplay(appConfig.startDate)} - {formatDateDisplay(appConfig.endDate)}
              </span>{' '}
              telah direkodkan
              {effectiveSheetName ? (
                <>
                  {' '}ke helaian{' '}
                  <span className="font-semibold text-emerald-900">{effectiveSheetName}</span>
                </>
              ) : null}
              .
            </p>
            <div className="pt-2 flex flex-col sm:flex-row flex-wrap justify-center gap-2.5 sm:gap-3">
              {whatsappSummaryText && (
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappSummaryText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs sm:text-sm transition-colors min-h-[44px]"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>Hantar Salinan ke WhatsApp</span>
                </a>
              )}
              <a
                href={effectiveSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={
                  effectiveSheetName
                    ? `Papar rekod pada helaian: ${effectiveSheetName}`
                    : `Pratonton Rekod di Google Sheets (${formatDateDisplay(appConfig.startDate)} - ${formatDateDisplay(appConfig.endDate)})`
                }
                className="inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs sm:text-sm transition-colors min-h-[44px]"
              >
                <ExternalLink className="w-4 h-4 shrink-0" />
                <span>Pratonton Rekod di Google Sheets</span>
              </a>
              {lastSavedFileUrl && lastSavedFileUrl.startsWith('http') && (
                <a
                  href={lastSavedFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-5 rounded-xl text-xs sm:text-sm transition-colors min-h-[44px]"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Fail Surat Kelulusan (Drive)</span>
                </a>
              )}
              <button
                type="button"
                onClick={handleResetNewApplication}
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-emerald-100 text-emerald-800 font-semibold py-2.5 px-5 rounded-xl text-xs sm:text-sm border border-emerald-300 transition-colors min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>Hantar Permohonan Baharu</span>
              </button>
              <button
                type="button"
                onClick={handleFinishApplication}
                className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 px-5 rounded-xl text-xs sm:text-sm transition-colors min-h-[44px]"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Tamat Permohonan</span>
              </button>
            </div>
          </section>
        )}

        {/* Active Form Wrapper */}
        {formStatus.isOpen && !submittedSuccess && (
          <div className="space-y-4 sm:space-y-6">
            {/* Restored Session / Auto-Save Draft Banner */}
            {restoredDraftAt && (
              <div
                role="status"
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900 shadow-sm"
              >
                <div className="flex items-start gap-2.5">
                  <History className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <p className="font-bold text-slate-900">
                      Sesi borang terdahulu dipulihkan secara automatik
                    </p>
                    <p className="text-[11px] text-sky-800">
                      Draf terakhir disimpan pada{' '}
                      {new Date(restoredDraftAt).toLocaleTimeString('ms-MY', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                      . Data anda kekal selamat walaupun pelayar dimuat semula.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="text-[11px] font-semibold text-red-700 bg-white hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    Kosongkan Draf
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestoredDraftAt(null)}
                    className="text-[11px] font-semibold text-sky-800 bg-white hover:bg-sky-100 border border-sky-200 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    Teruskan
                  </button>
                </div>
              </div>
            )}

            {/* Active Duty Period Display */}
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
              <div className="bg-slate-50 rounded-xl p-3.5 sm:p-4 border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase">Tempoh Tugasan Aktif:</span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                    {formatDateDisplay(appConfig.startDate)} - {formatDateDisplay(appConfig.endDate)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase">Penyelia (SV) Incaj:</span>
                  <p className="text-xs sm:text-sm font-bold text-sky-700 mt-0.5">{appConfig.svName}</p>
                </div>
              </div>
            </section>

            {/* Step 1: Acknowledgement / Peringatan Penting Checklist */}
            {step === 1 && (
              <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-8 space-y-5 sm:space-y-6 shadow-sm">
                <div className="border-b border-slate-100 pb-3.5 sm:pb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-sky-600">
                    Langkah 1 dari 2
                  </p>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                    PERINGATAN PENTING <span className="text-red-500">*</span>
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                    SILA FAHAMI DULU SEBELUM KLIK ( &#10003; )
                  </p>
                </div>

                <div className="space-y-2.5 sm:space-y-3">
                  {warningItems.map((text, idx) => (
                    <label
                      key={idx}
                      className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border transition-colors cursor-pointer ${
                        checks[idx]
                          ? 'border-sky-300 bg-sky-50/40'
                          : 'border-slate-200 hover:bg-slate-50/80'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checks[idx]}
                        onChange={() => handleToggleCheck(idx)}
                        className="mt-1 w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 shrink-0"
                      />
                      <span className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                        {idx === 2 ? (
                          <>
                            3. PPP yang BERHASRAT untuk kerja Malam pada tarikh tertentu sila dapatkan tandatangan kelulusan dari{' '}
                            <strong className="font-extrabold text-slate-900">En Ravi</strong> terlebih dahulu sebelum UPLOAD.
                          </>
                        ) : (
                          text
                        )}
                      </span>
                    </label>
                  ))}
                </div>

                {showStep1Alert && (
                  <div
                    role="alert"
                    className="flex items-start sm:items-center gap-2 text-xs sm:text-sm font-semibold text-amber-800 bg-amber-50 p-3 sm:p-3.5 rounded-xl border border-amber-200"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                    <span>
                      Sila tandakan kesemua 5 kotak peringatan di atas terlebih dahulu untuk membuka borang permohonan.
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={handleProceedToStep2}
                    className="flex-1 min-h-[44px] bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl shadow-sm transition-colors inline-flex items-center justify-center gap-2 text-xs sm:text-sm"
                  >
                    <span>Teruskan ke Borang Permohonan</span>
                    <ChevronDown className="w-4 h-4 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDemoAutoTickAndOpen}
                    className="min-h-[44px] bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 sm:px-5 rounded-xl shadow-sm transition-colors inline-flex items-center justify-center gap-2 text-xs sm:text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Mod Demo: Auto-Tandakan &amp; Buka Borang</span>
                  </button>
                </div>
              </section>
            )}

            {/* Step 2: Main Application Form */}
            {step === 2 && (
              <form
                noValidate
                onSubmit={handleFormSubmit}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-8 space-y-5 sm:space-y-6 shadow-sm"
              >
                <div className="border-b border-slate-100 pb-3.5 sm:pb-4 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Langkah 2 dari 2
                    </p>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                      Maklumat &amp; Pilihan Syif Tugasan
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      Sila lengkapkan semua medan bertanda <span className="text-red-500 font-bold">*</span> sebelum menghantar. Muat naik Surat Kelulusan bagi permohonan shift malam / kursus atau yang berkenaan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline py-1"
                  >
                    Kembali ke Langkah 1
                  </button>
                </div>

                {/* Personal Info Fields */}
                <div className="space-y-3.5 sm:space-y-4">
                  {/* Google Forms Style Browser Email History Detection & Consent Checkbox */}
                  <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3.5 space-y-2.5">
                    {detectedLoginEmail ? (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="w-4 h-4 text-sky-700 shrink-0" />
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {detectedLoginEmail}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-semibold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-md">
                              {detectedEmailSource === 'browser_history'
                                ? 'Sejarah Emel Pelayar'
                                : 'Emel Pelayar'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (browserEmailHistory.length > 1) {
                                  setShowAccountSwitcher((prev) => !prev);
                                } else {
                                  handleSwitchToManualEmail();
                                }
                              }}
                              className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 underline"
                            >
                              {showAccountSwitcher ? 'Tutup' : 'Tukar akaun'}
                            </button>
                          </div>
                        </div>

                        {showAccountSwitcher && (
                          <div className="rounded-lg bg-white border border-sky-200 p-2.5 space-y-2">
                            <p className="text-[11px] font-semibold text-slate-600">
                              Pilih emel daripada sejarah pelayar ini:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {browserEmailHistory.map((histEmail) => {
                                const isActive =
                                  normalizeEmailKey(histEmail) === normalizeEmailKey(detectedLoginEmail);
                                return (
                                  <button
                                    key={histEmail}
                                    type="button"
                                    onClick={() => handleSelectBrowserEmail(histEmail)}
                                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                                      isActive
                                        ? 'bg-sky-600 text-white border-sky-600'
                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50 hover:border-sky-300'
                                    }`}
                                  >
                                    {histEmail}
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={handleSwitchToManualEmail}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-dashed border-sky-400 text-sky-700 hover:bg-sky-50 transition-colors"
                              >
                                + Guna emel lain
                              </button>
                            </div>
                          </div>
                        )}

                        <label
                          htmlFor="useDetectedEmailCheck"
                          className="flex items-start gap-2.5 cursor-pointer select-none"
                        >
                          <input
                            id="useDetectedEmailCheck"
                            type="checkbox"
                            checked={useDetectedEmail}
                            onChange={(e) => handleToggleUseDetectedEmail(e.target.checked)}
                            className="mt-0.5 w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 shrink-0"
                          />
                          <span className="text-xs text-slate-700 leading-relaxed">
                            <strong className="text-slate-900">Gunakan emel ini</strong> — Rakam{' '}
                            <strong className="text-slate-900">{detectedLoginEmail}</strong> sebagai alamat emel yang digunakan untuk borang ini.
                          </span>
                        </label>
                      </>
                    ) : (
                      <div className="flex items-start gap-2 text-[11px] text-slate-600">
                        <Mail className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                        <span>
                          Pilih cadangan emel pelayar atau taip emel anda di bawah. Pelayar ini akan mengingati emel anda supaya pada permohonan seterusnya ia dipaparkan terus dengan tanda <strong>Gunakan emel ini</strong>.
                        </span>
                      </div>
                    )}

                    <div>
                      <label htmlFor="emailInput" className="block text-xs font-semibold text-slate-700 mb-1">
                        Alamat E-mel <span className="text-red-500">*</span>
                      </label>
                      <input
                        ref={emailInputRef}
                        id="emailInput"
                        name="email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        list="browserEmailHistoryList"
                        value={email}
                        readOnly={Boolean(detectedLoginEmail && useDetectedEmail)}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@moh.gov.my / gmail.com"
                        className={`w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border focus:ring-2 focus:ring-sky-500 focus:outline-none min-h-[44px] ${
                          detectedLoginEmail && useDetectedEmail
                            ? 'bg-slate-100 text-slate-700 border-slate-300 cursor-not-allowed'
                            : showValidationErrors && !isValidEmailAddress(email)
                              ? 'border-red-400 bg-red-50/40'
                              : 'bg-white border-slate-300'
                        }`}
                      />
                      {browserEmailHistory.length > 0 && (
                        <datalist id="browserEmailHistoryList">
                          {browserEmailHistory.map((histEmail) => (
                            <option key={histEmail} value={histEmail} />
                          ))}
                        </datalist>
                      )}
                      {(!detectedLoginEmail || !useDetectedEmail) &&
                        isValidEmailAddress(email) && (
                          <button
                            type="button"
                            onClick={() => handleSelectBrowserEmail(email)}
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 bg-sky-100 hover:bg-sky-200 px-3 py-1.5 rounded-lg border border-sky-300 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5 shrink-0" />
                            <span>Gunakan emel ini ({email.trim()})</span>
                          </button>
                        )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="namaPemohon" className="block text-xs sm:text-sm font-bold text-slate-800 mb-1">
                      NAMA PEMOHON (SUSUNAN IKUT ABJAD) <span className="text-red-500">*</span>
                    </label>
                    <select
                      ref={namaPemohonRef}
                      id="namaPemohon"
                      name="namaPemohon"
                      value={namaPemohon}
                      onChange={(e) => handleNamaPemohonChange(e.target.value)}
                      className={`w-full rounded-xl border bg-white px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 min-h-[44px] ${
                        showValidationErrors && !namaPemohon.trim()
                          ? 'border-red-400 bg-red-50/40'
                          : 'border-slate-300'
                      }`}
                    >
                      <option value="">-- Sila Pilih Nama --</option>
                      {STAFF_NAMES.map((staff) => (
                        <option key={staff} value={staff}>
                          {staff}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                      <label htmlFor="phoneInput" className="block text-xs font-semibold text-slate-700">
                        No. Telefon Bimbit <span className="text-red-500">*</span>
                      </label>
                      {phoneLookupStatus === 'checking' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Menyemak Senarai Nama PPPU5...</span>
                        </span>
                      ) : phoneVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>No. Telefon Telah direkodkan.</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>No belum disahkan</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-stretch gap-2">
                      <div className="relative flex-1 min-w-0">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          ref={phoneInputRef}
                          id="phoneInput"
                          type="text"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            setPhoneVerified(false);
                          }}
                          placeholder={
                            namaPemohon
                              ? 'Masukkan nombor telefon (cth: 0123456789)'
                              : 'Pilih nama pemohon dahulu atau taip no. telefon'
                          }
                          className={`w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 rounded-xl border focus:ring-2 focus:ring-sky-500 focus:outline-none tabular-nums min-h-[44px] ${
                            showValidationErrors && (phone.trim().replace(/\D/g, '').length < 9 || !phoneVerified)
                              ? 'border-red-400 bg-red-50/40'
                              : phoneVerified
                                ? 'border-emerald-400 bg-emerald-50/20'
                                : phoneLookupStatus === 'missing'
                                  ? 'border-amber-400 bg-amber-50/30'
                                  : 'border-slate-300'
                          }`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleVerifyPhone}
                        className={`shrink-0 min-h-[44px] px-3.5 sm:px-4 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                          phoneVerified
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-400 text-emerald-800 shadow-xs'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{phoneVerified ? 'Disahkan' : 'Sahkan'}</span>
                      </button>
                    </div>

                    {namaPemohon.trim() && phoneLookupStatus === 'missing' && (
                      <p className="mt-1.5 text-[11px] font-medium text-amber-800">
                        Sila masukkan nombor telefon anda dan tekan butang Sahkan. Nombor telefon akan disimpan pada respon pertama semasa menghantar borang.
                      </p>
                    )}

                    {namaPemohon.trim() && phoneLookupStatus === 'found' && !phoneVerified && (
                      <p className="mt-1 text-[11px] text-amber-800 font-medium">
                        Sila semak nombor telefon anda di atas dan tekan butang <strong>Sahkan</strong>. Jika ada perubahan nombor, masukkan semula No. Telefon baharu.
                      </p>
                    )}

                    {namaPemohon.trim() && phoneLookupStatus === 'found' && phoneVerified && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Jika ada perubahan nombor, kemaskini No. Telefon di atas dan tekan Sahkan semula.
                      </p>
                    )}
                  </div>
                </div>

                {/* Daily Dates & Shifts Container */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-100 pb-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Pilihan Syif Tarikh Harian <span className="text-red-500">*</span>
                    </h3>
                    <span
                      className={`text-xs font-medium tabular-nums ${
                        showValidationErrors && filledShiftCount === 0
                          ? 'text-red-600 font-bold'
                          : 'text-slate-500'
                      }`}
                    >
                      {filledShiftCount} / {dateItems.length} hari dipilih
                    </span>
                  </div>

                  {dateItems.length === 0 ? (
                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-800">
                      Julat tarikh tidak sah. Sila pastikan tarikh tamat adalah selepas tarikh mula di Admin Panel atau pemilih tempoh.
                    </div>
                  ) : (
                    <div
                      className={`space-y-2.5 max-h-[26rem] overflow-y-auto pr-1 rounded-xl ${
                        showValidationErrors && filledShiftCount === 0 ? 'ring-1 ring-red-300 p-1.5 bg-red-50/20' : ''
                      }`}
                    >
                      {dateItems.map((item) => {
                        const sel = dailySelections[item.isoKey] || {
                          shift: '',
                          replacementDate: '',
                          note: '',
                        };
                        const showReplacementDate =
                          sel.shift === 'CG' || sel.shift === 'HKA OFF' || sel.shift === 'HK OFF';
                        const showNoteInput = sel.shift === 'KURSUS' || sel.shift === 'LAIN-LAIN';
                        const missingDateError =
                          showValidationErrors && showReplacementDate && !sel.replacementDate;
                        const missingNoteError =
                          showValidationErrors && showNoteInput && !sel.note.trim();

                        return (
                          <div
                            key={item.isoKey}
                            className={`p-3 rounded-xl border space-y-2 transition-colors ${
                              missingDateError || missingNoteError
                                ? 'border-red-400 bg-red-50/40'
                                : sel.shift
                                  ? 'border-sky-200 bg-sky-50/30'
                                  : item.isWeekend
                                    ? 'border-slate-200 bg-slate-50/70'
                                    : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="text-xs sm:text-sm font-bold text-slate-800 tabular-nums">
                                {item.fullColTitle}
                              </span>
                              <select
                                aria-label={`Pilihan syif untuk ${item.fullColTitle}`}
                                value={sel.shift}
                                onChange={(e) => handleShiftChange(item.isoKey, e.target.value)}
                                className="w-full sm:w-auto sm:min-w-[200px] text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none min-h-[42px] sm:min-h-[40px]"
                              >
                                {SHIFT_OPTIONS.map((opt) => (
                                  <option key={opt.value || 'empty'} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {showReplacementDate && (
                              <div className="pt-1">
                                <label className="block text-xs font-semibold text-sky-700 mb-1">
                                  Pilih Tarikh Pilihan / Gantian <span className="text-red-500">*</span>:
                                </label>
                                <input
                                  type="date"
                                  value={sel.replacementDate}
                                  onChange={(e) =>
                                    handleReplacementDateChange(item.isoKey, e.target.value)
                                  }
                                  className={`w-full text-xs px-3 py-2 rounded-lg border focus:ring-1 focus:ring-sky-500 focus:outline-none tabular-nums min-h-[40px] ${
                                    missingDateError
                                      ? 'border-red-400 bg-red-50'
                                      : 'border-sky-300 bg-sky-50/40'
                                  }`}
                                />
                              </div>
                            )}

                            {showNoteInput && (
                              <div className="pt-1 space-y-1">
                                <label className="block text-xs font-semibold text-sky-700">
                                  {sel.shift === 'KURSUS'
                                    ? 'Catatan / Nama Kursus'
                                    : 'Catatan / Alasan Lain-lain'}{' '}
                                  <span className="text-red-500 font-bold">*</span>{' '}
                                  <span className="text-[11px] font-medium text-slate-500">(Wajib diisi)</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  aria-required="true"
                                  autoCapitalize="characters"
                                  value={(sel.note || '').toUpperCase()}
                                  onChange={(e) => {
                                    const target = e.currentTarget;
                                    const start = target.selectionStart;
                                    const end = target.selectionEnd;
                                    handleNoteChange(item.isoKey, target.value);
                                    if (start !== null && end !== null) {
                                      requestAnimationFrame(() => {
                                        try {
                                          target.setSelectionRange(start, end);
                                        } catch {
                                          // Ignore selection errors on unsupported inputs
                                        }
                                      });
                                    }
                                  }}
                                  placeholder={
                                    sel.shift === 'KURSUS'
                                      ? 'Nyatakan nama kursus / lokasi (wajib diisi)...'
                                      : 'Nyatakan catatan / alasan terperinci (wajib diisi)...'
                                  }
                                  className={`w-full text-xs px-3 py-2 rounded-lg border focus:ring-1 focus:ring-sky-500 focus:outline-none min-h-[40px] uppercase placeholder:normal-case ${
                                    missingNoteError
                                      ? 'border-red-400 bg-red-50'
                                      : 'border-slate-300 bg-slate-50'
                                  }`}
                                />
                                {missingNoteError && (
                                  <p role="alert" className="text-[11px] font-semibold text-red-600">
                                    * Medan catatan wajib diisi bagi pilihan {sel.shift}.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Surat Kelulusan Upload / Google Drive Link Field (Optional) */}
                <div className="space-y-3 rounded-xl border border-slate-200 p-3.5 sm:p-4 bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-slate-800">
                        Surat Kelulusan <span className="font-semibold text-slate-500">(Pilihan / Optional)</span>
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Muat naik Surat Kelulusan bagi permohonan shift malam / kursus atau yang berkenaan.
                      </p>
                    </div>
                    <div className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl shrink-0">
                      <button
                        type="button"
                        onClick={() => setSuratMode('upload')}
                        className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                          suratMode === 'upload'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5 shrink-0" />
                        <span>Muat Naik Fail</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSuratMode('link')}
                        className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                          suratMode === 'link'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Link2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Pautan Google Drive</span>
                      </button>
                    </div>
                  </div>

                  {suratMode === 'upload' ? (
                    <div className="space-y-2.5">
                      {folderWarning && (
                        <div
                          role="alert"
                          className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
                        >
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>{folderWarning}</span>
                        </div>
                      )}

                      {!suratFile ? (
                        <label
                          htmlFor="suratFileUploadInput"
                          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-sky-50/40 hover:border-sky-400 p-4 sm:p-5 text-center cursor-pointer transition-colors"
                        >
                          <Upload className="w-6 h-6 text-sky-600" />
                          <div className="space-y-0.5">
                            <p className="text-xs sm:text-sm font-semibold text-slate-800">
                              Klik untuk memilih fail Surat Kelulusan
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Format disokong: PDF, JPG, PNG, DOC, DOCX (Maks. 5 MB) · Disimpan ke Google Drive mengikut tempoh tugasan
                            </p>
                          </div>
                          <input
                            ref={fileInputRef}
                            id="suratFileUploadInput"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            onChange={handleApprovalFileChange}
                            className="sr-only"
                          />
                        </label>
                      ) : (
                        <div className="flex items-center justify-between gap-2.5 sm:gap-3 rounded-xl border border-sky-200 bg-white p-3 sm:p-3.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                                {suratFile.name}
                              </p>
                              <p className="text-[11px] text-slate-500 tabular-nums">
                                {(suratFile.size / 1024).toFixed(1)} KB · Sedia dimuat naik ke Google Drive
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSuratFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            aria-label="Buang fail dipilih"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Padam</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        id="suratKelulusanInput"
                        type="text"
                        value={suratKelulusan}
                        onChange={(e) => setSuratKelulusan(e.target.value)}
                        placeholder="https://drive.google.com/file/d/... atau Cuti Diluluskan"
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none min-h-[44px]"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Masukkan pautan fail daripada Google Drive anda atau catatan rujukan kelulusan.
                      </p>
                    </div>
                  )}
                </div>

                {/* Email Copy Option */}
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="checkbox"
                    id="sendEmailCopyCheck"
                    checked={sendEmailCopy}
                    onChange={(e) => setSendEmailCopy(e.target.checked)}
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 shrink-0"
                  />
                  <label
                    htmlFor="sendEmailCopyCheck"
                    className="text-xs sm:text-sm font-medium text-slate-700 cursor-pointer"
                  >
                    Hantar salinan ringkasan permohonan ke emel saya.
                  </label>
                </div>

                {/* WhatsApp Copy Notice & Submit Actions */}
                <div className="pt-2 sm:pt-3 space-y-3">
                  <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5 text-xs text-emerald-900">
                    <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      Satu salinan permohonan jadual akan dihantar ke WhatsApp selepas borang berjaya dihantar.
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting || isReadingFile}
                      className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-3 px-4 sm:px-6 rounded-xl shadow-sm transition-colors inline-flex items-center justify-center gap-2 text-xs sm:text-sm"
                    >
                      {isSubmitting || isReadingFile ? (
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin shrink-0" />
                      ) : (
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                      )}
                      <span>
                        {isReadingFile
                          ? 'Memproses Fail...'
                          : isSubmitting
                            ? 'Permohonan sedang diproses, harap bersabar...'
                            : 'Hantar'}
                      </span>
                    </button>
                  </div>
                  {lastDraftSavedAt && (
                    <p className="text-[11px] text-slate-500 text-center">
                      Draf borang disimpan automatik pada{' '}
                      <span className="tabular-nums font-medium text-slate-600">
                        {new Date(lastDraftSavedAt).toLocaleTimeString('ms-MY', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </p>
                  )}
                </div>
              </form>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-2 sm:px-3 text-center text-slate-500 space-y-1">
        <p className="text-[9.5px] min-[420px]:text-[11px] sm:text-xs font-medium text-slate-600 whitespace-nowrap">
          {appConfig.footerText || DEFAULT_CONFIG.footerText},{' '}
          <span className="font-semibold text-slate-700">
            PPPU5 Roster Management System &bull; Versi {normalizeAppVersion(appConfig.appVersion, DEFAULT_CONFIG.appVersion)}
          </span>
        </p>
        <p className="text-[10px] sm:text-[11px] text-slate-500">
          Kemaskini Terakhir : {appConfig.versionUpdatedAt || DEFAULT_CONFIG.versionUpdatedAt}.
        </p>
      </footer>

      {/* Modals */}
      <AdminModal
        open={adminModalOpen}
        config={appConfig}
        records={records}
        onClose={() => setAdminModalOpen(false)}
        onSaveConfig={handleSaveAdminConfig}
        onClearRecords={() => setRecords([])}
        onDeleteRecord={(id) => setRecords((prev) => prev.filter((item) => item.id !== id))}
        onRecordLog={recordErrorLog}
      />

      <SubmitConfirmationModal
        open={confirmModalOpen}
        isSubmitting={isSubmitting}
        defaultSendWhatsapp={confirmDefaultWhatsapp}
        summary={confirmSummary}
        onClose={() => {
          if (!isSubmitting) setConfirmModalOpen(false);
        }}
        onConfirmSubmit={(sendToWhatsapp) => {
          void submitApplicationData(sendToWhatsapp);
        }}
      />

      <WhatsAppSummaryModal
        open={whatsappModalOpen}
        summaryText={whatsappSummaryText}
        onClose={() => setWhatsappModalOpen(false)}
      />

      <LogHistoryModal
        open={logHistoryOpen}
        logs={errorLogs}
        onClearLogs={() => setErrorLogs([])}
        onClose={() => setLogHistoryOpen(false)}
      />

      <NotificationModal
        notification={notification}
        sheetUrl={effectiveSheetUrl}
        sheetName={effectiveSheetName}
        onClose={() => {
          const cb = notification.onAfterClose;
          setNotification((prev) => ({ ...prev, open: false, onAfterClose: undefined }));
          cb?.();
        }}
      />
    </div>
  );
}
