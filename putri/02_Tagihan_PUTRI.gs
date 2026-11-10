/** Tagihan SPP PUTRI otomatis: 12 bulan sejak bulan masuk santri. */
function sppPutriGetAmount_() {
  const sh=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SPP_PUTRI_SHEETS.SETTINGS);
  if(!sh||sh.getLastRow()<2) return 0;
  const rows=sh.getRange(2,1,sh.getLastRow()-1,2).getValues();
  const r=rows.find(x=>String(x[0]).trim()==='nominal_spp');
  const n=Number(r&&r[1]); return isFinite(n)&&n>0?n:0;
}

/** Membaca tanggal masuk dari kolom P: dd-MM-yyyy, yyyy-MM-dd, atau nilai tanggal Sheets. */
function sppPutriAdmissionPeriod_(value) {
  if(value instanceof Date && !isNaN(value.getTime())) {
    return {year:value.getFullYear(),month:value.getMonth()+1};
  }
  const s=String(value||'').trim();
  let m=s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if(m) {
    const d=Number(m[1]),mo=Number(m[2]),y=Number(m[3]);
    const check=new Date(y,mo-1,d);
    if(check.getFullYear()===y&&check.getMonth()===mo-1&&check.getDate()===d)return {year:y,month:mo};
    return null;
  }
  m=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if(m) {
    const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]),check=new Date(y,mo-1,d);
    if(check.getFullYear()===y&&check.getMonth()===mo-1&&check.getDate()===d)return {year:y,month:mo};
  }
  return null;
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
  students.slice(1).forEach(r=>{const nis=String(r[0]||'').trim(),status=String(r[7]||'').toLowerCase();if(!nis||(status&&!['aktif','active'].includes(status)))return;if(seen.has(nis+'|'+periode))return;rows.push([Utilities.getUuid(),nis,String(r[1]||''),String(r[2]||''),periode,amount,SPP_PUTRI_STATUS.UNPAID,'',new Date(),new Date()]);});
  if(rows.length){const lock=LockService.getScriptLock();lock.waitLock(15000);try{sh.getRange(sh.getLastRow()+1,1,rows.length,SPP_PUTRI_HEADERS.BILLING.length).setValues(rows);}finally{lock.releaseLock();}}
  return {ok:true,created:rows.length,periode:periode,message:'Tagihan SPP PUTRI berhasil dibuat.'};
}

/** Dipanggil saat NIS dicari: buat otomatis 12 periode sejak bulan masuk, tanpa menggandakan tagihan. */
function sppPutriEnsureStudentBills_(nis) {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID), studentSh=ss.getSheetByName(SPP_PUTRI_SHEETS.STUDENTS);
  if(!studentSh)return {ok:false,error:'Database santri PUTRI tidak ditemukan.'};
  const rows=studentSh.getDataRange().getDisplayValues();
  const row=rows.slice(1).find(r=>String(r[0]||'').replace(/\D/g,'')===String(nis));
  if(!row)return {ok:false,error:'NIS tidak ditemukan pada database PUTRI.'};
  const admission=sppPutriAdmissionPeriod_(row[15]);
  if(!admission)return {ok:false,error:'Tanggal_Masuk pada kolom P belum valid. Isi dengan tanggal lengkap, contoh 15-10-2026.'};
  const amount=sppPutriGetAmount_();
  if(!Number.isSafeInteger(amount)||amount<=0)return {ok:false,error:'Nominal SPP belum diatur pada SPP_PUTRI_Pengaturan.'};
  const sh=sppPutriEnsureSheet_().getSheetByName(SPP_PUTRI_SHEETS.BILLING);
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try {
    const existing=sppPutriRows_(SPP_PUTRI_SHEETS.BILLING);
    const seen=new Set(existing.map(x=>String(x.nis)+'|'+String(x.periode)));
    const now=new Date(),newRows=[];
    for(let i=0;i<12;i++) {
      const d=new Date(admission.year,admission.month-1+i,1);
      const period=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
      const key=String(nis)+'|'+period;
      if(!seen.has(key))newRows.push([Utilities.getUuid(),String(nis),String(row[1]||''),String(row[2]||''),period,amount,SPP_PUTRI_STATUS.UNPAID,'',now,now]);
    }
    if(newRows.length)sh.getRange(sh.getLastRow()+1,1,newRows.length,SPP_PUTRI_HEADERS.BILLING.length).setValues(newRows);
    return {ok:true,created:newRows.length,amount:amount,admissionPeriod:admission.year+'-'+String(admission.month).padStart(2,'0')};
  } finally {lock.releaseLock();}
}
function sppPutriGetBills_(nis,periode) {
  nis=String(nis||'').replace(/\D/g,''); if(!nis)return {ok:false,error:'NIS wajib diisi.'};
  const generated=sppPutriEnsureStudentBills_(nis);
  if(!generated.ok)return generated;
  const raw=sppPutriRows_(SPP_PUTRI_SHEETS.BILLING).filter(x=>String(x.nis).replace(/\D/g,'')===nis&&(!periode||String(x.periode)===sppPutriNormalizePeriod_(periode)));
  // Satu kartu per bulan. Jika data lama terlanjur ganda, pertahankan status paling kuat.
  const rank=status=>{const v=String(status||'').toLowerCase();return v==='lunas'?3:(v==='menunggu verifikasi'?2:(v==='ditolak'?1:0));};
  const byPeriod=new Map();
  raw.forEach(x=>{const key=sppPutriNormalizePeriod_(x.periode);if(!key)return;const old=byPeriod.get(key);if(!old||rank(x.status)>rank(old.status))byPeriod.set(key,x);});
  const data=Array.from(byPeriod.values()).sort((a,b)=>String(a.periode).localeCompare(String(b.periode)));
  return {ok:true,data:data,nominal:generated.amount,admissionPeriod:generated.admissionPeriod,created:generated.created};
}
