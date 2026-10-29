// Backend awal Program Pesantren PPFHA
// Tahap ini menyiapkan tab database dan endpoint baca.
// Belum menerima penyimpanan data dari website; tambahkan autentikasi sebelum endpoint tulis diaktifkan.

const SPREADSHEET_ID = '1JdBEnLlJHeIlb8XI8OoqzxTj84wYGkU2Hr0ySq6p6gA';

const HEADERS = {
  Izin: [
    'id', 'dibuatPada', 'nis', 'nama', 'jenis',
    'status', 'keluar', 'rencanaKembali', 'kembali',
    'wali', 'catatan', 'terbit'
  ],
  Pengumuman: [
    'id', 'dibuatPada', 'judul', 'kategori',
    'tanggal', 'target', 'nisTarget', 'isi', 'status'
  ],
  Kegiatan: [
    'id', 'dibuatPada', 'judul', 'lokasi',
    'tanggal', 'waktu', 'isi', 'status'
  ]
};

/**
 * Jalankan sekali dari editor Apps Script untuk membuat tab database.
 * Tidak menghapus atau mengubah tab yang sudah memiliki isi.
 */
function setupDatabase() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  Object.keys(HEADERS).forEach(function(sheetName) {
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS[sheetName]);
      sheet.setFrozenRows(1);
    }
  });

  return 'Database Program Pesantren siap.';
}

/**
 * Endpoint pemeriksaan dan baca data.
 * Contoh: .../exec?action=izin
 *          .../exec?action=pengumuman
 *          .../exec?action=kegiatan
 */
function doGet(e) {
  const action = e && e.parameter
    ? e.parameter.action
    : 'health';

  if (!action || action === 'health') {
    return output({
      ok: true,
      app: 'Program Pesantren PPFHA'
    });
  }

  const sheetNames = {
    izin: 'Izin',
    pengumuman: 'Pengumuman',
    kegiatan: 'Kegiatan'
  };

  const sheetName = sheetNames[action];

  if (!sheetName) {
    return output({
      ok: false,
      error: 'Aksi tidak dikenal.'
    });
  }

  const sheet = SpreadsheetApp
    .openById(SPREADSHEET_ID)
    .getSheetByName(sheetName);

  if (!sheet) {
    return output({
      ok: false,
      error: 'Tab database belum tersedia. Jalankan setupDatabase().'
    });
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return output({ ok: true, data: [] });
  }

  const headers = values.shift();

  const data = values
    .filter(function(row) {
      return row.some(function(cell) {
        return cell !== '';
      });
    })
    .map(function(row) {
      const item = {};

      headers.forEach(function(key, index) {
        const value = row[index];
        item[key] = value instanceof Date
          ? value.toISOString()
          : value;
      });

      return item;
    });

  return output({
    ok: true,
    data: data.filter(function(item) {
      return item.status !== 'Draf';
    })
  });
}

function output(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
