/**
 * Proteksi izin santri untuk absensi PPFHA.
 * File tambahan: tidak mengubah Code.gs utama.
 * Membaca sheet Izin berdasarkan nama header, bukan posisi kolom.
 */
function ppfhaActiveAttendancePermissions_(targetDate) {
  const dateTarget = String(targetDate || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd'));
  const sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Izin');
  const active = {};
  if (!sh || sh.getLastRow() < 2) return active;

  const values = sh.getDataRange().getValues();
  const headers = values[0].map(function(v) {
    return String(v == null ? '' : v).trim().toLowerCase();
  });
  const col = {};
  headers.forEach(function(h, i) { col[h] = i; });
  ['nis','jenis','status'].forEach(function(k) {
    if (col[k] === undefined) throw new Error('Proteksi izin: kolom "' + k + '" tidak ditemukan di sheet Izin.');
  });

  function cell(row, key) {
    return col[key] === undefined ? '' : row[col[key]];
  }
  function clean(value) {
    return String(value == null ? '' : value).trim().toLowerCase()
      .replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  }

  values.slice(1).forEach(function(row) {
    const nis = String(cell(row, 'nis') || '').trim().replace(/\D/g, '');
    if (!nis) return;

    const jenis = clean(cell(row, 'jenis'));
    const status = clean(cell(row, 'status'));
    const isSick = jenis.indexOf('sakit') >= 0;
    const isPulangOrKeluar = /pulang|keluar|berobat|keluarga/.test(jenis);
    if (!isSick && !isPulangOrKeluar) return;

    // Izin yang menunggu/ditolak atau sudah diselesaikan tidak aktif.
    const terminal = /ditolak|sudah kembali|sudah sehat|dibatalkan|\bbatal\b|selesai/.test(status);
    if (terminal) return;
    const approved = isSick
      ? /sakit|diizinkan|sudah keluar/.test(status)
      : /diizinkan|sudah keluar/.test(status);
    if (!approved) return;

    // Kolom kembali hanya diisi saat santri benar-benar sudah kembali/sehat.
    const returned = cell(row, 'kembali');
    if (returned !== '' && returned !== null && returned !== undefined) return;

    const startValue = cell(row, 'keluar') || cell(row, 'dibuatPada');
    const startDate = attendanceCellDate_(startValue);
    const startTime = attendanceCellTime_(startValue) || '00:00';
    if (!startDate || startDate > dateTarget) return;

    const endValue = cell(row, 'rencanaKembali');
    const endDate = endValue ? attendanceCellDate_(endValue) : '';
    const endTime = endValue ? (attendanceCellTime_(endValue) || '23:59') : '23:59';
    if (endDate && endDate < dateTarget) return;

    const label = isSick ? 'Izin Sakit' : (jenis.indexOf('pulang') >= 0 ? 'Izin Pulang' : 'Izin Keluar');
    const candidate = {
      nis: nis, date: startDate, time: startTime,
      endDate: endDate, endTime: endTime, status: label
    };
    const old = active[nis];
    if (!old || (candidate.date + ' ' + candidate.time) > (old.date + ' ' + old.time)) {
      active[nis] = candidate;
    }
  });
  return active;
}

/** Izin aktif tepat pada waktu scan. */
function ppfhaFindActivePermission_(nis, date, time) {
  const map = ppfhaActiveAttendancePermissions_(date);
  const p = map[String(nis || '').replace(/\D/g, '')];
  if (!p) return null;
  const started = p.date < date || (p.date === date && p.time <= time);
  const notEnded = !p.endDate || p.endDate > date || (p.endDate === date && p.endTime >= time);
  return started && notEnded ? p : null;
}

/** Pemeriksaan manual untuk pengujian modul tanpa mengubah data absensi. */
function ppfhaTesProteksiIzin(nis) {
  const now = new Date();
  const date = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd');
  const time = Utilities.formatDate(now, 'Asia/Jakarta', 'HH:mm');
  const permission = ppfhaFindActivePermission_(nis, date, time);
  return {
    ok: true,
    nis: String(nis || '').replace(/\D/g, ''),
    waktuPemeriksaan: date + ' ' + time,
    izinAktif: !!permission,
    izin: permission || null,
    pesan: permission ? 'Santri sedang izin aktif; scan harus ditolak.' : 'Tidak ditemukan izin aktif pada waktu pemeriksaan.'
  };
}
