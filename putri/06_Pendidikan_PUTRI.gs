/* ==================== DATABASE PENDIDIKAN SANTRI ==================== */
/**
 * Menyiapkan empat tab pendidikan pada database Perizinan KTS PPFHA.
 * Aman: tidak menghapus, menimpa, atau mengubah tab/data yang sudah berisi.
 * Jalankan fungsi ini satu kali dari editor Apps Script.
 */
function setupEducationDatabase() {
  const educationHeaders = {
    RaportMadrasah: [
      'id','tanggalInput','nis','nama','kelas','tahunAjaran',
      'mataPelajaran','kelompok','semester','prestasi','rataRataKelas',
      'ustaz','catatan'
    ],
    UjianAlbab: [
      'id','tanggalInput','nis','nama','kelas','periodeUjian',
      'nilaiTulis','nilaiBaca','nilaiAkhir','catatan','ustaz'
    ],
    HafalanKitab: [
      'id','tanggalInput','nis','nama','kelas','namaKitabNadzom',
      'jenis','targetBait','capaianBait','status','catatan','ustaz'
    ],
    EvaluasiUstaz: ['id','tanggalInput','nis','nama','kelas','kategori','catatanEvaluasi','saranTindakLanjut','ustaz']
  };

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const hasil = [];

    Object.keys(educationHeaders).forEach(function(name) {
      let sh = ss.getSheetByName(name);

      if (!sh) {
        sh = ss.insertSheet(name);
        sh.getRange(1, 1, 1, educationHeaders[name].length)
          .setValues([educationHeaders[name]]);
        sh.setFrozenRows(1);
        hasil.push('Tab ' + name + ' berhasil dibuat beserta header');
        return;
      }

      if (sh.getLastRow() === 0) {
        sh.getRange(1, 1, 1, educationHeaders[name].length)
          .setValues([educationHeaders[name]]);
        sh.setFrozenRows(1);
        hasil.push('Header tab ' + name + ' berhasil ditambahkan');
      } else {
        hasil.push('Tab ' + name + ' sudah ada dan berisi data; tidak diubah');
      }
    });

    const result = {
      ok: true,
      spreadsheet: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      tabs: hasil
    };
    Logger.log(JSON.stringify(result));
    return JSON.stringify(result);
  } catch (err) {
    const message = explainError_(err);
    Logger.log(message);
    throw new Error(message);
  }
}


/**
 * UJI LANGSUNG PENYIMPANAN UJIAN ALBAB.
 * Jalankan manual dari Apps Script editor. Menulis satu baris sementara,
 * memeriksa hasil baca, lalu menghapus baris uji agar database tetap bersih.
 * Tidak memerlukan ADMIN_API_KEY karena dijalankan langsung oleh pemilik script.
 */
function testSaveEducationAlbab() {
  const sheetName = 'UjianAlbab';
  const headers = ['id','tanggalInput','nis','nama','kelas','periodeUjian','nilaiTulis','nilaiBaca','nilaiAkhir','catatan','ustaz'];
  const testId = 'TEST-ALBAB-' + Utilities.getUuid();
  let sh = null, testRow = 0, lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    sh = ss.getSheetByName(sheetName);
    if (!sh) {
      sh = ss.insertSheet(sheetName);
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
    } else if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
    }
    const headerNow = sh.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
    if (headers.some(function(h, i) { return String(headerNow[i]).trim() !== h; })) {
      throw new Error('Header tab UjianAlbab tidak sesuai. Ditemukan: ' + headerNow.join(' | '));
    }
    const nilaiTulis = 50, nilaiBaca = 10, nilaiAkhir = (nilaiTulis + nilaiBaca) / 2;
    const row = [testId, new Date(), 'TEST0000', 'UJI PENYIMPANAN (AKAN DIHAPUS)', 'TEST', 'UJI OTOMATIS', nilaiTulis, nilaiBaca, nilaiAkhir, 'Baris sementara untuk tes fungsi simpan', 'TEST'];
    testRow = sh.getLastRow() + 1;
    sh.getRange(testRow, 1, 1, headers.length).setValues([row]);
    SpreadsheetApp.flush();
    const readBack = sh.getRange(testRow, 1, 1, headers.length).getValues()[0];
    if (String(readBack[0]) !== testId || Number(readBack[6]) !== 50 || Number(readBack[7]) !== 10 || Number(readBack[8]) !== 30) {
      throw new Error('Baris berhasil ditulis tetapi hasil baca ulang tidak cocok.');
    }
    sh.deleteRow(testRow);
    testRow = 0;
    SpreadsheetApp.flush();
    const result = {ok:true, test:'WRITE_READ_DELETE', sheet:sheetName, nilaiTulis:50, nilaiBaca:10, nilaiAkhir:30, temporaryRowRemoved:true, message:'Fungsi tulis, baca ulang, dan hapus baris uji berhasil.'};
    Logger.log(JSON.stringify(result));
    return JSON.stringify(result);
  } catch (err) {
    if (sh && testRow > 0) {
      try {
        const idCell = sh.getRange(testRow, 1).getValue();
        if (String(idCell) === testId) sh.deleteRow(testRow);
      } catch (cleanupErr) { Logger.log('Pembersihan baris uji gagal: ' + cleanupErr.message); }
    }
    const result = {ok:false, test:'WRITE_READ_DELETE', sheet:sheetName, error:explainError_(err)};
    Logger.log(JSON.stringify(result));
    throw new Error(JSON.stringify(result));
  } finally {
    lock.releaseLock();
  }
}
