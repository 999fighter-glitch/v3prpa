import { jsPDF } from 'jspdf';
import { AppConfig, DEFAULT_CONFIG, formatDateDisplay, normalizeAppVersion } from './rosterData';

export interface GuidelineStep {
  stepNumber: number;
  title: string;
  summary: string;
  bullets: string[];
  importantNote?: string;
}

export const ADMIN_GUIDELINE_SECTIONS: GuidelineStep[] = [
  {
    stepNumber: 1,
    title: 'Akses & Log Masuk Panel Pentadbir (Admin)',
    summary:
      'Pentadbir mengurus keseluruhan borang, sambungan Google Sheets, folder Google Drive, serta kemaskini versi melalui Panel Admin.',
    bullets: [
      'Klik ikon Tetapan (gear) di penjuru kanan atas paparan utama laman web.',
      'Masukkan Kod Akses Admin rasmi (contoh lalai: ADMIN007) dan tekan butang "Sahkan Kod & Masuk".',
      'Selepas disahkan, 6 tab pengurusan dipaparkan: Tetapan Borang, Tetapan Sistem, Rekod, Kod Script G.A.S, Panduan, dan About.',
      'Gunakan pautan "Log Keluar" di penjuru kanan kad profil admin apabila selesai mengurus sistem.',
    ],
    importantNote:
      'Panduan Pentadbir (Admin) ini mengandungi maklumat akses dalaman dan kekal di dalam sistem sahaja (tidak didedahkan kepada pengguna umum).',
  },
  {
    stepNumber: 2,
    title: 'Tetapan Borang & Tempoh Tugasan Aktif',
    summary:
      'Tetapkan julat tarikh tugasan 14/15 hari, nama penyelia incaj, tarikh tutup, dan status buka/tutup borang di tab "Tetapan Borang".',
    bullets: [
      'Pilih "Tarikh Mula Tugasan" dan "Tarikh Tamat Tugasan" untuk menjana senarai tarikh harian secara automatik pada borang pemohon.',
      'Masukkan "Nama Penyelia (SV) Incaj" bagi tempoh semasa (paparan pada kad Tempoh Tugasan Aktif & ringkasan pengesahan).',
      'Tetapkan "Tarikh Tamat Borang (Tarikh Tutup)" untuk menutup borang secara automatik selepas tarikh luput.',
      'Pilih "Status Paparan Borang": Automatik (ikut tarikh tutup), Paksa BUKA, atau Paksa TUTUP, kemudian tekan "Simpan Tetapan Borang".',
    ],
  },
  {
    stepNumber: 3,
    title: 'Tetapan Pautan Google Sheets, Web App GAS & Folder Google Drive',
    summary:
      'Pastikan pautan helaian rekod, endpoint Google Apps Script (/exec), dan folder muat naik Surat Kelulusan disambungkan dan diuji di tab "Tetapan Sistem".',
    bullets: [
      'Masukkan "Pautan URL Rekod Google Sheets" (atau biarkan mengikut Active Sheet apabila menggunakan GAS terikat).',
      'Masukkan "URL Web App Google Apps Script (/exec)" yang diperoleh daripada deployment Web App GAS.',
      'Tetapkan "Pautan URL Logo / Banner" sekiranya ingin menukar imej header rasmi.',
      'Masukkan "Pautan Folder Google Drive Surat Kelulusan" dan tekan butang "Semak Folder" untuk mengesahkan kewujudan folder serta ujian kebenaran tulis (DriveApp).',
      'Tekan butang "Uji Sambungan" pada bahagian Semakan Sambungan ke Google Sheets untuk mengesahkan respons JSON serta latensi pelayan.',
      'Aktifkan atau nyahaktifkan togol "Notifikasi Laman Web" mengikut keperluan paparan mesej kejayaan kepada pemohon.',
    ],
    importantNote:
      'Jika berlaku ralat kebenaran DriveApp, jalankan fungsi authorizeDriveAndSheets di Apps Script Editor, pastikan skop penuh https://www.googleapis.com/auth/drive wujud dalam appsscript.json, dan buat New Deployment.',
  },
  {
    stepNumber: 4,
    title: 'Kemaskini Versi, Tajuk 1, Nama Edisi & Footer Paparan Web',
    summary:
      'Admin boleh mengemaskini maklumat versi dan penjenamaan header/footer laman web terus daripada Panel Admin tanpa menyunting kod sumber.',
    bullets: [
      'Di dalam tab "Tetapan Sistem", skrol ke bahagian "Kemaskini Versi & Paparan Web (Header / Footer)".',
      'Kemas kini "Tajuk 1 (Subtajuk Header Web)" (lalai: Unit PRPA HTAR) dan "Teks Footer (Hak Cipta)" (lalai: Hak Cipta Terpelihara © 2026).',
      'Kemas kini "Kemaskini Versi" (contoh: 3.0), "Tarikh / Bulan Kemaskini" (contoh: Disember 2026), dan "Nama Edisi" (contoh: Edisi Terkini Dis 2026).',
      'Semak kotak "Pratonton Paparan Web" untuk memastikan susunan header dan footer tepat.',
      'Klik "Kemaskini Versi & Paparan" atau "Simpan Tetapan Sistem" untuk menyimpan ke pelayar serta menyegerakkan ke helaian SETTINGS di Google Sheets.',
    ],
  },
  {
    stepNumber: 5,
    title: 'Semakan Rekod Permohonan & Eksport CSV',
    summary:
      'Pantau penghantaran yang direkodkan secara tempatan dan muat turun salinan CSV melalui tab "Rekod".',
    bullets: [
      'Setiap permohonan yang berjaya dihantar dipaparkan bersama nama pemohon, tempoh tugasan, e-mel, nombor telefon, bilangan hari syif, dan pautan Surat Kelulusan.',
      'Klik "Muat Turun CSV" untuk mengeksport data mengikut susunan lajur helaian rasmi (Timestamp, Email Address, PERINGATAN PENTING, NAMA PEMOHON, Date: D/M/YYYY, Surat Kelulusan).',
      'Gunakan ikon tong sampah untuk memadam rekod individu atau butang "Padam Semua" bagi membersihkan senarai simpanan tempatan pelayar.',
    ],
  },
  {
    stepNumber: 6,
    title: 'Penyelarasan Kod Google Apps Script (Code.gs & Index.html)',
    summary:
      'Gunakan tab "Kod Script G.A.S" apabila membuat pemasangan baharu, menyalin Google Sheet ke akaun lain, atau mengemaskini fungsi backend.',
    bullets: [
      'Pastikan DEFAULT_APPROVAL_FOLDER_URL telah diisi di Tetapan Sistem sebelum menyalin kod supaya ia terisi automatik dalam Code.gs.',
      'Klik "Salin Kod GAS Lengkap (Code.gs)" dan tampal ke dalam fail Code.gs di Google Apps Script Editor.',
      'Muat turun atau salin fail tunggal "Index.html" dan simpan sebagai fail HTML bernama "Index" di dalam projek Apps Script jika ingin hos terus melalui GAS HtmlService.',
      'Pilih Deploy > New deployment > Web App (Execute as: Me, Who has access: Anyone) dan kemaskini URL /exec di Tetapan Sistem.',
    ],
  },
  {
    stepNumber: 7,
    title: 'Pemantauan Log History & Semakan Operasi Harian',
    summary:
      'Pantau status penghantaran dan kesan ralat rangkaian atau kebenaran melalui butang "Log History" di halaman utama.',
    bullets: [
      'Setiap simpanan berjaya akan dicatat dalam Log History dengan label hijau: "Data berjaya disimpan ke helaian \'...\'." beserta cap masa.',
      'Sebarang ralat sambungan GAS, carian direktori Senarai Nama PPPU5, atau ralat folder Drive direkodkan dengan label merah berserta punca ralat.',
      'Buka Google Sheet melalui butang "Buka Rekod Permohonan Roster" untuk menyemak helaian tempoh tugasan dan helaian Senarai Nama PPPU5.',
    ],
  },
];

export const USER_GUIDELINE_SECTIONS: GuidelineStep[] = [
  {
    stepNumber: 1,
    title: 'Buka Sistem & Semak Tempoh Tugasan Aktif',
    summary:
      'Pastikan anda mengakses pautan borang permohonan rasmi dan menyemak tempoh jadual bertugas yang sedang dibuka.',
    bullets: [
      'Buka pautan web Permohonan Jadual Tugas PPP U5 melalui pelayar telefon atau komputer.',
      'Semak maklumat pada kad "Tempoh Tugasan Aktif" (contoh: 01/12/2026 - 15/12/2026) dan nama "Penyelia (SV) Incaj".',
      'Jika ingin melihat rekod yang telah dihantar sebelum ini, klik pautan "Buka Rekod Permohonan Roster" di bahagian atas.',
      'Sekiranya borang memaparkan notis ditutup, hubungi Penyelia / Admin bertugas untuk pengesahan.',
    ],
  },
  {
    stepNumber: 2,
    title: 'Langkah 1: Baca & Tandakan Semua 5 Peringatan Penting',
    summary:
      'Semua pemohon wajib membaca dan menandakan kesemua 5 kotak pengakuan sebelum borang pilihan syif dibuka.',
    bullets: [
      'Semak Tempoh Tugasan dan Tarikh Tutup Permohonan pada item 1 dan 2.',
      'Perhatian item 3: PPP yang berhasrat untuk kerja Malam pada tarikh tertentu perlu mendapatkan tandatangan kelulusan daripada En Ravi terlebih dahulu sebelum memuat naik (UPLOAD).',
      'Perhatian item 4 & 5: Berikan alasan kukuh kepada Penyelia bagi permohonan single syif, dan maklumkan lebih awal kepada Penyelia sebelum mendaftar sebarang kursus.',
      'Tandakan kesemua 5 kotak semak (wajib) dan klik butang "Teruskan ke Borang Permohonan".',
    ],
  },
  {
    stepNumber: 3,
    title: 'Langkah 2: Pengisian Alamat E-mel & Pemilihan Nama Pemohon',
    summary:
      'Isikan alamat e-mel yang sah dan pilih nama anda daripada senarai abjad PPP U5.',
    bullets: [
      'Jika pelayar mengesan e-mel terdahulu anda, tandakan kotak "Gunakan emel ini" atau klik "Tukar akaun" / "+ Guna emel lain" untuk memasukkan e-mel baharu.',
      'Pastikan alamat e-mel aktif diisi dengan betul pada ruangan "Alamat E-mel *" (contoh: nama@moh.gov.my atau gmail.com).',
      'Pada ruangan "NAMA PEMOHON (SUSUNAN IKUT ABJAD) *", pilih nama penuh anda daripada senarai dropdown.',
    ],
  },
  {
    stepNumber: 4,
    title: 'Semakan & Pengesahan No. Telefon Bimbit',
    summary:
      'Sistem akan mencari nombor telefon anda daripada direktori Senarai Nama PPPU5 dan memerlukan pengesahan sebelum penghantaran.',
    bullets: [
      'Apabila nama dipilih, sistem menyemak nombor telefon sedia ada secara automatik.',
      'Jika nombor telefon dipaparkan, semak ketepatannya (atau masukkan nombor baharu jika bertukar nombor).',
      'Jika tiada nombor dalam simpanan, masukkan nombor telefon bimbit yang sah (minimum 9 digit). Nombor ini akan auto-simpan pada respon pertama semasa penghantaran.',
      'WAJIB klik butang hijau "Sahkan" di sebelah medan telefon sehingga status bertukar kepada "No. Telefon Telah direkodkan." (Disahkan).',
    ],
    importantNote:
      'Borang tidak boleh dihantar sekiranya status telefon masih memaparkan "No belum disahkan".',
  },
  {
    stepNumber: 5,
    title: 'Pilihan Syif Tarikh Harian, Tarikh Gantian & Catatan Wajib (*)',
    summary:
      'Pilih syif atau status bagi tarikh yang diperlukan sepanjang tempoh tugasan aktif.',
    bullets: [
      'Pilih sekurang-kurangnya satu (1) tarikh daripada senarai harian mengikut pilihan: CR, CG, HKA OFF, HK OFF, PG SHJ, PT SHJ, KURSUS, M.TEAM, MESYUARAT, atau LAIN-LAIN.',
      'Jika memilih CG, HKA OFF, atau HK OFF: medan "Pilih Tarikh Pilihan / Gantian *" akan muncul dan wajib dipilih.',
      'Jika memilih KURSUS atau LAIN-LAIN: medan "Catatan / Nama Kursus *" atau "Catatan / Alasan Lain-lain *" wajib diisi dengan maklumat terperinci.',
    ],
    importantNote:
      'Semua medan bertanda bintang merah (*) adalah wajib diisi sebelum borang dibenarkan untuk dihantar.',
  },
  {
    stepNumber: 6,
    title: 'Muat Naik atau Pautan Surat Kelulusan (Jika Berkenaan)',
    summary:
      'Lampirkan bukti kelulusan bagi permohonan kerja malam, kursus, atau permohonan lain yang memerlukan pengesahan bertulis.',
    bullets: [
      'Pilih mod "Muat Naik Fail" untuk memuat naik dokumen PDF, JPG, PNG, DOC, atau DOCX (saiz maksimum 5 MB). Fail akan disimpan terus ke folder Google Drive mengikut tempoh tugasan.',
      'Atau pilih mod "Pautan Google Drive" untuk menampal pautan fail Google Drive atau catatan rujukan kelulusan.',
      'Tandakan "Hantar salinan ringkasan permohonan ke emel saya" sekiranya anda ingin menerima salinan melalui e-mel.',
    ],
  },
  {
    stepNumber: 7,
    title: 'Semakan Akhir & Pengesahan Penghantaran',
    summary:
      'Semak semua butiran permohonan dalam tetingkap pengesahan sebelum rekod dihantar ke Google Sheets.',
    bullets: [
      'Klik butang hijau "Hantar" di bahagian bawah borang.',
      'Semak semula tempoh tugasan, nama, no. telefon, e-mel, surat kelulusan, dan senarai pilihan syif harian dalam tetingkap "Pengesahan Maklumat Permohonan".',
      'Tandakan kotak pengesahan "Saya sahkan semua maklumat permohonan di atas adalah benar, tepat dan lengkap."',
      'Biarkan pilihan "Simpan dan hantar ke WhatsApp" bertanda jika ingin membuka ringkasan WhatsApp selepas rekod disimpan, kemudian tekan "Sahkan dan Hantar".',
      'Tunggu proses penyimpanan selesai (jangan tutup pelayar semasa mesej pemprosesan berjalan).',
    ],
  },
  {
    stepNumber: 8,
    title: 'Salinan WhatsApp, Semakan Rekod & Tamat Permohonan',
    summary:
      'Lengkapkan penghantaran salinan WhatsApp dan pastikan rekod anda disahkan masuk ke sistem.',
    bullets: [
      'Jika pilihan WhatsApp diaktifkan, tetingkap ringkasan WhatsApp dipaparkan untuk disalin atau dihantar terus ke WhatsApp Penyelia / kumpulan.',
      'Jika notifikasi laman web diaktifkan dan WhatsApp tidak dibuka serta-merta, paparan pengesahan "Permohonan bagi Tugasan ... Berjaya di rekodkan. Terima kasih." akan muncul.',
      'Pada skrin "Permohonan Berjaya.", anda boleh menekan "Hantar Salinan ke WhatsApp", "Pratonton Rekod di Google Sheets", atau "Fail Surat Kelulusan (Drive)".',
      'Klik "Tamat Permohonan" untuk mengakhiri sesi dengan selamat atau "Hantar Permohonan Baharu" jika perlu membuat permohonan lain.',
    ],
  },
  {
    stepNumber: 9,
    title: 'Auto-Simpan Draf & Semakan Log History',
    summary:
      'Borang melindungi pengisian anda daripada kehilangan data jika berlaku gangguan sambungan atau refresh pelayar.',
    bullets: [
      'Draf borang disimpan secara automatik dalam pelayar. Jika halaman dimuat semula, sepanduk pemulihan sesi membolehkan anda meneruskan pengisian atau klik "Kosongkan Draf".',
      'Klik butang "Log History" di bahagian atas halaman untuk melihat catatan rekod simpanan yang berjaya ("Data berjaya disimpan ke helaian...") atau menyemak sebarang ralat penghantaran.',
    ],
  },
];

export function buildUserGuidelineShareSummary(config: AppConfig): string {
  const tajuk1 = (config.tajuk1 || DEFAULT_CONFIG.tajuk1).trim();
  const version = normalizeAppVersion(config.appVersion, DEFAULT_CONFIG.appVersion);
  const edition = (config.editionName || DEFAULT_CONFIG.editionName).trim();
  const tempoh = `${formatDateDisplay(config.startDate)} - ${formatDateDisplay(config.endDate)}`;
  return (
    `*PANDUAN PENGGUNA (USER GUIDELINE)*\n` +
    `Permohonan Jadual Tugas PPP U5 — ${tajuk1}\n` +
    `Versi ${version} (${edition})\n` +
    `Tempoh Tugasan Semasa: ${tempoh}\n\n` +
    `Ringkasan Langkah:\n` +
    USER_GUIDELINE_SECTIONS.map((s) => `${s.stepNumber}. ${s.title}`).join('\n')
  );
}

export function generateUserGuidelinePdfBlob(config: AppConfig): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  const tajuk1 = (config.tajuk1 || DEFAULT_CONFIG.tajuk1).trim();
  const version = normalizeAppVersion(config.appVersion, DEFAULT_CONFIG.appVersion);
  const edition = (config.editionName || DEFAULT_CONFIG.editionName).trim();
  const updatedAt = (config.versionUpdatedAt || DEFAULT_CONFIG.versionUpdatedAt).trim();
  const footerText = (config.footerText || DEFAULT_CONFIG.footerText).trim();
  const svName = (config.svName || DEFAULT_CONFIG.svName).trim();
  const tempoh = `${formatDateDisplay(config.startDate)} - ${formatDateDisplay(config.endDate)}`;

  let y = 16;

  const drawHeaderBanner = () => {
    doc.setFillColor(3, 105, 161); // sky-700
    doc.roundedRect(marginX, 12, contentWidth, 30, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('PANDUAN PENGGUNA (USER GUIDELINE)', marginX + 5, 20);

    doc.setFontSize(10);
    doc.text(`PERMOHONAN JADUAL TUGAS PPP U5 - ${tajuk1}`, marginX + 5, 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      `Versi ${version} (${edition})  |  Tempoh Aktif: ${tempoh}  |  SV Incaj: ${svName}`,
      marginX + 5,
      32
    );
    doc.text(
      'Panduan lengkap penggunaan sistem dari awal hingga akhir mengikut akses Pengguna (User).',
      marginX + 5,
      37.5
    );

    y = 48;
  };

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 18) {
      doc.addPage();
      y = 16;
    }
  };

  drawHeaderBanner();

  USER_GUIDELINE_SECTIONS.forEach((section) => {
    const summaryLines = doc.splitTextToSize(section.summary, contentWidth - 8) as string[];
    const bulletBlocks = section.bullets.map((b) =>
      doc.splitTextToSize(`- ${b}`, contentWidth - 10) as string[]
    );
    const noteLines = section.importantNote
      ? (doc.splitTextToSize(`Nota Penting: ${section.importantNote}`, contentWidth - 10) as string[])
      : [];

    const estimatedHeight =
      10 +
      summaryLines.length * 4.2 +
      bulletBlocks.reduce((acc, lines) => acc + lines.length * 4.1 + 1, 0) +
      (noteLines.length > 0 ? noteLines.length * 4.1 + 4 : 0) +
      5;

    ensureSpace(Math.min(estimatedHeight, 65));

    // Step Title Bar
    doc.setFillColor(240, 249, 255); // sky-50
    doc.setDrawColor(186, 230, 253); // sky-200
    doc.roundedRect(marginX, y, contentWidth, 7.5, 1.5, 1.5, 'FD');

    doc.setTextColor(7, 89, 133); // sky-800
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`Langkah ${section.stepNumber}: ${section.title}`, marginX + 3, y + 5);
    y += 10.5;

    // Summary
    doc.setTextColor(51, 65, 85); // slate-700
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    summaryLines.forEach((line) => {
      ensureSpace(5);
      doc.text(line, marginX + 2, y);
      y += 4.2;
    });
    y += 1;

    // Bullets
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFontSize(8.5);
    bulletBlocks.forEach((lines) => {
      ensureSpace(lines.length * 4.2 + 2);
      lines.forEach((line, lineIdx) => {
        doc.text(line, marginX + (lineIdx === 0 ? 3 : 6), y);
        y += 4.1;
      });
      y += 0.8;
    });

    // Important Note
    if (noteLines.length > 0) {
      const boxH = noteLines.length * 4.1 + 3.5;
      ensureSpace(boxH + 2);
      doc.setFillColor(255, 251, 235); // amber-50
      doc.setDrawColor(253, 230, 138); // amber-200
      doc.roundedRect(marginX + 2, y - 1, contentWidth - 4, boxH, 1.2, 1.2, 'FD');
      doc.setTextColor(146, 64, 14); // amber-800
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      let ny = y + 3;
      noteLines.forEach((line) => {
        doc.text(line, marginX + 4.5, ny);
        ny += 4.1;
      });
      y += boxH + 2;
    }

    y += 3;
  });

  // Add consistent page footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 13, pageWidth - marginX, pageHeight - 13);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      `${footerText}, PPPU5 Roster Management System • Versi ${version} (Kemaskini: ${updatedAt})`,
      marginX,
      pageHeight - 8.5
    );
    doc.text(`Muka ${p} / ${totalPages}`, pageWidth - marginX, pageHeight - 8.5, {
      align: 'right',
    });
  }

  return doc.output('blob');
}
