export type ForceStatus = 'AUTO' | 'OPEN' | 'CLOSED';

export interface AppConfig {
  startDate: string;
  endDate: string;
  closingDate: string;
  forceStatus: ForceStatus;
  svName: string;
  recordSpreadsheetUrl: string;
  gasWebAppUrl: string;
  approvalFolderUrl: string;
  enableSaveNotification: boolean;
  logoUrl: string;
  tajuk1: string;
  footerText: string;
  appVersion: string;
  editionName: string;
  versionUpdatedAt: string;
}

export interface RosterPeriod {
  value: string;
  label: string;
  startDate: string;
  endDate: string;
}

export interface ShiftOption {
  value: string;
  label: string;
}

export interface DailyShiftSelection {
  shift: string;
  replacementDate: string;
  note: string;
}

export interface ApplicationRecord {
  id: string;
  timestamp: string;
  email: string;
  noTelefon: string;
  namaPemohon: string;
  tempohTugasan: string;
  dateColumns: string[];
  sheetDateColumns: string[];
  orderedShifts: string[];
  suratKelulusan: string;
  sendEmailCopy: boolean;
}

export const DAYS_OF_WEEK = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'] as const;

export const MONTH_NAMES_MS = [
  'Januari',
  'Februari',
  'Mac',
  'April',
  'Mei',
  'Jun',
  'Julai',
  'Ogos',
  'September',
  'Oktober',
  'November',
  'Disember',
] as const;

export const SHIFT_OPTIONS: ShiftOption[] = [
  { value: '', label: '-- Pilih Status / Syif --' },
  { value: 'CR', label: 'CR' },
  { value: 'CG', label: 'CG' },
  { value: 'HKA OFF', label: 'HKA OFF' },
  { value: 'HK OFF', label: 'HK OFF' },
  { value: 'PG SHJ', label: 'PG SHJ' },
  { value: 'PT SHJ', label: 'PT SHJ' },
  { value: 'KURSUS', label: 'KURSUS' },
  { value: 'M.TEAM', label: 'M.TEAM' },
  { value: 'MESYUARAT', label: 'MESYUARAT' },
  { value: 'LAIN-LAIN', label: 'LAIN-LAIN' },
];

export const STAFF_NAMES: string[] = [
  'ABD RAHMAN BIN ABD. AZIZ',
  'AHMAD MUHAIMINZEE BIN ISMAIL',
  'AIMAN AIZUDDIN BIN MAZLAN',
  'CHE NORHISYAM BIN CHE HUSIN',
  'KAMARUL EFENDI BIN RADZALI',
  'MOHAMAD ZAFIR BIN ISA',
  'MOHAMMAD HADI BIN ANUAR',
  'MOHAMMAD ZULHAKIMI BIN MARUDING',
  'MOHD AKMAL HADI BIN ZAKARIA',
  'MOHD AMIRUN BIN AHMAD',
  'MOHD IMRAN BIN MOHD NOR',
  'MUHAMAD AZRI BIN AZIZ',
  'MUHAMAD NABIL BIN OTHMAN',
  'MUHAMMAD HAZIM BIN NASARUDDIN',
  'MUHAMMAD SHAHRUL AZWAN BIN KAMARUDDIN',
  'MUHAMMAD SYAFIQ IZZAT BIN ZOLNALDI',
  'WAN MOHD RIDZUAN BIN WAN BERAHIM',
  'ABDUL HAMIDULLAH BIN ABDUL MOMEN',
  'ALIMMIN TAQUIDDIN BIN RUSLI',
  'MUHAMMAD NASIRUDDIN NAZMI BIN NAZARI',
  'MOHD NUR AL HAFIS BIN SAHDI',
  'FLORINA LOUIS',
  'MEDILITA MUNGGIANG',
  'AMIRUL AFANDI BIN MOHD KHAZAHIR',
  'MOHAMMAD AMIRRUDDIN BIN MOHAMAD ISA',
  'VERSHANE STONE',
  'NUR WAHIDATUN BALQIS BINTI MOHD YUSUFF',
  'BRANDON RYAN ANASTASIUS',
  'MOHAMAD HASNAWIE HAIMAN BIN NORDIN',
  'MUHAMMAD DANIAL HAKIMI BIN SUFIAN',
  'MUHAMMAD HAFIZZAT AIMAN BIN MOHD YUNUS',
  'SITI NURAISYAH BINTI MOHAMAD',
  'NURUL SYAZWANI BINTI OSMAN',
];

export const WARNING_ITEMS: string[] = [
  '1. PERMOHONAN ADALAH UNTUK TEMPOH TUGASAN ...',
  '2. TARIKH TUTUP PERMOHONAN PADA ...',
  '3. PPP yang BERHASRAT untuk kerja Malam pada tarikh tertentu sila dapatkan tandatangan kelulusan dari En Ravi terlebih dahulu sebelum UPLOAD.',
  '4. PPP yang BERHASRAT ingin bekerja single syif pada tarikh tertentu sila berikan ALASAN KUKUH kepada Penyelia.',
  '5. PPP yang BERHASRAT ingin menghadiri KURSUS perlu maklum terlebih dahulu kepada PENYELIA sebelum mengisi link/borang pendaftaran peserta.',
];

export function buildWarningItems(
  startDate: string,
  endDate: string,
  closingDate: string,
  _svName?: string
): string[] {
  const tempoh = `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`;
  const tutup = closingDate ? formatDateDisplay(closingDate) : '-';
  return [
    `1. PERMOHONAN ADALAH UNTUK TEMPOH TUGASAN ${tempoh}.`,
    `2. TARIKH TUTUP PERMOHONAN PADA ${tutup}.`,
    '3. PPP yang BERHASRAT untuk kerja Malam pada tarikh tertentu sila dapatkan tandatangan kelulusan dari En Ravi terlebih dahulu sebelum UPLOAD.',
    '4. PPP yang BERHASRAT ingin bekerja single syif pada tarikh tertentu sila berikan ALASAN KUKUH kepada Penyelia.',
    '5. PPP yang BERHASRAT ingin menghadiri KURSUS perlu maklum terlebih dahulu kepada PENYELIA sebelum mengisi link/borang pendaftaran peserta.',
  ];
}

export const DEFAULT_BANNER_LOGO_URL = '/assets/aistudio/RefineUpgrade_Logo_7d07d3af.jpg';

export const DEFAULT_CONFIG: AppConfig = {
  startDate: '2026-12-01',
  endDate: '2026-12-15',
  closingDate: '2026-11-30',
  forceStatus: 'OPEN',
  svName: 'En. Ravi',
  recordSpreadsheetUrl:
    'https://docs.google.com/spreadsheets/d/1DE-YQdkf6l8dhb-iv6GYOXnAsIEpFKKChzMOVV6GgqA/edit#gid=151344881',
  gasWebAppUrl:
    'https://script.google.com/macros/s/AKfycby8AKPL8DO-KOk220KCtDl4DRI_HrSccKmQoxCEA0V1tILhkC6ICy8Z4DAofJR_2Jo9hg/exec',
  approvalFolderUrl:
    'https://drive.google.com/drive/folders/1uzm7dR-aCCh6u_xTqFsL532g6aXgkVRoNVX3SsUnKnvEEGFAR_SqY8sU9dXrtxph4o1bDv3f',
  enableSaveNotification: true,
  logoUrl: DEFAULT_BANNER_LOGO_URL,
  tajuk1: 'Unit PRPA HTAR',
  footerText: 'Hak Cipta Terpelihara © 2026',
  appVersion: '3.0',
  editionName: 'Edisi Terkini Dis 2026',
  versionUpdatedAt: 'Disember 2026',
};

export function normalizeAppVersion(raw: unknown, fallback = '3.0'): string {
  if (raw === undefined || raw === null) return fallback;
  const trimmed = String(raw).trim();
  if (!trimmed) return fallback;
  if (/^\d+$/.test(trimmed)) return `${trimmed}.0`;
  return trimmed;
}

export function generateRosterPeriods(): RosterPeriod[] {
  const periods: RosterPeriod[] = [];
  for (let year = 2026; year <= 2027; year++) {
    const startMonth = year === 2026 ? 10 : 0;
    const endMonth = 11;
    for (let m = startMonth; m <= endMonth; m++) {
      const mStr = String(m + 1).padStart(2, '0');
      const lastDay = new Date(year, m + 1, 0).getDate();

      const s1 = `${year}-${mStr}-01`;
      const e1 = `${year}-${mStr}-15`;
      periods.push({
        value: `${s1}|${e1}`,
        label: `${MONTH_NAMES_MS[m]} ${year} (01/${mStr}/${year} – 15/${mStr}/${year})`,
        startDate: s1,
        endDate: e1,
      });

      const s2 = `${year}-${mStr}-16`;
      const e2 = `${year}-${mStr}-${String(lastDay).padStart(2, '0')}`;
      periods.push({
        value: `${s2}|${e2}`,
        label: `${MONTH_NAMES_MS[m]} ${year} (16/${mStr}/${year} – ${lastDay}/${mStr}/${year})`,
        startDate: s2,
        endDate: e2,
      });
    }
  }
  return periods;
}

export function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoStr;
}

export function formatDateDayMonth(isoStr: string): string {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return isoStr;
}

export function formatDateDisplayIso(dateObj: Date): string {
  const d = String(dateObj.getDate()).padStart(2, '0');
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
}

export interface GeneratedDateItem {
  isoKey: string;
  fullColTitle: string;
  sheetColTitle: string;
  dateStr: string;
  dayName: string;
  isWeekend: boolean;
}

export function generateDateItems(startDate: string, endDate: string): GeneratedDateItem[] {
  const startParts = (startDate || '2026-12-01').split('-');
  const endParts = (endDate || '2026-12-15').split('-');
  const start = new Date(Number(startParts[0]), Number(startParts[1]) - 1, Number(startParts[2]));
  const end = new Date(Number(endParts[0]), Number(endParts[1]) - 1, Number(endParts[2]));

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }

  const items: GeneratedDateItem[] = [];
  const curr = new Date(start);
  let safetyCounter = 0;

  while (curr <= end && safetyCounter < 62) {
    const dateStr = formatDateDisplayIso(curr);
    const dayIndex = curr.getDay();
    const dayName = DAYS_OF_WEEK[dayIndex];
    const dayNum = curr.getDate();
    const monthNum = curr.getMonth() + 1;
    const yearNum = curr.getFullYear();
    const isoKey = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    items.push({
      isoKey,
      fullColTitle: `${dateStr} (${dayName})`,
      sheetColTitle: `Date: ${dayNum}/${monthNum}/${yearNum}`,
      dateStr,
      dayName,
      isWeekend: dayIndex === 0 || dayIndex === 6,
    });
    curr.setDate(curr.getDate() + 1);
    safetyCounter++;
  }

  return items;
}
