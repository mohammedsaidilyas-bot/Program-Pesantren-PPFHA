/** Pengaturan nominal SPP PUTRI — terpisah dari seluruh pengaturan PUTRA. */
function sppPutriGetSettings_() {
  const sh = sppPutriEnsureSheet_().getSheetByName(SPP_PUTRI_SHEETS.SETTINGS);
  const rows = sh.getLastRow() > 1 ? sh.getRange(2,1,sh.getLastRow()-1,3).getValues() : [];
  const row = rows.find(r => String(r[0] || '').trim() === 'nominal_spp');
  const amount = Number(row && row[1]);
  return {ok:true, nominalSpp:Number.isSafeInteger(amount) && amount > 0 ? amount : 0};
}

function sppPutriSaveSettings_(data) {
  if (!sppPutriAuthorized_(data.apiKey)) return {ok:false,error:'Akses pengaturan SPP PUTRI ditolak.'};
  const amount = Number(data.nominalSpp);
  if (!Number.isSafeInteger(amount) || amount <= 0) return {ok:false,error:'Nominal SPP harus berupa bilangan bulat lebih dari Rp0.'};
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = sppPutriEnsureSheet_().getSheetByName(SPP_PUTRI_SHEETS.SETTINGS);
    const last = sh.getLastRow();
    const rows = last > 1 ? sh.getRange(2,1,last-1,3).getValues() : [];
    const index = rows.findIndex(r => String(r[0] || '').trim() === 'nominal_spp');
    const row = ['nominal_spp', amount, 'Nominal bulanan SPP khusus santri PUTRI'];
    if (index >= 0) sh.getRange(index + 2,1,1,3).setValues([row]);
    else sh.getRange(last + 1,1,1,3).setValues([row]);
    return {ok:true,nominalSpp:amount,message:'Nominal SPP PUTRI berhasil disimpan.'};
  } finally {
    lock.releaseLock();
  }
}
