/**
 * NOTIFIKASI OTOMATIS PPFHA
 * Tahap 1: Mendeteksi ketidakhadiran dan membuat antrean.
 * Belum mengirim Firebase sampai jalur pengiriman teruji.
 *
 * Cara pakai: salin seluruh isi file ini ke Notifikasi.gs
 * dalam proyek Apps Script "Program Pesantren PPFHA".
 * Membutuhkan konstanta SPREADSHEET_ID dari Code.gs.
 * JANGAN jalankan semua antrean sebagai pengiriman massal.
 */

const NOTIF_ABSEN_SHEET = 'AntrianNotifTidakHadir';

function getNotifAbsenSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(NOTIF_ABSEN_SHEET);

  if (!sh) {
    sh = ss.insertSheet(NOTIF_ABSEN_SHEET);
    sh.appendRow([
      'kunci', 'tanggal', 'kegiatan', 'sesi',
      'nis', 'nama', 'statusKirim',
      'dibuatPada', 'terkirimPada', 'catatan'
    ]);
    sh.setFrozenRows(1);
  }

  return sh;
}

// Pemeriksaan awal: hanya membaca, tanpa mengubah data.
function tesNotifikasiTidakHadir() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName('Absensi');

  if (!sh) throw new Error('Sheet Absensi tidak ditemukan');

  const data = sh.getDataRange().getDisplayValues();
  const headers = data.shift().map(String);

  const idx = function(n) { return headers.indexOf(n); };
  const required = ['tanggal','activity','session','nis','status'];

  required.forEach(function(h) {
    if (idx(h) < 0) throw new Error('Kolom tidak ada: ' + h);
  });

  const unique = new Set();
  let tidakHadir = 0;

  data.forEach(function(r) {
    if (String(r[idx('status')]).trim().toLowerCase() !== 'tidak hadir') return;

    tidakHadir++;
    unique.add([
      r[idx('tanggal')],
      r[idx('activity')],
      r[idx('session')],
      r[idx('nis')]
    ].join('|'));
  });

  const hasil = {
    berhasil: true,
    catatanTidakHadir: tidakHadir,
    kejadianUnik: unique.size,
    duplikat: tidakHadir - unique.size,
    firebaseDikirim: false
  };

  Logger.log(JSON.stringify(hasil, null, 2));
  return hasil;
}

// Masukkan ketidakhadiran ke antrean.
// Aman dijalankan berulang karena memakai kunci unik.
function siapkanAntrianTidakHadir() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sumber = ss.getSheetByName('Absensi');
    if (!sumber) throw new Error('Sheet Absensi tidak ditemukan');

    const tujuan = getNotifAbsenSheet_();
    const data = sumber.getDataRange().getDisplayValues();
    const headers = data.shift().map(String);
    const idx = function(n) { return headers.indexOf(n); };

    ['tanggal','activity','session','nis','nama','status'].forEach(function(h) {
      if (idx(h) < 0) throw new Error('Kolom tidak ada: ' + h);
    });

    const last = tujuan.getLastRow();
    const existing = new Set(
      last > 1
        ? tujuan.getRange(2, 1, last - 1, 1)
            .getDisplayValues().map(function(r) { return r[0]; })
        : []
    );

    const baru = [];

    data.forEach(function(r) {
      if (String(r[idx('status')]).trim().toLowerCase() !== 'tidak hadir') return;

      const tanggal = r[idx('tanggal')];
      const kegiatan = r[idx('activity')];
      const sesi = r[idx('session')];
      const nis = r[idx('nis')];
      const nama = r[idx('nama')];

      if (!tanggal || !kegiatan || !nis) return;

      const kunci = [tanggal, kegiatan, sesi, nis].join('|');
      if (existing.has(kunci)) return;

      existing.add(kunci);

      baru.push([
        kunci, tanggal, kegiatan, sesi, nis, nama,
        'PENDING', new Date(), '',
        'Belum dikirim ke Firebase'
      ]);
    });

    if (baru.length) {
      tujuan.getRange(
        tujuan.getLastRow() + 1, 1,
        baru.length, 10
      ).setValues(baru);
    }

    const hasil = {
      berhasil: true,
      antreanBaru: baru.length,
      firebaseDikirim: false
    };

    Logger.log(JSON.stringify(hasil));
    return hasil;

  } finally {
    lock.releaseLock();
  }
}

// Uji baca khusus Aditya, Ashar 2 November 2026.
// Tidak mengirim Firebase dan tidak mengubah antrean.
function tesNotifAsharAditya() {
  const sh = getNotifAbsenSheet_();
  const data = sh.getDataRange().getDisplayValues();
  data.shift();

  const cocok = data.filter(function(r) {
    return String(r[4]).trim() === '20260004'
      && String(r[2]).trim().toLowerCase() === 'jamaah'
      && String(r[3]).trim().toLowerCase() === 'ashar'
      && String(r[6]).trim() === 'PENDING'
      && String(r[0]).startsWith('2026-11-02|');
  });

  const hasil = {
    berhasil: true,
    santri: 'Aditya Firmansyah',
    nis: '20260004',
    kegiatan: 'Sholat Ashar',
    tanggal: '2026-11-02',
    antreanDitemukan: cocok.length,
    kunci: cocok.map(function(r) { return r[0]; }),
    firebaseDikirim: false
  };

  Logger.log(JSON.stringify(hasil, null, 2));
  return hasil;
}
