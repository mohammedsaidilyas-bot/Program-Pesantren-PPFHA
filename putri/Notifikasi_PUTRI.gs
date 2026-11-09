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

    firebaseDikirim: false
  };
  Logger.log(JSON.stringify(result)); return result;
}


/**
 * TAHAP 2A — Kirim SATU notifikasi absensi berizin untuk pengujian.
 * Jalankan manual dengan kunci antrean yang dipilih. Tidak menyentuh
 * notifikasi Hadir/Terlambat dan tidak mengirim massal.
 *
 * Contoh:
 * kirimSatuNotifIzinAbsensiWali('2026-11-09|jamaah|Subuh|20260001')
 */
function kirimSatuNotifIzinAbsensiWali(kunciAntrean) {
  const key = String(kunciAntrean || '').trim();
  if (!key) throw new Error('Isi kunci antrean yang akan diuji.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = getNotifAbsenSheet_();
    const values = sh.getDataRange().getDisplayValues();
    if (values.length < 2) throw new Error('Antrean notifikasi masih kosong.');

    let rowNumber = -1, row = null;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0] || '').trim() === key) {
        rowNumber = i + 1;
        row = values[i];
        break;
      }
    }
    if (!row) throw new Error('Kunci antrean tidak ditemukan: ' + key);
    const statusKirim = String(row[6] || '').trim().toUpperCase();
    if (statusKirim === 'TERKIRIM') {
      return {berhasil:true, sudahTerkirim:true, firebaseDikirim:false, kunci:key};
    }
    if (statusKirim !== 'PENDING') {
      throw new Error('Antrean tidak berstatus PENDING: ' + statusKirim);
    }

    const statusAbsensi = String(row[9] || '').replace(/^Status absensi:\\s*/i, '').split(' — ')[0].trim().toLowerCase();
    const pesan = {
      'izin pulang': {
        title:'Informasi Izin Santri: Izin Pulang',
        body: String(row[5] || 'Santri') + ' tercatat Izin Pulang pada ' + String(row[2] || '') + (row[3] ? ' - ' + row[3] : '') + ' tanggal ' + String(row[1] || '') + '.'
      },
      'izin sakit': {
        title:'Informasi Izin Santri: Izin Sakit',
        body: String(row[5] || 'Santri') + ' tercatat Izin Sakit pada ' + String(row[2] || '') + (row[3] ? ' - ' + row[3] : '') + ' tanggal ' + String(row[1] || '') + '.'
      },
      'izin keluar': {
        title:'Informasi Izin Santri: Izin Keluar',
        body: String(row[5] || 'Santri') + ' tercatat Izin Keluar pada ' + String(row[2] || '') + (row[3] ? ' - ' + row[3] : '') + ' tanggal ' + String(row[1] || '') + '.'
      }
    }[statusAbsensi];
    if (!pesan) throw new Error('Fungsi uji ini hanya mengirim Izin Pulang, Izin Sakit, atau Izin Keluar. Status terbaca: ' + statusAbsensi);

    const tokens = cariTokenWaliUntukNis_(row[4]);
    if (!tokens.length) throw new Error('Token perangkat wali aktif tidak ditemukan untuk NIS ' + row[4] + '.');
    // Uji awal dibatasi ke satu token aktif agar tidak mengirim ganda ke banyak perangkat.
    const hasilFCM = kirimFCMWali_(
      tokens[0], pesan.title, pesan.body,
      {tipe:'ketidakhadiran_berizin', status:statusAbsensi, nis:String(row[4]), tanggal:String(row[1]), kegiatan:String(row[2]), sesi:String(row[3])}
    );

    sh.getRange(rowNumber, 7).setValue('TERKIRIM');
    sh.getRange(rowNumber, 9).setValue(new Date());
    sh.getRange(rowNumber, 10).setValue('FCM sukses: ' + (hasilFCM.name || 'message accepted') + '; token aktif ditemukan: ' + tokens.length + '; uji kirim memakai 1 token.');
    return {
      berhasil:true, firebaseDikirim:true, statusAbsensi:statusAbsensi,
      nis:String(row[4]), nama:String(row[5]), tokenDipakai:1,
      tokenAktifDitemukan:tokens.length, fcmMessage:hasilFCM.name || ''
    };
  } finally {
    lock.releaseLock();
  }
}
