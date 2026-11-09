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

