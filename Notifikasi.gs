/**
 * NOTIFIKASI OTOMATIS PPFHA
 * Tahap 1: Mendeteksi ketidakhadiran dan membuat antrean.
 * Belum mengirim Firebase sampai jalur pengiriman teruji.
 *
 * Cara pakai: salin seluruh isi file ini ke Notifikasi.gs
 * dalam proyek Apps Script "Program Pesantren PPFHA".
 * Membutuhkan konstanta SPREADSHEET_ID dari Code.gs. Token dibaca lintas spreadsheet.
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
      const statusAbsensi = String(r[idx('status')] || '').trim().toLowerCase();
      // Ketidakhadiran berizin juga harus masuk antrean notifikasi wali.
      if (!['tidak hadir', 'izin pulang', 'izin sakit', 'izin keluar'].includes(statusAbsensi)) return;

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
        'Status absensi: ' + String(r[idx('status')] || '').trim() + ' — belum dikirim ke Firebase'
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

/**
 * TAHAP 2 — PENGIRIMAN FCM SATU NOTIFIKASI (UJI TERBATAS)
 *
 * Prasyarat:
 * 1. Sheet PerangkatNotifikasiWali berada di database akses wali yang sudah aktif.
 * 2. Script Properties berisi FIREBASE_PROJECT_ID (Project ID Firebase).
 * 3. Manifest Apps Script memberi scope:
 *    https://www.googleapis.com/auth/firebase.messaging
 *    https://www.googleapis.com/auth/script.external_request
 *
 * Fungsi ini hanya mengirim SATU antrean untuk NIS/tanggal/kegiatan
 * yang ditentukan. Tidak ada pengiriman massal/trigger otomatis.
 */

function cariTokenWaliUntukNis_(nis) {
  const ss = SpreadsheetApp.openById('1A0wPmKJr51FBIoKIaevPZKV9cJJhFHjlNpElrJIpzVk');
  const sh = ss.getSheetByName('PerangkatNotifikasiWali');
  if (!sh) throw new Error('Sheet PerangkatNotifikasiWali tidak ditemukan');

  const values = sh.getDataRange().getDisplayValues();
  if (values.length < 2) return [];

  const headers = values.shift().map(function(x) { return String(x).trim(); });
  const iToken = headers.indexOf('token');
  const iNis = headers.indexOf('nisList');
  const iStatus = headers.indexOf('status');

  if (iToken < 0 || iNis < 0 || iStatus < 0) {
    throw new Error('Header PerangkatNotifikasiWali harus memuat token, nisList, status');
  }

  return values.filter(function(row) {
    const daftarNis = String(row[iNis] || '').match(/\d{6,}/g) || [];
    return String(row[iStatus]).trim().toLowerCase() === 'aktif'
      && daftarNis.indexOf(String(nis).trim()) >= 0
      && String(row[iToken] || '').trim() !== '';
  }).map(function(row) { return String(row[iToken]).trim(); });
}

function kirimFCMWali_(token, title, body, dataTambahan) {
  const projectId = PropertiesService.getScriptProperties().getProperty('FIREBASE_PROJECT_ID');
  if (!projectId) throw new Error('Script Property FIREBASE_PROJECT_ID belum diisi');

  const url = 'https://fcm.googleapis.com/v1/projects/' +
    encodeURIComponent(projectId) + '/messages:send';

  const payload = {
    message: {
      token: token,
      notification: { title: title, body: body },
      data: dataTambahan || {},
      android: { priority: 'HIGH' }
    }
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const textBody = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('FCM HTTP ' + code + ': ' + textBody);
  }
  return JSON.parse(textBody);
}

/**
 * Uji kirim hanya untuk Aditya Firmansyah (NIS 20260004),
 * Sholat Ashar tanggal 2026-11-02.
 * Menandai baris TERKIRIM hanya setelah Firebase merespons sukses.
 */
function kirimSatuNotifAsharAditya() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sh = getNotifAbsenSheet_();
    const all = sh.getDataRange().getDisplayValues();
    if (all.length < 2) throw new Error('Antrean notifikasi masih kosong');

    const key = '2026-11-02|jamaah|Ashar|20260004';
    let rowNumber = -1;
    let row = null;

    for (let i = 1; i < all.length; i++) {
      if (String(all[i][0]).trim() === key) {
        rowNumber = i + 1;
        row = all[i];
        break;
      }
    }

    if (!row) throw new Error('Antrean khusus Aditya/Ashar tidak ditemukan. Jalankan siapkanAntrianTidakHadir terlebih dahulu.');
    if (String(row[6]).trim() === 'TERKIRIM') {
      return { berhasil: true, sudahTerkirim: true, firebaseDikirim: false, kunci: key };
    }
    if (String(row[6]).trim() !== 'PENDING') {
      throw new Error('Status antrean bukan PENDING: ' + row[6]);
    }

    const tokens = cariTokenWaliUntukNis_('20260004');
    if (!tokens.length) throw new Error('Token perangkat aktif untuk NIS 20260004 tidak ditemukan');

    const nama = row[5] || 'Santri';
    const kegiatan = row[2] + (row[3] ? ' - ' + row[3] : '');
    const body = nama + ' tercatat Tidak Hadir pada ' + kegiatan + ' tanggal ' + row[1] + '.';

    // Kirim hanya ke satu token perangkat aktif pertama untuk NIS ini.
    const hasilFCM = kirimFCMWali_(
      tokens[0],
      'Informasi Ketidakhadiran Santri',
      body,
      { tipe: 'ketidakhadiran', nis: '20260004', tanggal: String(row[1]), kegiatan: kegiatan }
    );

    sh.getRange(rowNumber, 7).setValue('TERKIRIM');
    sh.getRange(rowNumber, 9).setValue(new Date());
    sh.getRange(rowNumber, 10).setValue('FCM sukses: ' + (hasilFCM.name || 'message accepted'));

    const hasil = {
      berhasil: true,
      santri: nama,
      nis: '20260004',
      kegiatan: kegiatan,
      tokenDipakai: 1,
      firebaseDikirim: true,
      fcmMessage: hasilFCM.name || ''
    };
    Logger.log(JSON.stringify(hasil, null, 2));
    return hasil;

  } finally {
    lock.releaseLock();
  }
}

/** Cek aman: antrean dan token Maghrib Aditya tanpa mengirim. */
function cekNotifMaghribAditya() {
  const sh = getNotifAbsenSheet_();
  const data = sh.getDataRange().getDisplayValues();
  const kunci = '2026-11-02|jamaah|Maghrib|20260004';
  const cocok = data.slice(1).filter(function(r) { return String(r[0]).trim() === kunci; });
  const hasil = { kunci: kunci, antreanDitemukan: cocok.length, status: cocok.length ? cocok[0][6] : 'BELUM_ADA', jumlahTokenAktif: cariTokenWaliUntukNis_('20260004').length, firebaseDikirim: false };
  Logger.log(JSON.stringify(hasil));
  return hasil;
}

/**
 * Uji kirim khusus Aditya, Maghrib 2 November 2026.
 * Hanya mengirim jika antrean PENDING benar-benar ada.
 * Tidak membuat data ketidakhadiran palsu.
 * Jika gagal/timeout, status PERIKSA_MANUAL untuk mencegah kirim ganda.
 */
function kirimNotifMaghribAditya() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = getNotifAbsenSheet_();
    const rows = sh.getDataRange().getDisplayValues();
    const key = '2026-11-02|jamaah|Maghrib|20260004';
    const idx = rows.findIndex(function(r, i) { return i > 0 && String(r[0]).trim() === key; });
    if (idx < 0) {
      const result = { berhasil: false, status: 'BELUM_ADA', firebaseDikirim: false, pesan: 'Belum tercatat Tidak Hadir Maghrib untuk Aditya. Tunggu penutupan absensi.' };
      Logger.log(JSON.stringify(result)); return result;
    }
    const row = rows[idx];
    const status = String(row[6]).trim();
    if (status !== 'PENDING') {
      const result = { berhasil: false, status: status, firebaseDikirim: false, pesan: 'Tidak dikirim ulang untuk menghindari duplikat.' };
      Logger.log(JSON.stringify(result)); return result;
    }
    const tokens = cariTokenWaliUntukNis_('20260004');
    if (tokens.length !== 1) throw new Error('Uji dibatasi satu token aktif Aditya; ditemukan: ' + tokens.length);
    const projectId = PropertiesService.getScriptProperties().getProperty('FIREBASE_PROJECT_ID');
    if (!projectId) throw new Error('Script Property FIREBASE_PROJECT_ID belum diatur.');
    sh.getRange(idx + 1, 7).setValue('SEDANG_DIKIRIM');
    sh.getRange(idx + 1, 10).setValue('Uji Firebase Maghrib dimulai');
    SpreadsheetApp.flush();
    try {
      const resultFCM = kirimFCMWali_(
        tokens[0],
        'Informasi Ketidakhadiran Santri',
        String(row[5] || 'Aditya Firmansyah') + ' tercatat Tidak Hadir pada Sholat Maghrib tanggal 2 November 2026.',
        { tipe: 'ketidakhadiran', nis: '20260004', tanggal: '2026-11-02', kegiatan: 'jamaah', sesi: 'Maghrib' }
      );
      sh.getRange(idx + 1, 7).setValue('TERKIRIM');
      sh.getRange(idx + 1, 9).setValue(new Date());
      sh.getRange(idx + 1, 10).setValue('FCM menerima pesan: ' + String(resultFCM.name || '').slice(0, 100));
      const result = { berhasil: true, firebaseDikirim: true, status: 'TERKIRIM', nis: '20260004' };
      Logger.log(JSON.stringify(result)); return result;
    } catch (err) {
      sh.getRange(idx + 1, 7).setValue('PERIKSA_MANUAL');
      sh.getRange(idx + 1, 10).setValue(String(err.message).slice(0, 450));
      throw err;
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * PENGUMUMAN — tahap aman: antrean dibuat hanya untuk pengumuman terbit.
 * Menggunakan tab Pengumuman yang sudah ada, token dari database akses aktif.
 * Tidak mengirim push massal pada tahap pemeriksaan.
 */
function cekNotifPengumuman() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName('Pengumuman');
  if (!sh) throw new Error('Tab Pengumuman belum ditemukan');
  const values = sh.getDataRange().getDisplayValues();
  if (values.length < 2) {
    const kosong = { berhasil: true, pengumumanTerbit: 0, firebaseDikirim: false };
    Logger.log(JSON.stringify(kosong)); return kosong;
  }
  const h = values.shift().map(function(x) { return String(x).trim().toLowerCase(); });
  const col = function(n) { return h.indexOf(n.toLowerCase()); };
  ['id','judul','isi','status','target','nistarget'].forEach(function(n) {
    if (col(n) < 0) throw new Error('Kolom Pengumuman tidak ditemukan: ' + n);
  });
  const allTargets = ['semua','semua wali','semua wali santri','semua santri','umum','seluruh wali','seluruh wali santri','seluruh santri'];
  const terbit = values.filter(function(r) {
    const status = String(r[col('status')] || '').trim().toLowerCase();
    return ['terbit','publish','published','aktif'].indexOf(status) >= 0 &&
      String(r[col('judul')] || '').trim() && String(r[col('isi')] || '').trim();
  });
  const umum = terbit.filter(function(r) {
    return allTargets.indexOf(String(r[col('target')] || '').trim().toLowerCase()) >= 0;
  });
  const khusus = terbit.filter(function(r) {
    const target = String(r[col('target')] || '').trim().toLowerCase();
    return ['santri tertentu','tertentu','khusus'].indexOf(target) >= 0 &&
      String(r[col('nistarget')] || '').trim();
  });
  const result = {
    berhasil: true,
    pengumumanTerbit: terbit.length,
    untukSemuaWali: umum.length,
    untukSantriTertentu: khusus.length,
    tidakDikenaliTarget: terbit.length - umum.length - khusus.length,
    tokenAdityaAktif: cariTokenWaliUntukNis_('20260004').length,
    firebaseDikirim: false
  };
  Logger.log(JSON.stringify(result)); return result;
}
