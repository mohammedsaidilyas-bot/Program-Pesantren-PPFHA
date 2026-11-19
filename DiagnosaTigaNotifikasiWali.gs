/**
 * DiagnosaTigaNotifikasiWali.gs
 * DIAGNOSTIK READ-ONLY untuk notifikasi Pengumuman, Perizinan Awal, Uang Jajan.
 * Tidak mengirim FCM, tidak menulis/menghapus sheet, dan tidak mengubah trigger.
 *
 * Salin ke Apps Script proyek Notifikasi Wali PPFHA, lalu jalankan:
 * diagnosaTigaNotifikasiWali()
 */
function diagnosaTigaNotifikasiWali() {
  var hasil = {
    mode: 'READ_ONLY',
    waktu: new Date().toISOString(),
    timezone: Session.getScriptTimeZone(),
    trigger: [],
    propertyKeys: [],
    spreadsheetChecks: [],
    catatan: [
      'Diagnostik ini tidak mengirim notifikasi.',
      'Diagnostik ini tidak mengubah data sheet atau trigger.',
      'Isi token/API key tidak pernah dicetak.'
    ]
  };

  // A. Pemeriksaan trigger yang sudah terpasang: hanya nama handler dan tipe.
  try {
    ScriptApp.getProjectTriggers().forEach(function(t) {
      hasil.trigger.push({
        handler: t.getHandlerFunction(),
        eventType: String(t.getEventType()),
        source: String(t.getTriggerSource())
      });
    });
  } catch (e) {
    hasil.triggerError = String(e);
  }

  // B. Nama Script Properties saja; nilai rahasia tidak ditampilkan.
  var props = PropertiesService.getScriptProperties().getProperties();
  hasil.propertyKeys = Object.keys(props).sort();

  // C. Spreadsheet IDs dari variabel global yang umum dipakai, plus Script Properties
  // yang namanya mengandung ID. Nilai hanya dipakai untuk membuka spreadsheet;
  // tidak ditampilkan pada output.
  var ids = [];
  function addId(label, value) {
    if (value && String(value).trim()) {
      ids.push({label: label, id: String(value).trim()});
    }
  }
  try { if (typeof SPREADSHEET_ID !== 'undefined') addId('SPREADSHEET_ID', SPREADSHEET_ID); } catch (_) {}
  try { if (typeof STUDENT_DB_ID !== 'undefined') addId('STUDENT_DB_ID', STUDENT_DB_ID); } catch (_) {}
  try { if (typeof SPP_SPREADSHEET_ID !== 'undefined') addId('SPP_SPREADSHEET_ID', SPP_SPREADSHEET_ID); } catch (_) {}
  try { if (typeof UANG_JAJAN_SPREADSHEET_ID !== 'undefined') addId('UANG_JAJAN_SPREADSHEET_ID', UANG_JAJAN_SPREADSHEET_ID); } catch (_) {}
  Object.keys(props).forEach(function(k) {
    if (/spreadsheet.*id|sheet.*id|database.*id|db.*id/i.test(k)) addId('ScriptProperty:' + k, props[k]);
  });

  // Hilangkan ID duplikat, tetapi tetap catat label konfigurasi.
  var seen = {};
  ids.forEach(function(item) {
    if (seen[item.id]) return;
    seen[item.id] = true;
    try {
      var ss = SpreadsheetApp.openById(item.id);
      var sheets = ss.getSheets().map(function(sh) {
        var lr = sh.getLastRow();
        var lc = sh.getLastColumn();
        var headers = (lr > 0 && lc > 0)
          ? sh.getRange(1, 1, 1, Math.min(lc, 30)).getDisplayValues()[0]
          : [];
        return {
          sheetName: sh.getName(),
          rows: Math.max(0, lr - 1),
          headerPreview: headers.slice(0, 20)
        };
      });
      hasil.spreadsheetChecks.push({
        label: item.label,
        accessible: true,
        spreadsheetName: ss.getName(),
        sheets: sheets
      });
    } catch (e) {
      hasil.spreadsheetChecks.push({
        label: item.label,
        accessible: false,
        error: String(e).substring(0, 250)
      });
    }
  });

  // D. Ringkasan keberadaan sheet yang relevan, tanpa membaca isi baris data.
  var names = [];
  hasil.spreadsheetChecks.forEach(function(c) {
    if (c.sheets) c.sheets.forEach(function(s) { names.push(s.sheetName); });
  });
  hasil.sheetNamesRelevant = names.filter(function(n) {
    return /pengumuman|izin|perizinan|uang|jajan|transaksi|pembayaran|notif|token|perangkat/i.test(n);
  });

  // E. Cek konfigurasi Firebase hanya berdasarkan keberadaan property, bukan nilainya.
  hasil.firebasePropertyPresence = {
    FIREBASE_PROJECT_ID: Object.prototype.hasOwnProperty.call(props, 'FIREBASE_PROJECT_ID'),
    FIREBASE_SERVICE_ACCOUNT: Object.keys(props).some(function(k) {
      return /service.?account|private.?key/i.test(k);
    }),
    FCM_OR_TOKEN_PROPERTY: Object.keys(props).some(function(k) {
      return /fcm|firebase|token/i.test(k);
    })
  };

  Logger.log(JSON.stringify(hasil, null, 2));
  return hasil;
}
