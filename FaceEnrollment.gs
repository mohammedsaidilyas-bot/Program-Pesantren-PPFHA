/** FaceEnrollment.gs — backend TERPISAH khusus descriptor wajah.
 * Project ini berdiri sendiri; tidak bergantung pada Code.gs utama.
 * Sebelum deploy, set Script Property FACE_API_KEY dengan kunci rahasia.
 * Descriptor sensitif; persetujuan sukarela dan alternatif KTS harus tetap tersedia.
 */
const FACE_DB_SPREADSHEET_ID = '1JdBEnLlJHeIlb8XI8OoqzxTj84wYGkU2Hr0ySq6p6gA';
const FACE_SHEET_NAME = 'FaceDescriptors';

function faceOutput_(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function doPost(e){
 try{
  const body=JSON.parse(e.postData.contents||'{}');
  const key=PropertiesService.getScriptProperties().getProperty('FACE_API_KEY');
  if(!key||!body.apiKey||body.apiKey!==key)return faceOutput_({ok:false,error:'Akses ditolak.'});
  const action=String(body.action||'').toLowerCase(),x=body.data||{};
  if(!['faceenroll','facelist','facedelete'].includes(action))return faceOutput_({ok:false,error:'Aksi tidak dikenal.'});
  const ss=SpreadsheetApp.openById(FACE_DB_SPREADSHEET_ID);
  const headers=['nis','descriptor','consent','consentAt','updatedAt'];
  let sh=ss.getSheetByName(FACE_SHEET_NAME);
  if(!sh){sh=ss.insertSheet(FACE_SHEET_NAME);sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);}
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
   const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues():[];
   if(action==='facelist'){
    const data=rows.filter(r=>String(r[0]||'').trim()).map(r=>({nis:String(r[0]),descriptor:JSON.parse(String(r[1]||'[]'))}));
    return faceOutput_({ok:true,data});
   }
   const nis=String(x.nis||body.nis||'').trim().replace(/\D/g,'');
   if(!nis||nis.length>20)return faceOutput_({ok:false,error:'NIS tidak valid.'});
   if(action==='faceenroll'){
    const d=x.descriptor;
    if(x.consent!==true||!x.consentAt)return faceOutput_({ok:false,error:'Persetujuan dan waktu persetujuan wajib.'});
    if(!Array.isArray(d)||d.length!==128||d.some(v=>!isFinite(Number(v))))return faceOutput_({ok:false,error:'Descriptor tidak valid.'});
    const idx=rows.findIndex(r=>String(r[0]).trim()===nis),row=[nis,JSON.stringify(d.map(Number)),true,String(x.consentAt),new Date()];
    if(idx>=0)sh.getRange(idx+2,1,1,headers.length).setValues([row]);else sh.appendRow(row);
    return faceOutput_({ok:true,message:'Pendaftaran descriptor berhasil disimpan untuk NIS '+nis+'.'});
   }
   const idx=rows.findIndex(r=>String(r[0]).trim()===nis);
   if(idx<0)return faceOutput_({ok:true,deleted:false,message:'Data pendaftaran tidak ditemukan.'});
   sh.deleteRow(idx+2);return faceOutput_({ok:true,deleted:true,message:'Data descriptor dihapus.'});
  }finally{lock.releaseLock();}
 }catch(err){return faceOutput_({ok:false,error:String(err.message||err)});}
}
function doGet(){return faceOutput_({ok:true,message:'Backend pengenalan wajah aktif.'});}
