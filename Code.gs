/**
 * Program Pesantren PPFHA — Google Apps Script backend
 * Database: Google Spreadsheet "Database Perizinan KTS PPFHA."
 *
 * Catatan:
 * - setupDatabase() membuat tab dan header jika belum ada.
 * - Tidak menghapus data yang sudah ada.
 * - Endpoint ini hanya untuk pemeriksaan dan membaca data.
 * - Fitur tulis dari website belum diaktifkan sampai autentikasi pengurus disiapkan.
 */
const SPREADSHEET_ID = '1JdBEnLlJHeIlb8XI8OoqzxTj84wYGkU2Hr0ySq6p6gA';

const HEADERS = {
  Izin: ['id', 'dibuatPada', 'nis', 'nama', 'jenis', 'status', 'keluar', 'rencanaKembali', 'kembali', 'wali', 'catatan', 'terbit'],
  Pengumuman: ['id', 'dibuatPada', 'judul', 'kategori', 'tanggal', 'target', 'nisTarget', 'isi', 'status'],
  Kegiatan: ['id', 'dibuatPada', 'judul', 'lokasi', 'tanggal', 'waktu', 'isi', 'status']
};

/**
 * Jalankan satu kali dari editor Apps Script.
 * Pilih fungsi setupDatabase lalu tekan Run.
 */
function setupDatabase() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hasil = [];

  Object.keys(HEADERS).forEach(function(name) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      hasil.push('Tab ' + name + ' dibuat');
    }

    // Isi header hanya jika tab benar-benar kosong.
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
      sheet.setFrozenRows(1);
      hasil.push('Header ' + name + ' ditambahkan');
    } else {
      hasil.push('Tab ' + name + ' sudah berisi data; tidak diubah');
    }
  });

  return 'Selesai. ' + hasil.join('. ') + '.';
}

/** Tes akses spreadsheet tanpa mengubah isi data. */
function testDatabase() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const result = {
    ok: true,
    app: 'Program Pesantren PPFHA',
    spreadsheet: ss.getName(),
    spreadsheetId: ss.getId(),
    tabs: ss.getSheets().map(function(sheet) {
      return {
        name: sheet.getName(),
        rows: sheet.getLastRow(),
        columns: sheet.getLastColumn()
      };
    })
  };
  Logger.log(JSON.stringify(result));
  return JSON.stringify(result);
}

/**
 * Endpoint pemeriksaan dan baca data.
 * /exec
 * /exec?action=izin
 * /exec?action=pengumuman
 * /exec?action=kegiatan
 */
function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action
      ? String(e.parameter.action).toLowerCase()
      : 'health';

    if (action === 'health') {
      return output({
        ok: true,
        app: 'Program Pesantren PPFHA',
        message: 'Endpoint aktif'
      });
    }

    const sheetNames = {
      izin: 'Izin',
      pengumuman: 'Pengumuman',
      kegiatan: 'Kegiatan'
    };
    const sheetName = sheetNames[action];

    if (!sheetName) {
      return output({ ok: false, error: 'Aksi tidak dikenal: ' + action });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return output({
        ok: false,
        error: 'Tab ' + sheetName + ' belum ada. Jalankan setupDatabase() di editor.'
      });
    }

    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return output({ ok: true, data: [] });

    const headers = values[0].map(function(h) { return String(h).trim(); });
    const data = values.slice(1)
      .filter(function(row) {
        return row.some(function(cell) { return cell !== '' && cell !== null; });
      })
      .map(function(row) {
        const item = {};
        headers.forEach(function(key, index) {
          if (!key) return;
          const value = row[index];
          item[key] = value instanceof Date ? value.toISOString() : value;
        });
        return item;
      })
      .filter(function(item) {
        return String(item.status || '').toLowerCase() !== 'draf';
      });

    return output({ ok: true, data: data });
  } catch (err) {
    return output({
      ok: false,
      error: String(err && err.message ? err.message : err)
    });
  }
}

function output(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
