/** Pengaturan nominal SPP harus diisi pengurus; tidak ada nominal bawaan. */
function sppPutriGetAmount_() {
  const sh=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SPP_PUTRI_SHEETS.SETTINGS);
  if(!sh||sh.getLastRow()<2) return 0;
  const rows=sh.getRange(2,1,sh.getLastRow()-1,2).getValues();
  const r=rows.find(x=>String(x[0])==='nominal_spp');
  const n=Number(r&&r[1]); return isFinite(n)&&n>0?n:0;
}
function sppPutriCreateBills_(data) {
  if(!sppPutriAuthorized_(data.apiKey))return {ok:false,error:'Akses pembuatan tagihan ditolak.'};
  const periode=String(data.periode||'').trim(), amount=Number(data.nominal||sppPutriGetAmount_());
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(periode))return {ok:false,error:'Periode harus berformat YYYY-MM.'};
  if(!Number.isSafeInteger(amount)||amount<=0)return {ok:false,error:'Nominal SPP belum diatur atau tidak valid.'};
  const ss=sppPutriEnsureSheet_(), students=ss.getSheetByName(SPP_PUTRI_SHEETS.STUDENTS).getDataRange().getDisplayValues();
  if(students.length<2)return {ok:false,error:'Data santri PUTRI kosong.'};
  const sh=ss.getSheetByName(SPP_PUTRI_SHEETS.BILLING), existing=sppPutriRows_(SPP_PUTRI_SHEETS.BILLING), seen=new Set(existing.map(x=>String(x.nis)+'|'+String(x.periode)));
  const rows=[];
  students.slice(1).forEach(r=>{const nis=String(r[0]||'').trim(),status=String(r[7]||'').toLowerCase();if(!nis|| (status && !['aktif','active'].includes(status)))return; if(seen.has(nis+'|'+periode))return;rows.push([Utilities.getUuid(),nis,String(r[1]||''),String(r[2]||''),periode,amount,SPP_PUTRI_STATUS.UNPAID,'',new Date(),new Date()]);});
  if(rows.length){const lock=LockService.getScriptLock();lock.waitLock(15000);try{sh.getRange(sh.getLastRow()+1,1,rows.length,SPP_PUTRI_HEADERS.BILLING.length).setValues(rows);}finally{lock.releaseLock();}}
  return {ok:true,created:rows.length,periode:periode,message:'Tagihan SPP PUTRI berhasil dibuat.'};
}
function sppPutriGetBills_(nis,periode) {
  nis=String(nis||'').replace(/\D/g,''); if(!nis)return {ok:false,error:'NIS wajib diisi.'};
  const data=sppPutriRows_(SPP_PUTRI_SHEETS.BILLING).filter(x=>String(x.nis)===nis&&(!periode||String(x.periode)===String(periode)));
  return {ok:true,data:data};
}
