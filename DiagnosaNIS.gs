/**
 * DIAGNOSTIK NIS — hanya membaca database, tidak mengubah data.
 * Jalankan testBiodataNIS() dari editor Apps Script.
 */
function testBiodataNIS() {
  var nisUji = '20260001';
  var idDB = '1JmWFYwHcXGTEauL-t9bqNGPtnH_L1dlkmqJFwCPtvyo';
  var namaTab = 'Uang Jajan Santri PPFHA';
  try {
    var ss = SpreadsheetApp.openById(idDB);
    var sh = ss.getSheetByName(namaTab);
    if (!sh) {
      Logger.log('HASIL: TAB_TIDAK_DITEMUKAN | ' + namaTab);
      return;
    }
    var rows = sh.getDataRange().getDisplayValues();
    Logger.log('Spreadsheet: ' + ss.getName());
    Logger.log('Tab: ' + sh.getName() + ' | baris data: ' + Math.max(0, rows.length-1));
    if (rows.length < 2) {
      Logger.log('HASIL: DATABASE_KOSONG');
      return;
    }
    var headers = rows[0].map(function(h){return String(h||'').toLowerCase().replace(/[^a-z0-9]/g,'');});
    var idx = headers.indexOf('nis');
    if (idx < 0) idx = headers.indexOf('nomorinduksantri');
    if (idx < 0) idx = 0;
    var namaIdx = headers.indexOf('nama');
    if (namaIdx < 0) namaIdx = headers.indexOf('namasantri');
    if (namaIdx < 0) namaIdx = 1;
    var statusIdx = headers.indexOf('status');
    if (statusIdx < 0) statusIdx = 7;
    var target = String(nisUji).replace(/\\D/g,'');
    var found = rows.slice(1).find(function(row){
      return String(row[idx]||'').trim().replace(/\\D/g,'') === target;
    });
    if (!found) {
      Logger.log('HASIL: NIS_TIDAK_DITEMUKAN | NIS=' + nisUji + ' | kolomNIS=' + (idx+1));
      Logger.log('Header yang terbaca: ' + JSON.stringify(rows[0]));
      return;
    }
    Logger.log('HASIL: NIS_DITEMUKAN | NIS=' + found[idx] + ' | nama=' + found[namaIdx] + ' | status=' + (found[statusIdx]||'Aktif'));
  } catch (e) {
    Logger.log('HASIL: ERROR_BACA_DATABASE | ' + e.message);
  }
}