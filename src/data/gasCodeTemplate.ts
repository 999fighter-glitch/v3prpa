export const PROJECT_SHARED_URL =
  'https://ais-pre-mi4b2guiirsa3dzygt2nyo-258571690397.asia-southeast1.run.app';

export const UPDATED_GAS_CODE = `/**
 * Google Apps Script Backend untuk Permohonan Jadual Tugas PPP U5
 * - Menyokong deploy terus HTML ("Index.html") di dalam Google Apps Script (HtmlService + google.script.run)
 * - Menyokong juga API luaran (doGet / doPost JSON)
 * - Automatik mengesan Active Sheet apabila Google Sheet disalin (Make a copy) ke akaun Google lain
 * - Menyemak & mengesahkan folder rujukan Google Drive untuk Surat Kelulusan
 * - Memuat naik fail Surat Kelulusan ke subfolder mengikut Tempoh Tugasan & simpan pautan fail ke Sheet
 */

var PROJECT_WEB_APP_URL = "https://ais-pre-mi4b2guiirsa3dzygt2nyo-258571690397.asia-southeast1.run.app";
var DEFAULT_GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycby8AKPL8DO-KOk220KCtDl4DRI_HrSccKmQoxCEA0V1tILhkC6ICy8Z4DAofJR_2Jo9hg/exec";
var DEFAULT_BANNER_LOGO_URL = "https://ais-pre-7tcn55bgofr3n6meysstl3-258571690397.asia-southeast1.run.app/assets/aistudio/RefineUpgrade_Logo_7d07d3af.jpg";

// ============================================================================
// >>> [TUKAR DI SINI] LINK FOLDER GOOGLE DRIVE UNTUK SURAT KELULUSAN <<<
// Tampal URL folder atau Folder ID Google Drive akaun anda di bawah:
// Contoh: "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz"
// ============================================================================
var DEFAULT_APPROVAL_FOLDER_URL = "https://drive.google.com/drive/folders/1uzm7dR-aCCh6u_xTqFsL532g6aXgkVRoNVX3SsUnKnvEEGFAR_SqY8sU9dXrtxph4o1bDv3f";

// ID & URL Google Sheet Rujukan Rasmi (Fallback jika skrip tidak terikat pada mana-mana Sheet)
// Kosongkan DEFAULT_SPREADSHEET_URL = "" untuk menggunakan Active Spreadsheet (Sheet semasa) secara automatik
var DEFAULT_SPREADSHEET_ID = "1DE-YQdkf6l8dhb-iv6GYOXnAsIEpFKKChzMOVV6GgqA";
var DEFAULT_SPREADSHEET_URL = "";
var STAFF_DIRECTORY_SHEET_NAME = "Senarai Nama PPPU5";

function isSystemSheetName(name) {
  var trimmed = String(name || "").trim();
  return (
    trimmed === "SETTINGS" ||
    trimmed === STAFF_DIRECTORY_SHEET_NAME ||
    trimmed === "Senarai Nama PPP" ||
    /^Form Responses/i.test(trimmed)
  );
}

function extractSpreadsheetId(urlOrId) {
  if (!urlOrId) return "";
  var raw = String(urlOrId).trim();
  var match = raw.match(/\\/d\\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(raw)) return raw;
  return "";
}

function getTargetSpreadsheet(customUrl) {
  try {
    if (DEFAULT_SPREADSHEET_URL && DEFAULT_SPREADSHEET_URL.indexOf("/d/") !== -1) {
      var defaultId = extractSpreadsheetId(DEFAULT_SPREADSHEET_URL);
      if (defaultId) {
        return SpreadsheetApp.openById(defaultId);
      }
    }
    // Jika skrip terikat (Container-Bound) pada Google Sheet (termasuk salinan di akaun lain), utamakan Active Spreadsheet
    var activeSs = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSs) {
      return activeSs;
    }
    if (customUrl && customUrl.indexOf("/d/") !== -1) {
      var customId = extractSpreadsheetId(customUrl);
      if (customId) {
        return SpreadsheetApp.openById(customId);
      }
    }
    return SpreadsheetApp.openById(DEFAULT_SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(DEFAULT_SPREADSHEET_ID);
  }
}

function stripSheetGid(url) {
  if (!url) return "";
  return String(url)
    .trim()
    .replace(/#gid=\\d+/gi, "")
    .replace(/([?&])gid=\\d+(&|$)/g, function(_, prefix, suffix) {
      return suffix === "&" ? prefix : "";
    })
    .replace(/[?&]+$/, "");
}

function getSpreadsheetBaseUrl(ss, fallbackUrl) {
  try {
    if (ss) return ss.getUrl();
  } catch (e) {}
  return stripSheetGid(fallbackUrl || "");
}

function buildSheetUrlWithGid(ss, sheet) {
  if (!ss) return "";
  var baseUrl = ss.getUrl();
  if (sheet) {
    return baseUrl + "#gid=" + sheet.getSheetId();
  }
  return baseUrl;
}

function formatTempohFromIso(startIso, endIso) {
  if (!startIso || !endIso) return "";
  var sp = String(startIso).trim().split("-");
  var ep = String(endIso).trim().split("-");
  if (sp.length === 3 && ep.length === 3) {
    return sp[2] + "/" + sp[1] + "/" + sp[0] + " - " + ep[2] + "/" + ep[1] + "/" + ep[0];
  }
  return "";
}

function formatFirstDateHeaderFromIso(startIso) {
  if (!startIso) return "";
  var sp = String(startIso).trim().split("-");
  if (sp.length === 3) {
    return "Date: " + parseInt(sp[2], 10) + "/" + parseInt(sp[1], 10) + "/" + sp[0];
  }
  return "";
}

function buildDateHeadersFromIsoRange(startIso, endIso) {
  if (!startIso || !endIso) return [];
  var sp = String(startIso).trim().split("-");
  var ep = String(endIso).trim().split("-");
  if (sp.length !== 3 || ep.length !== 3) return [];
  var start = new Date(Number(sp[0]), Number(sp[1]) - 1, Number(sp[2]));
  var end = new Date(Number(ep[0]), Number(ep[1]) - 1, Number(ep[2]));
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
  var cols = [];
  var curr = new Date(start.getTime());
  var guard = 0;
  while (curr <= end && guard < 62) {
    cols.push("Date: " + curr.getDate() + "/" + (curr.getMonth() + 1) + "/" + curr.getFullYear());
    curr.setDate(curr.getDate() + 1);
    guard++;
  }
  return cols;
}

function isMismatchedPeriodSheetName(sheetName, expectedSheetName) {
  if (!sheetName || !expectedSheetName) return false;
  return sheetName.indexOf("TUGAS PPPU5 ") === 0 && sheetName !== expectedSheetName;
}

function findTargetSheetForPeriod(ss, tempohTugasan, firstDateHeader, preferredUrl) {
  if (!ss) return null;
  var expectedSheetName = tempohTugasan ? ("TUGAS PPPU5 " + tempohTugasan) : "";
  if (expectedSheetName) {
    var namedSheet = ss.getSheetByName(expectedSheetName);
    if (namedSheet) {
      return namedSheet;
    }
  }
  var sheets = ss.getSheets();
  if (preferredUrl && preferredUrl.indexOf("gid=") !== -1) {
    var gidMatch = preferredUrl.match(/gid=(\\d+)/);
    if (gidMatch && gidMatch[1]) {
      var targetGid = Number(gidMatch[1]);
      for (var s = 0; s < sheets.length; s++) {
        var candidateName = sheets[s].getName();
        if (
          sheets[s].getSheetId() === targetGid &&
          !isSystemSheetName(candidateName) &&
          !isMismatchedPeriodSheetName(candidateName, expectedSheetName)
        ) {
          if (!firstDateHeader) {
            if (!expectedSheetName) return sheets[s];
            continue;
          }
          var existingHeaders = sheets[s].getRange(1, 1, 1, Math.max(1, sheets[s].getLastColumn())).getValues()[0];
          var normalizedExisting = existingHeaders.map(function(h) {
            return String(h).replace(/\\s+/g, " ").trim();
          });
          if (findHeaderIndex(normalizedExisting, firstDateHeader, -1) !== -1) {
            return sheets[s];
          }
        }
      }
    }
  }
  if (firstDateHeader) {
    for (var i = 0; i < sheets.length; i++) {
      var sName = sheets[i].getName();
      if (isSystemSheetName(sName) || isMismatchedPeriodSheetName(sName, expectedSheetName)) continue;
      var hdrs = sheets[i].getRange(1, 1, 1, Math.max(1, sheets[i].getLastColumn())).getValues()[0];
      var normHdrs = hdrs.map(function(h) {
        return String(h).replace(/\\s+/g, " ").trim();
      });
      if (findHeaderIndex(normHdrs, firstDateHeader, -1) !== -1) {
        return sheets[i];
      }
    }
  }
  try {
    var activeSheet = ss.getActiveSheet();
    if (
      activeSheet &&
      !isSystemSheetName(activeSheet.getName()) &&
      !isMismatchedPeriodSheetName(activeSheet.getName(), expectedSheetName)
    ) {
      if (!firstDateHeader) {
        if (!expectedSheetName) return activeSheet;
      } else {
        var actHdrs = activeSheet.getRange(1, 1, 1, Math.max(1, activeSheet.getLastColumn())).getValues()[0];
        var normAct = actHdrs.map(function(h) {
          return String(h).replace(/\\s+/g, " ").trim();
        });
        if (findHeaderIndex(normAct, firstDateHeader, -1) !== -1) {
          return activeSheet;
        }
      }
    }
  } catch (e) {}
  return null;
}

function getActiveSheetUrl(ss) {
  if (DEFAULT_SPREADSHEET_URL) {
    return DEFAULT_SPREADSHEET_URL;
  }
  try {
    var targetSs = ss || getTargetSpreadsheet();
    if (targetSs) {
      var baseUrl = targetSs.getUrl();
      var activeSheet = targetSs.getActiveSheet();
      if (activeSheet && !isSystemSheetName(activeSheet.getName())) {
        return baseUrl + "#gid=" + activeSheet.getSheetId();
      }
      return baseUrl;
    }
  } catch (e) {}
  return "";
}

function formatIsoDateCell(ss, val) {
  if (!val) return "";
  if (Object.prototype.toString.call(val) === "[object Date]" && !isNaN(val.getTime())) {
    return Utilities.formatDate(val, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
  }
  return String(val).trim();
}

function formatDateHeader(dateStr) {
  if (!dateStr) return "";
  var clean = String(dateStr).trim();
  if (clean.indexOf("Date:") === 0) return clean;
  var datePart = clean.split(" ")[0];
  var parts = datePart.split("/");
  if (parts.length === 3) {
    var d = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var y = parts[2];
    return "Date: " + d + "/" + m + "/" + y;
  }
  return "Date: " + clean;
}

function extractDriveFolderId(folderUrlOrId) {
  if (!folderUrlOrId) return "";
  var raw = String(folderUrlOrId).trim();
  if (!raw) return "";
  var foldersMatch = raw.match(/\\/folders\\/([a-zA-Z0-9-_]+)/);
  if (foldersMatch && foldersMatch[1]) return foldersMatch[1];
  var idParamMatch = raw.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];
  if (/^[a-zA-Z0-9-_]{15,}$/.test(raw)) return raw;
  return "";
}

function validateDriveFolder(folderUrlOrId) {
  if (!folderUrlOrId || !String(folderUrlOrId).trim()) {
    return {
      valid: false,
      status: "missing",
      message: "Amaran: Pautan folder rujukan Google Drive belum ditetapkan di Admin Panel."
    };
  }
  var folderId = extractDriveFolderId(folderUrlOrId);
  if (!folderId) {
    return {
      valid: false,
      status: "invalid",
      message: "Amaran: Format pautan folder Google Drive tidak sah. Sila masukkan URL folder Drive yang betul."
    };
  }
  try {
    var folder = DriveApp.getFolderById(folderId);
    if (!folder || folder.isTrashed()) {
      return {
        valid: false,
        status: "missing",
        message: "Amaran: Folder rujukan Google Drive telah dipadam atau tiada di lokasi tersebut."
      };
    }
    return {
      valid: true,
      status: "ok",
      folderId: folderId,
      folderName: folder.getName(),
      folderUrl: folder.getUrl(),
      message: "Lokasi folder rujukan disahkan: '" + folder.getName() + "'."
    };
  } catch (err) {
    var errText = err ? err.toString() : "";
    if (errText.indexOf("You do not have permission") !== -1 || errText.indexOf("Required permissions") !== -1) {
      return {
        valid: false,
        status: "permission_error",
        message: "Ralat Kebenaran Google Drive (DriveApp): Skrip GAS belum diluluskan akses Drive. Buka Apps Script Editor -> pilih fungsi 'authorizeDriveAndSheets' -> klik Run & Allow permissions, kemudian buat New Deployment."
      };
    }
    return {
      valid: false,
      status: "error",
      message: "Amaran: Folder Google Drive tidak dijumpai atau tiada kebenaran akses (" + errText + ")."
    };
  }
}

function getOrCreatePeriodSubfolder(parentFolder, tempohTugasan) {
  var safeFolderName = String(tempohTugasan || "JADUAL")
    .replace(/[\\\\/:*?"<>|]/g, "-")
    .trim();
  var existing = parentFolder.getFoldersByName(safeFolderName);
  if (existing.hasNext()) {
    return existing.next();
  }
  return parentFolder.createFolder(safeFolderName);
}

function guessMimeTypeFromName(fileName, providedMime) {
  if (providedMime && providedMime !== "application/octet-stream") {
    return providedMime;
  }
  var lower = String(fileName || "").toLowerCase();
  if (lower.indexOf(".pdf") !== -1) return "application/pdf";
  if (lower.indexOf(".jpg") !== -1 || lower.indexOf(".jpeg") !== -1) return "image/jpeg";
  if (lower.indexOf(".png") !== -1) return "image/png";
  if (lower.indexOf(".docx") !== -1) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.indexOf(".doc") !== -1) return "application/msword";
  return providedMime || "application/octet-stream";
}

function saveApprovalFileToDrive(folderUrlOrId, tempohTugasan, namaPemohon, fileObj) {
  var check = validateDriveFolder(folderUrlOrId);
  if (!check.valid) {
    return check;
  }
  try {
    var rootFolder = DriveApp.getFolderById(check.folderId);
    var targetFolder = rootFolder;
    try {
      targetFolder = getOrCreatePeriodSubfolder(rootFolder, tempohTugasan);
    } catch (subErr) {
      targetFolder = rootFolder;
    }
    var rawBase64 = String(fileObj.base64 || "").replace(/^data:[^;]+;base64,/, "").replace(/\\s+/g, "");
    var decodedBytes = Utilities.base64Decode(rawBase64);
    var safeApplicant = String(namaPemohon || "PEMOHON").replace(/[\\\\/:*?"<>|]/g, "_").trim();
    var finalName = safeApplicant + " - " + (fileObj.name || "Surat_Kelulusan");
    var resolvedMime = guessMimeTypeFromName(fileObj.name, fileObj.mimeType);
    var blob = Utilities.newBlob(decodedBytes, resolvedMime, finalName);
    var savedFile = targetFolder.createFile(blob);
    try {
      savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {}
    return {
      valid: true,
      status: "ok",
      fileUrl: savedFile.getUrl(),
      fileName: savedFile.getName(),
      folderName: targetFolder.getName()
    };
  } catch (err) {
    var errText = err ? err.toString() : "";
    if (errText.indexOf("Required permissions") !== -1 || errText.indexOf("You do not have permission to call DriveApp") !== -1) {
      return {
        valid: false,
        status: "permission_error",
        message: "Ralat Skop OAuth Drive (https://www.googleapis.com/auth/drive): Skrip GAS hanya diluluskan baca sahaja (drive.readonly). Sila kemaskini Code.gs, jalankan fungsi 'authorizeDriveAndSheets' di Editor (Run -> Review permissions -> Allow), dan buat New Deployment."
      };
    }
    if (errText.indexOf("permission") !== -1 || errText.indexOf("Access denied") !== -1) {
      return {
        valid: false,
        status: "permission_error",
        message: "Amaran Kebenaran Tulis Drive: Akaun skrip tiada kebenaran Editor untuk memuat naik fail ke folder ini (" + errText + "). Pastikan pemilik folder memberi akses Editor kepada akaun Google Apps Script atau guna folder Drive milik anda sendiri."
      };
    }
    return {
      valid: false,
      status: "error",
      message: "Amaran: Gagal menyimpan fail Surat Kelulusan ke Google Drive (" + errText + ")."
    };
  }
}

function normalizeVersionText(val) {
  var trimmed = (val !== undefined && val !== null) ? String(val).trim() : "";
  if (!trimmed) return "3.0";
  if (/^\\d+$/.test(trimmed)) return trimmed + ".0";
  return trimmed;
}

function readSettingsFromSheet() {
  var ss = getTargetSpreadsheet();
  var activeUrl = getActiveSheetUrl(ss);
  var activeSsId = ss ? ss.getId() : "";
  var configSheet = ss ? ss.getSheetByName("SETTINGS") : null;
  if (configSheet && configSheet.getLastRow() >= 2) {
    var maxCols = Math.max(16, configSheet.getLastColumn());
    var settingsRange = configSheet.getRange(2, 1, 1, maxCols);
    var vals = settingsRange.getValues()[0];
    var displayVals = settingsRange.getDisplayValues()[0];
    var savedRecordUrl = vals[6] ? String(vals[6]).trim() : "";
    var savedSheetId = extractSpreadsheetId(savedRecordUrl);
    // Kesan jika Google Sheet ini baru disalin (Make a copy) ke akaun / fail baharu
    var isCopiedToNewSheet = Boolean(activeSsId && savedSheetId && savedSheetId !== activeSsId);

    var rawNotify = vals[10];
    var notifyEnabled = rawNotify === "" || rawNotify === undefined || rawNotify === null
      ? true
      : (rawNotify === true || String(rawNotify).toUpperCase() === "TRUE");

    var startDateIso = formatIsoDateCell(ss, vals[0]);
    var endDateIso = formatIsoDateCell(ss, vals[1]);
    var activeTempoh = formatTempohFromIso(startDateIso, endDateIso);
    var firstHdr = formatFirstDateHeaderFromIso(startDateIso);
    var periodTargetSheet = findTargetSheetForPeriod(ss, activeTempoh, firstHdr, savedRecordUrl);
    var periodSheetUrl = periodTargetSheet ? buildSheetUrlWithGid(ss, periodTargetSheet) : "";
    var cleanBaseUrl = getSpreadsheetBaseUrl(ss, savedRecordUrl);

    var resolvedSheetUrl = periodSheetUrl || (
      activeTempoh
        ? (isCopiedToNewSheet ? cleanBaseUrl : (stripSheetGid(savedRecordUrl) || cleanBaseUrl))
        : (isCopiedToNewSheet ? activeUrl : (savedRecordUrl || activeUrl))
    );
    var resolvedFolderUrl = isCopiedToNewSheet
      ? DEFAULT_APPROVAL_FOLDER_URL
      : ((vals[9] ? String(vals[9]).trim() : "") || DEFAULT_APPROVAL_FOLDER_URL);

    var savedTajuk1 = String(displayVals[11] || vals[11] || "").trim() || "Unit PRPA HTAR";
    var savedFooterText = String(displayVals[12] || vals[12] || "").trim() || "Hak Cipta Terpelihara © 2026";
    var savedAppVersion = normalizeVersionText(displayVals[13] || vals[13]);
    var savedEditionName = String(displayVals[14] || vals[14] || "").trim() || "Edisi Terkini Dis 2026";
    var savedVersionUpdatedAt = String(displayVals[15] || vals[15] || "").trim() || "Disember 2026";

    return {
      startDate: startDateIso,
      endDate: endDateIso,
      closingDate: formatIsoDateCell(ss, vals[2]),
      forceStatus: String(displayVals[3] || vals[3] || "AUTO").trim() || "AUTO",
      svName: String(displayVals[4] || vals[4] || "En. Ravi").trim() || "En. Ravi",
      spreadsheetUrl: resolvedSheetUrl,
      recordSpreadsheetUrl: resolvedSheetUrl,
      logoUrl: String(displayVals[7] || vals[7] || DEFAULT_BANNER_LOGO_URL).trim() || DEFAULT_BANNER_LOGO_URL,
      approvalFolderUrl: resolvedFolderUrl,
      enableSaveNotification: notifyEnabled,
      tajuk1: savedTajuk1,
      footerText: savedFooterText,
      appVersion: savedAppVersion,
      editionName: savedEditionName,
      versionUpdatedAt: savedVersionUpdatedAt
    };
  }
  return null;
}

// ============================================================================
// DATABASE HELAIAN 'Senarai Nama PPPU5' (Email, Nama, No Telefon)
// ============================================================================

function getOrCreateStaffDirectorySheet(ss) {
  var sheet = ss.getSheetByName(STAFF_DIRECTORY_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(STAFF_DIRECTORY_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    var headers = ["Email", "Nama", "No Telefon"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#0288d1")
      .setFontColor("#ffffff")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.getRange("C:C").setNumberFormat("@");
  }
  return sheet;
}

function getStaffDirectoryColumnIndexes(sheet) {
  var lastCol = Math.max(3, sheet.getLastColumn());
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var norm = headers.map(function(h) {
    return String(h || "").replace(/\\s+/g, " ").trim();
  });
  return {
    emailCol: findHeaderIndex(norm, "Email", 0),
    nameCol: findHeaderIndex(norm, "Nama", 1),
    phoneCol: findHeaderIndex(norm, "No Telefon", 2)
  };
}

function readStaffDirectoryData(ss) {
  var directory = {};
  var recordsByName = {};
  var recordsByEmail = {};
  if (!ss) {
    return { directory: directory, recordsByName: recordsByName, recordsByEmail: recordsByEmail };
  }
  var sheet = ss.getSheetByName(STAFF_DIRECTORY_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return { directory: directory, recordsByName: recordsByName, recordsByEmail: recordsByEmail };
  }
  var cols = getStaffDirectoryColumnIndexes(sheet);
  var numCols = Math.max(3, cols.emailCol + 1, cols.nameCol + 1, cols.phoneCol + 1);
  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, numCols).getDisplayValues();
  for (var i = 0; i < rows.length; i++) {
    var rowEmail = String(rows[i][cols.emailCol] || "").trim().toLowerCase();
    var rowName = String(rows[i][cols.nameCol] || "").replace(/\\s+/g, " ").trim().toUpperCase();
    var rowPhone = String(rows[i][cols.phoneCol] || "").trim();
    var entry = { email: rowEmail, nama: rowName, noTelefon: rowPhone };
    if (rowName) {
      recordsByName[rowName] = entry;
      if (rowPhone) {
        directory[rowName] = rowPhone;
      }
    }
    if (rowEmail) {
      recordsByEmail[rowEmail] = entry;
    }
  }
  return { directory: directory, recordsByName: recordsByName, recordsByEmail: recordsByEmail };
}

function upsertStaffDirectoryPPPU5(ss, email, namaPemohon, noTelefon, firstResponseOnly) {
  var cleanEmail = String(email || "").trim().toLowerCase();
  var cleanName = String(namaPemohon || "").replace(/\\s+/g, " ").trim().toUpperCase();
  var cleanPhone = String(noTelefon || "").trim();

  if (!ss || (!cleanName && !cleanEmail)) {
    return {
      status: "error",
      saved: false,
      message: "Email atau Nama diperlukan untuk disimpan ke Senarai Nama PPPU5."
    };
  }

  var sheet = getOrCreateStaffDirectorySheet(ss);
  var cols = getStaffDirectoryColumnIndexes(sheet);
  var emailColNum = cols.emailCol + 1;
  var nameColNum = cols.nameCol + 1;
  var phoneColNum = cols.phoneCol + 1;
  var lastRow = sheet.getLastRow();
  var existingRow = -1;

  if (lastRow >= 2) {
    var numCols = Math.max(3, emailColNum, nameColNum, phoneColNum);
    var values = sheet.getRange(2, 1, lastRow - 1, numCols).getDisplayValues();
    for (var i = 0; i < values.length; i++) {
      var candName = String(values[i][cols.nameCol] || "").replace(/\\s+/g, " ").trim().toUpperCase();
      var candEmail = String(values[i][cols.emailCol] || "").trim().toLowerCase();
      if ((cleanName && candName === cleanName) || (!cleanName && cleanEmail && candEmail === cleanEmail)) {
        existingRow = i + 2;
        break;
      }
    }
  }

  var isFirstTimeSave = existingRow === -1;
  if (isFirstTimeSave) {
    var targetRow = lastRow >= 1 ? lastRow + 1 : 2;
    var rowData = ["", "", ""];
    rowData[cols.emailCol] = cleanEmail;
    rowData[cols.nameCol] = cleanName;
    rowData[cols.phoneCol] = cleanPhone;
    sheet.getRange(targetRow, phoneColNum).setNumberFormat("@");
    sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    var existingEmail = String(sheet.getRange(existingRow, emailColNum).getDisplayValue() || "").trim();
    var existingPhone = String(sheet.getRange(existingRow, phoneColNum).getDisplayValue() || "").trim();

    if (firstResponseOnly) {
      // Auto-simpan respon pertama & kemaskini No Telefon jika pengguna memasukkan nombor baharu
      if (!existingEmail && cleanEmail) {
        sheet.getRange(existingRow, emailColNum).setValue(cleanEmail);
      }
      if (cleanPhone && cleanPhone !== existingPhone) {
        sheet.getRange(existingRow, phoneColNum).setNumberFormat("@");
        sheet.getRange(existingRow, phoneColNum).setValue(cleanPhone);
      }
    } else {
      // Kemaskini eksplisit daripada borang (cth. butang Simpan / Kemaskini No. Telefon)
      if (cleanEmail) {
        sheet.getRange(existingRow, emailColNum).setValue(cleanEmail);
      }
      if (cleanPhone) {
        sheet.getRange(existingRow, phoneColNum).setNumberFormat("@");
        sheet.getRange(existingRow, phoneColNum).setValue(cleanPhone);
      }
    }
  }

  if (sheet.getLastRow() >= 3) {
    var sortCols = Math.max(3, sheet.getLastColumn());
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sortCols).sort({ column: nameColNum, ascending: true });
  }

  return {
    status: "ok",
    saved: true,
    isFirstTimeSave: isFirstTimeSave,
    email: cleanEmail,
    namaPemohon: cleanName,
    noTelefon: cleanPhone,
    sheetName: STAFF_DIRECTORY_SHEET_NAME,
    sheetUrl: buildSheetUrlWithGid(ss, sheet),
    message: isFirstTimeSave
      ? "Respon pertama (Email, Nama, No Telefon) berjaya auto-simpan ke helaian '" + STAFF_DIRECTORY_SHEET_NAME + "'."
      : "Rekod dalam helaian '" + STAFF_DIRECTORY_SHEET_NAME + "' berjaya dikemaskini."
  };
}

// ============================================================================
// FUNGSI PELAYAN (Dipanggil oleh google.script.run & API doGet/doPost)
// ============================================================================

function gasGetStaffDirectory(fallbackUrl) {
  try {
    var ss = getTargetSpreadsheet(fallbackUrl || "");
    var sheet = getOrCreateStaffDirectorySheet(ss);
    var parsed = readStaffDirectoryData(ss);
    return {
      status: "ok",
      directory: parsed.directory,
      recordsByName: parsed.recordsByName,
      recordsByEmail: parsed.recordsByEmail,
      sheetName: STAFF_DIRECTORY_SHEET_NAME,
      sheetUrl: buildSheetUrlWithGid(ss, sheet)
    };
  } catch (err) {
    return {
      status: "error",
      directory: {},
      recordsByName: {},
      recordsByEmail: {},
      message: err ? err.toString() : "Gagal membaca Senarai Nama PPPU5."
    };
  }
}

function gasLookupStaffPhone(namaPemohon, fallbackUrl, email) {
  try {
    var cleanName = String(namaPemohon || "").replace(/\\s+/g, " ").trim().toUpperCase();
    var cleanEmail = String(email || "").trim().toLowerCase();
    var ss = getTargetSpreadsheet(fallbackUrl || "");
    getOrCreateStaffDirectorySheet(ss);
    var parsed = readStaffDirectoryData(ss);
    var entry = (cleanName && parsed.recordsByName[cleanName]) || (cleanEmail && parsed.recordsByEmail[cleanEmail]) || null;
    var foundPhone = entry && entry.noTelefon ? entry.noTelefon : "";
    var foundEmail = entry && entry.email ? entry.email : "";
    var foundName = entry && entry.nama ? entry.nama : cleanName;
    return {
      status: "ok",
      found: Boolean(foundPhone),
      email: foundEmail,
      namaPemohon: foundName,
      noTelefon: foundPhone
    };
  } catch (err) {
    return {
      status: "error",
      found: false,
      email: "",
      noTelefon: "",
      message: err ? err.toString() : "Gagal menyemak Senarai Nama PPPU5."
    };
  }
}

function gasSaveStaffPhone(data) {
  try {
    var payload = data || {};
    var cleanEmail = String(payload.email || "").trim().toLowerCase();
    var cleanName = String(payload.namaPemohon || "").replace(/\\s+/g, " ").trim().toUpperCase();
    var cleanPhone = String(payload.noTelefon || "").trim();
    var phoneDigits = cleanPhone.replace(/\\D/g, "");
    if (!cleanName) {
      return { status: "error", message: "Sila pilih nama pemohon terlebih dahulu." };
    }
    if (phoneDigits.length < 9) {
      return { status: "error", message: "No. Telefon Bimbit tidak lengkap (minimum 9 digit)." };
    }
    var ss = getTargetSpreadsheet(payload.recordSpreadsheetUrl || "");
    return upsertStaffDirectoryPPPU5(ss, cleanEmail, cleanName, cleanPhone, false);
  } catch (err) {
    return {
      status: "error",
      message: err ? err.toString() : "Gagal menyimpan data ke Senarai Nama PPPU5."
    };
  }
}

function gasGetTargetSheetUrl(tempohTugasan, firstDateHeader, fallbackUrl) {
  try {
    var ss = getTargetSpreadsheet(fallbackUrl);
    var targetSheet = findTargetSheetForPeriod(ss, tempohTugasan || "", firstDateHeader || "", fallbackUrl || "");
    var resolvedUrl = targetSheet
      ? buildSheetUrlWithGid(ss, targetSheet)
      : (tempohTugasan ? getSpreadsheetBaseUrl(ss, fallbackUrl) : getActiveSheetUrl(ss));
    return {
      status: "ok",
      sheetUrl: resolvedUrl,
      sheetName: targetSheet ? targetSheet.getName() : "",
      sheetMatched: Boolean(targetSheet)
    };
  } catch (err) {
    return {
      status: "error",
      sheetUrl: stripSheetGid(fallbackUrl || ""),
      sheetName: "",
      sheetMatched: false,
      message: err ? err.toString() : ""
    };
  }
}

function gasGetConfig() {
  var serviceUrl = DEFAULT_GAS_WEB_APP_URL;
  try {
    serviceUrl = ScriptApp.getService().getUrl() || DEFAULT_GAS_WEB_APP_URL;
  } catch (urlErr) {}

  try {
    var cfg = readSettingsFromSheet();
    if (cfg) {
      cfg.gasWebAppUrl = serviceUrl;
      cfg.status = "ok";
      return cfg;
    }
  } catch (err) {}

  var activeUrl = "";
  try {
    activeUrl = getActiveSheetUrl(getTargetSpreadsheet());
  } catch (ssErr) {}

  return {
    status: "ok",
    recordSpreadsheetUrl: activeUrl,
    logoUrl: DEFAULT_BANNER_LOGO_URL,
    approvalFolderUrl: DEFAULT_APPROVAL_FOLDER_URL,
    enableSaveNotification: true,
    gasWebAppUrl: serviceUrl,
    tajuk1: "Unit PRPA HTAR",
    footerText: "Hak Cipta Terpelihara © 2026",
    appVersion: "3.0",
    editionName: "Edisi Terkini Dis 2026",
    versionUpdatedAt: "Disember 2026"
  };
}

function gasCheckDriveFolder(folderUrl) {
  var folderUrlParam = folderUrl || "";
  if (!folderUrlParam) {
    try {
      var savedCfg = readSettingsFromSheet();
      if (savedCfg && savedCfg.approvalFolderUrl) {
        folderUrlParam = savedCfg.approvalFolderUrl;
      }
    } catch (cfgErr) {}
  }
  if (!folderUrlParam) {
    folderUrlParam = DEFAULT_APPROVAL_FOLDER_URL;
  }
  var folderCheck = validateDriveFolder(folderUrlParam);
  folderCheck.supportsDriveWriteTest = true;
  return folderCheck;
}

function gasTestDriveWrite(folderUrl) {
  var testFolderUrl = folderUrl || DEFAULT_APPROVAL_FOLDER_URL;
  var folderCheckRes = validateDriveFolder(testFolderUrl);
  if (!folderCheckRes.valid) {
    return folderCheckRes;
  }
  try {
    var testRoot = DriveApp.getFolderById(folderCheckRes.folderId);
    var testBlob = Utilities.newBlob("Ujian kebenaran muat naik sistem PPP U5", "text/plain", "_ujian_muat_naik_pppu5.txt");
    var testFile = testRoot.createFile(testBlob);
    testFile.setTrashed(true);
    return {
      valid: true,
      status: "ok",
      folderName: testRoot.getName(),
      message: "Berjaya! Folder '" + testRoot.getName() + "' disahkan boleh dibaca dan ditulis untuk muat naik fail responden."
    };
  } catch (writeErr) {
    var writeErrText = writeErr ? writeErr.toString() : "";
    if (writeErrText.indexOf("Required permissions") !== -1 || writeErrText.indexOf("You do not have permission to call DriveApp") !== -1) {
      return {
        valid: false,
        status: "permission_error",
        message: "Ralat Skop OAuth Drive (https://www.googleapis.com/auth/drive): Skrip GAS hanya mempunyai kebenaran baca sahaja. Di Apps Script Editor, pilih fungsi 'authorizeDriveAndSheets' -> klik Run & Allow permissions, kemudian buat New Deployment."
      };
    }
    return {
      valid: false,
      status: "permission_error",
      message: "Amaran: Folder '" + folderCheckRes.folderName + "' boleh dibaca tetapi TIADA kebenaran muat naik/tulis (" + writeErrText + "). Sila tukar kebenaran folder kepada Editor atau guna folder Google Drive milik anda sendiri."
    };
  }
}

function gasSaveConfig(configData) {
  try {
    var configSs = getTargetSpreadsheet();
    var configSheet = configSs.getSheetByName("SETTINGS");
    if (!configSheet) {
      configSheet = configSs.insertSheet("SETTINGS");
    }
    var headerRange = configSheet.getRange(1, 1, 1, 16);
    headerRange.setValues([[
      "startDate", "endDate", "closingDate", "forceStatus",
      "svName", "spreadsheetUrl", "recordSpreadsheetUrl", "logoUrl", "updatedAt",
      "approvalFolderUrl", "enableSaveNotification",
      "tajuk1", "footerText", "appVersion", "editionName", "versionUpdatedAt"
    ]]);
    headerRange
      .setFontWeight("bold")
      .setBackground("#0288d1")
      .setFontColor("#ffffff");
    configSheet.setFrozenRows(1);

    var c = configData || {};
    var baseUrl = getSpreadsheetBaseUrl(configSs, c.recordSpreadsheetUrl || "");
    var savedFolderUrl = c.approvalFolderUrl ? String(c.approvalFolderUrl).trim() : "";
    var activeTempoh = formatTempohFromIso(c.startDate || "", c.endDate || "");
    var firstHdr = formatFirstDateHeaderFromIso(c.startDate || "");
    var periodSheet = findTargetSheetForPeriod(configSs, activeTempoh, firstHdr, c.recordSpreadsheetUrl || "");
    if (!periodSheet && activeTempoh) {
      var autoDateCols = buildDateHeadersFromIsoRange(c.startDate || "", c.endDate || "");
      if (autoDateCols.length > 0) {
        try {
          periodSheet = autoCreateTempohSheet(configSs, activeTempoh, autoDateCols);
        } catch (createErr) {}
      }
    }
    var resolvedRecordUrl = periodSheet
      ? buildSheetUrlWithGid(configSs, periodSheet)
      : (stripSheetGid(c.recordSpreadsheetUrl || "") || baseUrl);

    var nextTajuk1 = String(c.tajuk1 !== undefined && c.tajuk1 !== null ? c.tajuk1 : "").trim() || "Unit PRPA HTAR";
    var nextFooterText = String(c.footerText !== undefined && c.footerText !== null ? c.footerText : "").trim() || "Hak Cipta Terpelihara © 2026";
    var nextAppVersion = normalizeVersionText(c.appVersion);
    var nextEditionName = String(c.editionName !== undefined && c.editionName !== null ? c.editionName : "").trim() || "Edisi Terkini Dis 2026";
    var nextVersionUpdatedAt = String(c.versionUpdatedAt !== undefined && c.versionUpdatedAt !== null ? c.versionUpdatedAt : "").trim() || "Disember 2026";

    // Format lajur tarikh dan tetapan versi sebagai teks (@) supaya '3.0' tidak bertukar menjadi nombor '3'
    configSheet.getRange(2, 1, 1, 3).setNumberFormat("@");
    configSheet.getRange(2, 12, 1, 5).setNumberFormat("@");

    configSheet.getRange(2, 1, 1, 16).setValues([[
      String(c.startDate || "").trim(),
      String(c.endDate || "").trim(),
      String(c.closingDate || "").trim(),
      String(c.forceStatus || "AUTO").trim(),
      String(c.svName || "").trim(),
      stripSheetGid(c.spreadsheetUrl || "") || resolvedRecordUrl,
      resolvedRecordUrl,
      String(c.logoUrl || DEFAULT_BANNER_LOGO_URL).trim(),
      new Date(),
      savedFolderUrl,
      c.enableSaveNotification !== false,
      nextTajuk1,
      nextFooterText,
      nextAppVersion,
      nextEditionName,
      nextVersionUpdatedAt
    ]]);
    return {
      status: "config_saved",
      notifyUser: c.enableSaveNotification !== false,
      recordSpreadsheetUrl: resolvedRecordUrl || baseUrl,
      sheetName: periodSheet ? periodSheet.getName() : "",
      sheetMatched: Boolean(periodSheet),
      approvalFolderUrl: savedFolderUrl || DEFAULT_APPROVAL_FOLDER_URL,
      tajuk1: nextTajuk1,
      footerText: nextFooterText,
      appVersion: nextAppVersion,
      editionName: nextEditionName,
      versionUpdatedAt: nextVersionUpdatedAt,
      message: "Tetapan admin dan versi telah berjaya disimpan ke helaian SETTINGS."
    };
  } catch (err) {
    return {
      status: "error",
      message: err ? err.toString() : "Gagal menyimpan tetapan."
    };
  }
}

function gasSubmitApplication(data) {
  try {
    var payload = data || {};
    var activeUrl = getActiveSheetUrl();
    var targetUrl = payload.recordSpreadsheetUrl || activeUrl;

    var savedSettings = null;
    try {
      savedSettings = readSettingsFromSheet();
    } catch (setErr) {}

    var notifyEnabled = typeof payload.enableSaveNotification === "boolean"
      ? payload.enableSaveNotification
      : (savedSettings ? savedSettings.enableSaveNotification : true);

    // >>> [SEMAK DI SINI] Pautan folder rujukan Surat Kelulusan
    var folderReferenceUrl = payload.approvalFolderUrl || (savedSettings ? savedSettings.approvalFolderUrl : "") || DEFAULT_APPROVAL_FOLDER_URL;

    // 1. Muat naik fail Surat Kelulusan ke Folder Google Drive Rujukan jika ada fail dimuat naik
    var finalSuratValue = payload.suratKelulusan || "";
    if (payload.suratKelulusanFile && payload.suratKelulusanFile.base64) {
      var uploadResult = saveApprovalFileToDrive(
        folderReferenceUrl,
        payload.tempohTugasan || "JADUAL",
        payload.namaPemohon || "PEMOHON",
        payload.suratKelulusanFile
      );
      if (!uploadResult.valid) {
        return {
          status: "folder_error",
          notifyUser: true,
          message: uploadResult.message
        };
      }
      finalSuratValue = uploadResult.fileUrl;
    }

    // 2. Simpan Respons Pemohon ke Sheet mengikut tempoh tugasan berkenaan
    var ss = getTargetSpreadsheet(targetUrl);
    var rawDateCols = payload.sheetDateColumns || payload.dateColumns || [];
    var dateCols = rawDateCols.map(formatDateHeader);
    var orderedShifts = payload.orderedShifts || [];

    var sheet = getOrCreateTargetSheet(ss, targetUrl, payload.tempohTugasan || "JADUAL", dateCols);

    var lastCol = Math.max(sheet.getLastColumn(), 5 + dateCols.length);
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var normalizedHeaders = headers.map(function(h) {
      return String(h).replace(/\\s+/g, " ").trim();
    });

    var rowValues = [];
    for (var cIdx = 0; cIdx < headers.length; cIdx++) {
      rowValues.push("");
    }

    var tsCol = findHeaderIndex(normalizedHeaders, "Timestamp", 0);
    var emailCol = findHeaderIndex(normalizedHeaders, "Email Address", 1);
    var warningCol = findHeaderIndex(normalizedHeaders, "PERINGATAN PENTING", 2);
    var nameCol = findHeaderIndex(normalizedHeaders, "NAMA PEMOHON", 3);
    var suratCol = findHeaderIndex(normalizedHeaders, "Surat Kelulusan", headers.length - 1);

    rowValues[tsCol] = payload.timestamp ? new Date(payload.timestamp) : new Date();
    rowValues[emailCol] = payload.email || "";
    rowValues[warningCol] = "FAHAM & DISAHKAN";
    rowValues[nameCol] = payload.namaPemohon || "";
    if (suratCol >= 0) {
      rowValues[suratCol] = finalSuratValue;
    }

    for (var i = 0; i < dateCols.length; i++) {
      var targetDateHeader = dateCols[i];
      var colIdx = findHeaderIndex(normalizedHeaders, targetDateHeader, -1);
      if (colIdx !== -1) {
        rowValues[colIdx] = orderedShifts[i] || "";
      }
    }

    var nameColNumber = nameCol + 1;
    var lastRow = sheet.getLastRow();
    var existingRowIndex = -1;
    if (lastRow >= 2 && payload.namaPemohon) {
      var names = sheet.getRange(2, nameColNumber, lastRow - 1, 1).getValues();
      for (var r = 0; r < names.length; r++) {
        if (String(names[r][0]).trim().toUpperCase() === String(payload.namaPemohon).trim().toUpperCase()) {
          existingRowIndex = r + 2;
          break;
        }
      }
    }

    if (existingRowIndex !== -1) {
      sheet.getRange(existingRowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

    var updatedLastRow = sheet.getLastRow();
    var updatedLastCol = sheet.getLastColumn();
    if (updatedLastRow >= 3) {
      var dataRange = sheet.getRange(2, 1, updatedLastRow - 1, updatedLastCol);
      dataRange.sort({ column: nameColNumber, ascending: true });
    }

    // Auto-simpan respon pertama (Email, Nama, No Telefon) & kemaskini No Telefon ke helaian 'Senarai Nama PPPU5'
    var staffDirSaved = false;
    if (payload.namaPemohon && (payload.noTelefon || payload.email)) {
      try {
        var staffDirResult = upsertStaffDirectoryPPPU5(
          ss,
          payload.email || "",
          payload.namaPemohon,
          payload.noTelefon || "",
          true
        );
        if (staffDirResult && staffDirResult.status === "error") {
          return {
            status: "error",
            notifyUser: true,
            message: "Rekod jadual disimpan, tetapi gagal auto-simpan ke helaian '" + STAFF_DIRECTORY_SHEET_NAME + "': " + (staffDirResult.message || "Ralat tidak diketahui.")
          };
        }
        staffDirSaved = Boolean(staffDirResult && staffDirResult.saved);
      } catch (dirErr) {
        return {
          status: "error",
          notifyUser: true,
          message: "Rekod jadual disimpan, tetapi berlaku ralat semasa auto-simpan ke helaian '" + STAFF_DIRECTORY_SHEET_NAME + "': " + (dirErr ? dirErr.toString() : "Ralat tidak diketahui.")
        };
      }
    }

    if (payload.sendEmailCopy && payload.email) {
      var summaryLines = [];
      for (var j = 0; j < dateCols.length; j++) {
        if (orderedShifts[j]) {
          summaryLines.push("- " + dateCols[j] + ": " + orderedShifts[j]);
        }
      }
      var emailBody =
        "Salinan Permohonan Jadual Tugas PPP U5 (" + payload.tempohTugasan + ")\\n\\n" +
        "Nama Pemohon: " + payload.namaPemohon + "\\n" +
        "No. Telefon: " + (payload.noTelefon || "-") + "\\n" +
        "Surat Kelulusan: " + (finalSuratValue || "-") + "\\n\\n" +
        "Pilihan Syif / Status:\\n" +
        (summaryLines.length > 0 ? summaryLines.join("\\n") : "Tiada syif khusus dipilih.");
      try {
        MailApp.sendEmail(
          payload.email,
          "Salinan Permohonan Jadual Tugas PPP U5 (" + payload.tempohTugasan + ")",
          emailBody
        );
      } catch (mailErr) {}
    }

    var targetSheetUrl = buildSheetUrlWithGid(ss, sheet);

    return {
      status: "success",
      notifyUser: notifyEnabled,
      staffDirectorySaved: staffDirSaved,
      fileUrl: finalSuratValue,
      sheetUrl: targetSheetUrl,
      sheetName: sheet.getName(),
      message: "Data berjaya disimpan ke helaian '" + sheet.getName() + "'."
    };
  } catch (err) {
    return {
      status: "error",
      notifyUser: true,
      message: err ? err.toString() : "Ralat tidak diketahui."
    };
  }
}

function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : "";

  if (action === "checkDriveFolder") {
    return ContentService.createTextOutput(JSON.stringify(gasCheckDriveFolder(e.parameter.folderUrl || "")))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "getTargetSheetUrl") {
    return ContentService.createTextOutput(
      JSON.stringify(
        gasGetTargetSheetUrl(
          e.parameter.tempoh || "",
          e.parameter.firstDate || "",
          e.parameter.fallbackUrl || ""
        )
      )
    ).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "getStaffDirectory") {
    return ContentService.createTextOutput(JSON.stringify(gasGetStaffDirectory(e.parameter.fallbackUrl || "")))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "lookupStaffPhone") {
    return ContentService.createTextOutput(
      JSON.stringify(
        gasLookupStaffPhone(
          e.parameter.nama || "",
          e.parameter.fallbackUrl || "",
          e.parameter.email || ""
        )
      )
    ).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "getConfig") {
    return ContentService.createTextOutput(JSON.stringify(gasGetConfig()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "getGoogleUserSession") {
    return ContentService.createTextOutput(JSON.stringify(getGoogleUserSession()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Utamakan fail HTML "Index.html" terus di dalam Google Apps Script jika wujud
  try {
    return HtmlService.createHtmlOutputFromFile("Index")
      .setTitle("Permohonan Jadual Tugas PPP U5")
      .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (htmlErr) {
    // Fallback iframe ke pautan web luar jika fail Index.html belum ditambah dalam projek GAS
    var gasEndpoint = DEFAULT_GAS_WEB_APP_URL;
    try {
      gasEndpoint = ScriptApp.getService().getUrl() || DEFAULT_GAS_WEB_APP_URL;
    } catch (err) {}

    var targetWebUrl = PROJECT_WEB_APP_URL;
    if (gasEndpoint) {
      var separator = targetWebUrl.indexOf("?") === -1 ? "?" : "&";
      targetWebUrl += separator + "gasUrl=" + encodeURIComponent(gasEndpoint);
    }

    var html = [
      "<!DOCTYPE html>",
      "<" + "html lang='ms'>",
      "<" + "head>",
      "  <meta charset='UTF-8' />",
      "  <meta name='viewport' content='width=device-width, initial-scale=1.0' />",
      "  <" + "title>Permohonan Jadual Tugas PPP U5<" + "/title>",
      "  <" + "style>",
      "    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }",
      "    iframe { border: 0; width: 100%; height: 100%; display: block; }",
      "  <" + "/style>",
      "<" + "/head>",
      "<" + "body>",
      "  <" + "iframe src='" + targetWebUrl + "' allow='clipboard-write; clipboard-read' allowfullscreen><" + "/iframe>",
      "<" + "/body>",
      "<" + "/html>"
    ].join("\\n");

    return HtmlService.createHtmlOutput(html)
      .setTitle("Permohonan Jadual Tugas PPP U5")
      .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

function getGoogleUserSession() {
  var email = "";
  var effectiveEmail = "";
  var name = "";
  try {
    var activeUser = Session.getActiveUser();
    if (activeUser && activeUser.getEmail()) {
      email = String(activeUser.getEmail()).trim();
    }
  } catch (err) {
    email = "";
  }
  try {
    var effUser = Session.getEffectiveUser();
    if (effUser && effUser.getEmail()) {
      effectiveEmail = String(effUser.getEmail()).trim();
    }
  } catch (err2) {
    effectiveEmail = "";
  }
  // Elakkan kebocoran emel Admin apabila Web App dijalankan sebagai "Execute as: Me"
  if (!email || (effectiveEmail && email.toLowerCase() === effectiveEmail.toLowerCase())) {
    return {
      status: "ok",
      detected: false,
      email: "",
      name: ""
    };
  }
  if (email.indexOf("@") !== -1) {
    var localPart = email.split("@")[0];
    name = localPart.charAt(0).toUpperCase() + localPart.slice(1);
  }
  return {
    status: "ok",
    detected: Boolean(email),
    email: email,
    name: name
  };
}

function doPost(e) {
  try {
    var rawContents = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var data = JSON.parse(rawContents);

    if (data.action === "saveConfig" && data.config) {
      return ContentService.createTextOutput(JSON.stringify(gasSaveConfig(data.config)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "testDriveWrite") {
      return ContentService.createTextOutput(JSON.stringify(gasTestDriveWrite(data.folderUrl)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "saveStaffPhone") {
      return ContentService.createTextOutput(JSON.stringify(gasSaveStaffPhone(data)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify(gasSubmitApplication(data)))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      notifyUser: true,
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function findHeaderIndex(normalizedHeaders, targetName, fallbackIndex) {
  var targetUpper = String(targetName).replace(/\\s+/g, " ").trim().toUpperCase();
  for (var i = 0; i < normalizedHeaders.length; i++) {
    if (normalizedHeaders[i].toUpperCase() === targetUpper) {
      return i;
    }
  }
  return fallbackIndex;
}

function getOrCreateTargetSheet(ss, targetUrl, tempohTugasan, dateCols) {
  var expectedSheetName = tempohTugasan ? ("TUGAS PPPU5 " + tempohTugasan) : "";
  if (expectedSheetName) {
    var namedSheet = ss.getSheetByName(expectedSheetName);
    if (namedSheet) {
      return namedSheet;
    }
  }

  var firstDateHeader = dateCols && dateCols.length > 0 ? dateCols[0] : "";
  var matchedSheet = findTargetSheetForPeriod(ss, tempohTugasan || "", firstDateHeader, targetUrl || "");
  if (matchedSheet) {
    return matchedSheet;
  }

  return autoCreateTempohSheet(ss, tempohTugasan, dateCols);
}

function autoCreateTempohSheet(ss, tempohTugasan, dateCols) {
  var sheetName = "TUGAS PPPU5 " + tempohTugasan;
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = [
      "Timestamp",
      "Email Address",
      "PERINGATAN PENTING ",
      "NAMA PEMOHON "
    ].concat(dateCols).concat(["Surat Kelulusan"]);

    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange
      .setFontWeight("bold")
      .setBackground("#0288d1")
      .setFontColor("#ffffff")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Jalankan fungsi ini SEKALI SAHAJA di Google Apps Script Editor
 * (Pilih 'authorizeDriveAndSheets' di menu atas -> klik Run -> Review permissions -> Allow)
 * untuk meluluskan kebenaran PENUH Google Drive (baca & tulis), Google Sheets, dan Emel.
 */
function authorizeDriveAndSheets() {
  var ss = getTargetSpreadsheet();
  var rootFolder = DriveApp.getRootFolder();
  var tempFile = rootFolder.createFile("_ujian_skop_drive_pppu5.txt", "Ujian kebenaran tulis Google Drive", MimeType.PLAIN_TEXT);
  tempFile.setTrashed(true);
  var folderCheck = DEFAULT_APPROVAL_FOLDER_URL ? validateDriveFolder(DEFAULT_APPROVAL_FOLDER_URL) : null;
  Logger.log("Spreadsheet aktif: " + (ss ? ss.getName() : "Tiada"));
  Logger.log("Drive Tulis & Baca berjaya diluluskan pada: " + rootFolder.getName());
  if (folderCheck) {
    Logger.log("Status Folder Rujukan: " + JSON.stringify(folderCheck));
  }
  return "Kebenaran Penuh Google Drive (Baca & Tulis) serta Sheets berjaya diluluskan!";
}

/**
 * Pilihan Tambahan (Untuk Akaun Google Baharu):
 * Jalankan fungsi ini di Apps Script Editor jika mahu skrip cipta folder baharu secara automatik
 * dalam Google Drive akaun anda dan simpan linknya ke tab SETTINGS.
 */
function setupFolderBaruDiDrive() {
  var folderName = "Surat Kelulusan PPP U5";
  var existing = DriveApp.getFoldersByName(folderName);
  var folder = existing.hasNext() ? existing.next() : DriveApp.createFolder(folderName);
  var folderUrl = folder.getUrl();
  var ss = getTargetSpreadsheet();
  var activeUrl = getActiveSheetUrl(ss);
  var configSheet = ss.getSheetByName("SETTINGS");
  if (configSheet && configSheet.getLastRow() >= 2) {
    configSheet.getRange(2, 6).setValue(activeUrl);
    configSheet.getRange(2, 7).setValue(activeUrl);
    configSheet.getRange(2, 10).setValue(folderUrl);
  }
  Logger.log("Folder Drive Berjaya Disediakan: " + folderUrl);
  Logger.log("Sila salin URL di atas ke DEFAULT_APPROVAL_FOLDER_URL dalam Code.gs.");
  return folderUrl;
}

/**
 * Fungsi Tambahan: Auto-cipta helaian 'Senarai Nama PPPU5' dengan header Email, Nama, No Telefon.
 * Helaian ini juga dicipta automatik apabila borang dibuka atau respon pertama dihantar.
 */
function setupSenaraiNamaPPPU5() {
  var ss = getTargetSpreadsheet();
  var sheet = getOrCreateStaffDirectorySheet(ss);
  Logger.log("Helaian '" + sheet.getName() + "' sedia digunakan: " + buildSheetUrlWithGid(ss, sheet));
  return buildSheetUrlWithGid(ss, sheet);
}
`;

export function buildGasCode(approvalFolderUrl?: string): string {
  const cleanFolder = (approvalFolderUrl || '').trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  if (!cleanFolder) return UPDATED_GAS_CODE;
  return UPDATED_GAS_CODE.replace(
    /var DEFAULT_APPROVAL_FOLDER_URL = ".*?";/,
    `var DEFAULT_APPROVAL_FOLDER_URL = "${cleanFolder}";`
  );
}
