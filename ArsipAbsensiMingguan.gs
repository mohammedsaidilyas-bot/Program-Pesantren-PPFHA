/**
 * Arsip Absensi PUTRA mingguan.
 * File tambahan; memakai SPREADSHEET_ID dan ATTENDANCE_TZ dari Code.gs/
 * KegiatanKehadiran.gs. Tidak mengubah fungsi scan atau notifikasi.
 *
 * Arsip disimpan pada tab ArsipAbsensi di spreadsheet yang sama.
 * Data aktif baru dihapus setelah seluruh baris terverifikasi di arsip.
 */
const WEEKLY_ATTENDANCE_ARCHIVE_SHEET = 'ArsipAbsensi';
const WEEKLY_ATTENDANCE_ARCHIVE_HEADERS = [
  'tanggal','activity','session','nis','nama','status',
  'waktuScan','dicatatPada','sumber','waktuArsip'
];

function setupWeeklyAttendanceArchive() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let archive = ss.getSheetByName(WEEKLY_ATTENDANCE_ARCHIVE_SHEET);
  if (!archive) archive = ss.insertSheet(WEEKLY_ATTENDANCE_ARCHIVE_SHEET);
  if (archive.getLastRow() === 0) {
    archive.getRange(1, 1, 1, WEEKLY_ATTENDANCE_ARCHIVE_HEADERS.length)
      .setValues([WEEKLY_ATTENDANCE_ARCHIVE_HEADERS]);
    archive.setFrozenRows(1);
  } else {
    const headers = archive.getRange(1, 1, 1, archive.getLastColumn()).getDisplayValues()[0];
    if (headers[0] !== 'tanggal' || headers[1] !== 'activity' || headers[2] !== 'session' || headers[3] !== 'nis') {
      throw new Error('Header tab ArsipAbsensi tidak sesuai. Tidak ada data yang diubah.');
    }
  }

  // Hindari pemicu ganda jika fungsi setup dijalankan ulang.
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'runWeeklyAttendanceArchive') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('runWeeklyAttendanceArchive')
    .timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(2).create();

  return 'Siap. ArsipAbsensi dibuat/diperiksa dan arsip otomatis dijadwalkan setiap Senin pukul 02.00 WIB.';
}

function weeklyArchiveCell_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
  return String(value == null ? '' : value);
}

function weeklyArchiveSignature_(row) {
  return JSON.stringify(row.map(weeklyArchiveCell_));
}

/**
 * Arsipkan semua absensi yang tanggalnya lebih lama dari 7 hari.
 * Aman untuk dijalankan ulang: baris yang sudah ada di arsip tidak digandakan.
 */
function runWeeklyAttendanceArchive() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const active = ss.getSheetByName('Absensi');
    if (!active || active.getLastRow() < 2) {
      return {ok:true, archived:0, removed:0, message:'Belum ada data absensi untuk diarsipkan.'};
    }

    let archive = ss.getSheetByName(WEEKLY_ATTENDANCE_ARCHIVE_SHEET);
    if (!archive) throw new Error('Tab ArsipAbsensi belum dibuat. Jalankan setupWeeklyAttendanceArchive terlebih dahulu.');

    const tz = (typeof ATTENDANCE_TZ !== 'undefined' && ATTENDANCE_TZ) ? ATTENDANCE_TZ : 'Asia/Jakarta';
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffText = Utilities.formatDate(cutoff, tz, 'yyyy-MM-dd');

    const activeLastCol = active.getLastColumn();
    const activeRows = active.getRange(1, 1, active.getLastRow(), activeLastCol).getValues();
    const activeHeaders = activeRows[0].map(function(v){return String(v).trim();});
    const required = ['tanggal','activity','session','nis','nama','status','waktuScan','dicatatPada','sumber'];
    const col = {};
    required.forEach(function(name) {
      col[name] = activeHeaders.indexOf(name);
      if (col[name] < 0) throw new Error('Kolom absensi tidak ditemukan: ' + name + '. Tidak ada data yang dihapus.');
    });

    const candidates = [];
    const candidateSheetRows = [];
    for (let i = 1; i < activeRows.length; i++) {
      const rawDate = activeRows[i][col.tanggal];
      const dateText = rawDate instanceof Date
        ? Utilities.formatDate(rawDate, tz, 'yyyy-MM-dd')
        : String(rawDate || '').trim().slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateText) && dateText < cutoffText) {
        candidates.push(required.map(function(name){return activeRows[i][col[name]];}));
        candidateSheetRows.push(i + 1);
      }
    }
    if (!candidates.length) {
      return {ok:true, archived:0, removed:0, cutoff:cutoffText, message:'Belum ada absensi yang lebih lama dari batas 7 hari.'};
    }

    const archiveLastRow = archive.getLastRow();
    const archiveData = archiveLastRow > 1
      ? archive.getRange(2, 1, archiveLastRow - 1, WEEKLY_ATTENDANCE_ARCHIVE_HEADERS.length).getValues()
      : [];
    const existingCounts = {};
    archiveData.forEach(function(row) {
      const sig = weeklyArchiveSignature_(row.slice(0, 9));
      existingCounts[sig] = (existingCounts[sig] || 0) + 1;
    });

    const neededCounts = {};
    const toAppend = [];
    candidates.forEach(function(row) {
      const sig = weeklyArchiveSignature_(row);
      neededCounts[sig] = (neededCounts[sig] || 0) + 1;
      if (neededCounts[sig] > (existingCounts[sig] || 0)) {
        toAppend.push(row.concat([new Date()]));
      }
    });

    if (toAppend.length) {
      const start = archive.getLastRow() + 1;
      archive.getRange(start, 1, toAppend.length, WEEKLY_ATTENDANCE_ARCHIVE_HEADERS.length).setValues(toAppend);
      SpreadsheetApp.flush();
    }

    // Verifikasi arsip berisi setidaknya jumlah setiap baris yang akan dipindahkan.
    const verifyLastRow = archive.getLastRow();
    const verifyData = verifyLastRow > 1
      ? archive.getRange(2, 1, verifyLastRow - 1, WEEKLY_ATTENDANCE_ARCHIVE_HEADERS.length).getValues()
      : [];
    const verifiedCounts = {};
    verifyData.forEach(function(row) {
      const sig = weeklyArchiveSignature_(row.slice(0, 9));
      verifiedCounts[sig] = (verifiedCounts[sig] || 0) + 1;
    });
    const verified = Object.keys(neededCounts).every(function(sig) {
      return (verifiedCounts[sig] || 0) >= neededCounts[sig];
    });
    if (!verified) {
      throw new Error('Verifikasi arsip gagal. Data aktif tetap dipertahankan; silakan jalankan ulang setelah memeriksa tab ArsipAbsensi.');
    }

    // Hapus baris dari bawah ke atas agar nomor baris tidak bergeser.
    candidateSheetRows.sort(function(a,b){return b-a;}).forEach(function(rowNumber) {
      active.deleteRow(rowNumber);
    });
    SpreadsheetApp.flush();

    return {
      ok:true,
      cutoff:cutoffText,
      found:candidates.length,
      newlyArchived:toAppend.length,
      removed:candidateSheetRows.length,
      archiveSheet:WEEKLY_ATTENDANCE_ARCHIVE_SHEET,
      message:'Arsip terverifikasi. Data lama dipindahkan dari tab aktif.'
    };
  } finally {
    lock.releaseLock();
  }
}
