/** Perpanjangan izin pulang, terpisah dari modul absensi. */
function ppfhaPerpanjangIzin_(body){
 const id=String(body.id||'').trim(),alasan=String(body.alasan||'').trim(),baru=String(body.rencanaKembali||'').trim();
 if(!id||!alasan||!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(baru))return {ok:false,error:'ID, alasan dan tanggal/jam baru wajib diisi.'};
 const tz='Asia/Jakarta',date=new Date(baru+':00+07:00');
 if(isNaN(date.getTime())||date.getTime()<=Date.now())return {ok:false,error:'Batas baru harus di masa mendatang.'};
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID),sh=ss.getSheetByName('Izin');
  if(!sh)return {ok:false,error:'Sheet Izin tidak ada.'};
  const data=sh.getDataRange().getValues(),h=data[0].map(String);
  const ix=n=>h.indexOf(n),i= data.findIndex((r,j)=>j>0&&String(r[ix('id')])===id);
  if(i<1)return {ok:false,error:'Izin tidak ditemukan.'};
  const row=data[i],status=String(row[ix('status')]||'').toLowerCase(),jenis=String(row[ix('jenis')]||'').toLowerCase();
  if(/kembali|sehat|tolak|batal/.test(status)||row[ix('kembali')])return {ok:false,error:'Izin sudah selesai.'};
  if(!/pulang|keluarga|berobat|keluar/.test(jenis)||jenis==='izin sakit')return {ok:false,error:'Hanya izin pulang/keluar dengan batas kembali yang dapat diperpanjang.'};
  const old=row[ix('rencanaKembali')];if(!old)return {ok:false,error:'Batas izin lama tidak tersedia.'};
  const oldDate=old instanceof Date?old:new Date(old);
  if(!isNaN(oldDate.getTime())&&date.getTime()<=oldDate.getTime())return {ok:false,error:'Batas baru harus setelah batas lama.'};
  let log=ss.getSheetByName('RiwayatPerpanjanganIzin');
  if(!log){log=ss.insertSheet('RiwayatPerpanjanganIzin');log.appendRow(['idIzin','nis','nama','batasLama','batasBaru','alasan','dicatatPada']);}
  log.appendRow([id,row[ix('nis')],row[ix('nama')],old,date,alasan,new Date()]);
  sh.getRange(i+1,ix('rencanaKembali')+1).setValue(date);
  return {ok:true,message:'Perpanjangan izin berhasil disimpan.',batasBaru:Utilities.formatDate(date,tz,'yyyy-MM-dd HH:mm')};
 }finally{lock.releaseLock();}
}
