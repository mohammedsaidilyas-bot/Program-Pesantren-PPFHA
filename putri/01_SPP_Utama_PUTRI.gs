/** API internal SPP PUTRI. Dipanggil dari router doGet/doPost utama. */
function sppPutriDoGet_(e) {
  const p=(e&&e.parameter)||{}, action=String(p.action||'').toLowerCase();
  if(action==='spp_health') return output_({ok:true,app:'SPP PUTRI',database:'DATABASE SANTRI PUTRI PPFHA'});
  if(action==='spp_student') return output_(sppPutriStudent_(p.nis));
  if(action==='spp_tagihan') return output_(sppPutriGetBills_(p.nis,p.periode));
  if(action==='spp_riwayat') return output_(sppPutriHistory_(p.nis));
  if(action==='spp_kuitansi') return output_(sppPutriReceipt_(p.idPembayaran));
  if(action==='spp_pending') {
    if(!sppPutriAuthorized_(p.key)) return output_({ok:false,error:'Akses daftar verifikasi ditolak.'});
    return output_(sppPutriPending_());
  }
  return output_({ok:false,error:'Aksi SPP PUTRI tidak dikenal.'});
}
function sppPutriStudent_(nis) {
  nis=String(nis||'').trim().replace(/\D/g,'');
  if(!nis) return {ok:false,error:'NIS wajib diisi.'};
  const sh=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SPP_PUTRI_SHEETS.STUDENTS);
  if(!sh) return {ok:false,error:'Database santri PUTRI tidak ditemukan.'};
  const rows=sh.getDataRange().getDisplayValues();
  if(rows.length<2) return {ok:false,error:'Data santri PUTRI masih kosong.'};
  const row=rows.slice(1).find(r=>String(r[0]||'').replace(/\D/g,'')===nis);
  if(!row) return {ok:false,error:'NIS tidak ditemukan pada database PUTRI.'};
  const status=String(row[7]||'').trim();
  if(status && !['aktif','active'].includes(status.toLowerCase())) return {ok:false,error:'Santri tidak berstatus aktif.'};
  return {ok:true,data:{nis:String(row[0]),nama:String(row[1]),kelas:String(row[2]),asrama:String(row[3]),wali:String(row[4]),noWaWali:String(row[5]),status:status||'Aktif'}};
}
function sppPutriDoPost_(body) {
  const action=String(body.action||'').toLowerCase(), data=body.data||{};
  if(action==='spp_buat_tagihan') return sppPutriCreateBills_(data);
  if(action==='spp_ajukan_pembayaran') return sppPutriSubmitPayment_(data);
  if(action==='spp_verifikasi') return sppPutriVerifyPayment_(data);
  if(action==='spp_tolak') return sppPutriRejectPayment_(data);
  return {ok:false,error:'Aksi SPP PUTRI tidak dikenal.'};
}
function sppPutriAuthorized_(key) {
  const saved=PropertiesService.getScriptProperties().getProperty('ADMIN_API_KEY');
  return !!saved && constantTimeEquals_(String(key||''),saved);
}
function sppPutriEnsureSheet_(key) {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID), map={BILLING:SPP_PUTRI_SHEETS.BILLING,PAYMENTS:SPP_PUTRI_SHEETS.PAYMENTS,SETTINGS:SPP_PUTRI_SHEETS.SETTINGS};
  Object.keys(map).forEach(k=>{let sh=ss.getSheetByName(map[k]);if(!sh){sh=ss.insertSheet(map[k]);sh.getRange(1,1,1,SPP_PUTRI_HEADERS[k].length).setValues([SPP_PUTRI_HEADERS[k]]);sh.setFrozenRows(1);}else if(sh.getLastRow()===0){sh.getRange(1,1,1,SPP_PUTRI_HEADERS[k].length).setValues([SPP_PUTRI_HEADERS[k]]);sh.setFrozenRows(1);}});
  return ss;
}
function sppPutriRows_(sheetName) {
  const sh=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if(!sh||sh.getLastRow()<2)return [];
  const v=sh.getDataRange().getValues(), h=v[0].map(String);
  return v.slice(1).filter(r=>r.some(x=>x!==''&&x!==null)).map(r=>{const o={};h.forEach((k,i)=>o[k]=r[i] instanceof Date?r[i].toISOString():r[i]);return o;});
}
