/** Upload foto bukti transfer PUTRI ke Google Drive. */
function sppPutriUploadProof_(data) {
 const nis=String(data.nis||'').replace(/\D/g,'');
 const name=String(data.fileName||'bukti-transfer').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100);
 const mime=String(data.mimeType||'').toLowerCase(), raw=String(data.base64||'').replace(/^data:[^;]+;base64,/,'');
 if(!nis||!raw)return {ok:false,error:'Data santri atau foto bukti kosong.'};
 if(!['image/jpeg','image/png','image/webp'].includes(mime))return {ok:false,error:'Format foto harus JPG, PNG, atau WEBP.'};
 if(raw.length>5600000)return {ok:false,error:'Ukuran foto maksimal 4 MB.'};
 try {
  const bytes=Utilities.base64Decode(raw);
  if(bytes.length>4*1024*1024)return {ok:false,error:'Ukuran foto maksimal 4 MB.'};
  const props=PropertiesService.getScriptProperties(), folderId=props.getProperty('SPP_PUTRI_PROOF_FOLDER_ID');
  const folder=folderId?DriveApp.getFolderById(folderId):DriveApp.createFolder('SPP_PUTRI_Bukti_Transfer');
  if(!folderId)props.setProperty('SPP_PUTRI_PROOF_FOLDER_ID',folder.getId());
  const file=folder.createFile(Utilities.newBlob(bytes,mime,'PUTRI_'+nis+'_'+Date.now()+'_'+name));
  return {ok:true,url:file.getUrl(),message:'Foto bukti berhasil diunggah.'};
 } catch(err) {return {ok:false,error:'Gagal menyimpan foto ke Google Drive: '+err.message};}
}

/** Pembayaran transfer menunggu verifikasi; tunai juga tercatat sebagai menunggu konfirmasi bendahara. */
function sppPutriSubmitPayment_(data) {
  const nis=String(data.nis||'').trim().replace(/\D/g,''), ids=Array.isArray(data.tagihanIds)?data.tagihanIds.map(String):[];
  const method=String(data.metode||'').toLowerCase(), proof=String(data.referensiBukti||'').trim();
  if(!nis||!ids.length)return {ok:false,error:'Santri dan tagihan wajib dipilih.'};
  if(!['transfer','tunai'].includes(method))return {ok:false,error:'Metode pembayaran tidak valid.'};
  if(method==='transfer'&&!proof)return {ok:false,error:'Bukti transfer wajib dilampirkan.'};
  const ss=sppPutriEnsureSheet_(), bills=ss.getSheetByName(SPP_PUTRI_SHEETS.BILLING), values=bills.getDataRange().getValues(), headers=values[0].map(String);
  const ix=k=>headers.indexOf(k), selected=values.slice(1).map((r,i)=>({r:r,row:i+2})).filter(x=>ids.includes(String(x.r[ix('idTagihan')]))&&String(x.r[ix('nis')])===nis);
  if(selected.length!==ids.length)return {ok:false,error:'Sebagian tagihan tidak ditemukan atau bukan milik NIS tersebut.'};
  if(selected.some(x=>String(x.r[ix('status')])===SPP_PUTRI_STATUS.PAID||String(x.r[ix('status')])===SPP_PUTRI_STATUS.PENDING))return {ok:false,error:'Ada tagihan yang sudah lunas atau sedang menunggu verifikasi.'};
  const total=selected.reduce((s,x)=>s+Number(x.r[ix('nominal')]||0),0), first=selected[0].r;
  const payId=Utilities.getUuid(), pay=ss.getSheetByName(SPP_PUTRI_SHEETS.PAYMENTS), now=new Date();
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try {
    pay.appendRow([payId,now,'',nis,String(first[ix('nama')]),String(first[ix('kelas')]),selected.map(x=>String(x.r[ix('periode')])).join(', '),total,method,SPP_PUTRI_STATUS.PENDING,proof,'','']);
    selected.forEach(x=>{bills.getRange(x.row,ix('status')+1).setValue(SPP_PUTRI_STATUS.PENDING);bills.getRange(x.row,ix('idPembayaran')+1).setValue(payId);bills.getRange(x.row,ix('diubahPada')+1).setValue(now);});
  } finally {lock.releaseLock();}
  return {ok:true,idPembayaran:payId,total:total,status:SPP_PUTRI_STATUS.PENDING,message:'Pembayaran tercatat dan menunggu verifikasi bendahara.'};
}
