function sppPutriPending_() {
  return {ok:true,data:sppPutriRows_(SPP_PUTRI_SHEETS.PAYMENTS).filter(x=>String(x.status)===SPP_PUTRI_STATUS.PENDING)};
}
function sppPutriVerifyPayment_(data) {
  if(!sppPutriAuthorized_(data.apiKey))return {ok:false,error:'Akses verifikasi ditolak.'};
  return sppPutriSetPaymentStatus_(String(data.idPembayaran||''),SPP_PUTRI_STATUS.PAID,String(data.diverifikasiOleh||'Bendahara'),String(data.catatan||''));
}
function sppPutriRejectPayment_(data) {
  if(!sppPutriAuthorized_(data.apiKey))return {ok:false,error:'Akses penolakan ditolak.'};
  const reason=String(data.catatan||'').trim();if(!reason)return {ok:false,error:'Alasan penolakan wajib diisi.'};
  return sppPutriSetPaymentStatus_(String(data.idPembayaran||''),SPP_PUTRI_STATUS.REJECTED,String(data.diverifikasiOleh||'Bendahara'),reason);
}
function sppPutriSetPaymentStatus_(id,status,who,note) {
  if(!id)return {ok:false,error:'ID pembayaran wajib diisi.'};
  const ss=sppPutriEnsureSheet_(), pay=ss.getSheetByName(SPP_PUTRI_SHEETS.PAYMENTS), p=pay.getDataRange().getValues(), h=p[0].map(String), col=k=>h.indexOf(k);
  const i=p.findIndex((r,n)=>n>0&&String(r[col('idPembayaran')])===id);
  if(i<1)return {ok:false,error:'Pembayaran tidak ditemukan.'};
  if(String(p[i][col('status')])!==SPP_PUTRI_STATUS.PENDING)return {ok:false,error:'Pembayaran bukan dalam status menunggu verifikasi.'};
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try {
    pay.getRange(i+1,col('tanggalVerifikasi')+1).setValue(new Date());pay.getRange(i+1,col('status')+1).setValue(status);pay.getRange(i+1,col('catatan')+1).setValue(note);pay.getRange(i+1,col('diverifikasiOleh')+1).setValue(who);
    const bills=ss.getSheetByName(SPP_PUTRI_SHEETS.BILLING), b=bills.getDataRange().getValues(), bh=b[0].map(String), payCol=bh.indexOf('idPembayaran'), statusCol=bh.indexOf('status'), dateCol=bh.indexOf('diubahPada');
    for(let n=1;n<b.length;n++)if(String(b[n][payCol])===id){bills.getRange(n+1,statusCol+1).setValue(status);bills.getRange(n+1,dateCol+1).setValue(new Date());}
  } finally {lock.releaseLock();}
  return {ok:true,status:status,message:status===SPP_PUTRI_STATUS.PAID?'Pembayaran disahkan dan tagihan menjadi lunas.':'Pembayaran ditolak; tagihan dapat diajukan kembali.'};
}
