/** 
 * TriggerManager.gs — pusat diagnostik dan pemulihan trigger PPFHA.
 * Aman: tidak menghapus trigger fungsi lain yang tidak terdaftar.
 * Trigger notifikasi wali yang dikelola: kirimAntrianNotifikasiWali (1 menit).
 */
var TM_MANAGED = {
  kirimAntrianNotifikasiWali: { intervalMinutes: 1 }
};

function TM_checkTriggers() {
  var all = ScriptApp.getProjectTriggers();
  var report = Object.keys(TM_MANAGED).map(function(fn) {
    var matches = all.filter(function(t) { return t.getHandlerFunction() === fn; });
    return { functionName: fn, count: matches.length, status: matches.length === 1 ? 'OK' : (matches.length === 0 ? 'MISSING' : 'DUPLICATE') };
  });
  Logger.log(JSON.stringify(report, null, 2));
  return report;
}

/** Perbaiki trigger notifikasi yang dikelola saja; trigger fungsi lain tidak disentuh. */
function TM_repairTriggers() {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    Object.keys(TM_MANAGED).forEach(function(fn) {
      var matches = ScriptApp.getProjectTriggers().filter(function(t) { return t.getHandlerFunction() === fn; });
      // Hapus duplikat hanya untuk handler yang secara eksplisit dikelola di file ini.
      matches.slice(1).forEach(function(t) { ScriptApp.deleteTrigger(t); });
      if (!matches.length) {
        ScriptApp.newTrigger(fn).timeBased().everyMinutes(TM_MANAGED[fn].intervalMinutes).create();
      }
    });
    return TM_checkTriggers();
  } finally { lock.releaseLock(); }
}

/** Hapus duplikat pada handler yang dikelola saja, pertahankan satu jika ada. */
function TM_removeDuplicateTriggers() {
  Object.keys(TM_MANAGED).forEach(function(fn) {
    var matches = ScriptApp.getProjectTriggers().filter(function(t) { return t.getHandlerFunction() === fn; });
    matches.slice(1).forEach(function(t) { ScriptApp.deleteTrigger(t); });
  });
  return TM_checkTriggers();
}

/** Laporan seluruh trigger proyek, termasuk yang tidak dikelola file ini. */
function TM_triggerStatus() {
  var rows = ScriptApp.getProjectTriggers().map(function(t) {
    return { functionName: t.getHandlerFunction(), eventType: String(t.getEventType()), source: String(t.getTriggerSource()) };
  });
  Logger.log(JSON.stringify(rows, null, 2));
  return rows;
}

/** Jalankan handler notifikasi secara manual untuk diagnosis; tidak membuat trigger. */
function TM_runNotificationTest() {
  if (typeof kirimAntrianNotifikasiWali !== 'function') throw new Error('Handler kirimAntrianNotifikasiWali tidak ditemukan. Pastikan Notifikasi.gs telah disalin.');
  return kirimAntrianNotifikasiWali();
}
