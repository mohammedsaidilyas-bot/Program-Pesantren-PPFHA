/** FaceEnrollment.gs — handler wajah dengan nama khusus FC.
 * doGetFC/doPostFC tidak menjadi handler Web App otomatis; router utama perlu memanggilnya.
 * Descriptor sensitif: persetujuan sukarela dan alternatif KTS harus tetap tersedia.
 */
const FACE_DB_SPREADSHEET_ID = '1JdBEnLlJHeIlb8XI8OoqzxTj84wYGkU2Hr0ySq6p6gA';
const FACE_SHEET_NAME = 'FaceDescriptors';

function faceOutputFC_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
function doGetFC(e) {
  return faceOutputFC_({ok:true,message:'Handler Face FC aktif. GET ini hanya diagnostik.'});
}
function doPostFC(e) {
  try {
    const body = faceParseFC_(e);
    const action = String(body.action||'').toLowerCase();
    if (!['faceenroll','facelist','facedelete'].includes(action)) return faceOutputFC_({ok:false,error:'Action wajah tidak dikenal.'});
    const savedKey=PropertiesService.getScriptProperties().getProperty('FACE_API_KEY');
    if(!savedKey||!body.apiKey||!faceConstantTimeFC_(String(body.apiKey),savedKey))return faceOutputFC_({ok:false,error:'Akses wajah ditolak.'});
    const x=body.data||body,ss=SpreadsheetApp.openById(FACE_DB_SPREADSHEET_ID);
    const headers=['nis','descriptor','consent','consentAt','updatedAt'];let sh=ss.getSheetByName(FACE_SHEET_NAME);
    if(!sh){sh=ss.insertSheet(FACE_SHEET_NAME);sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);}
    const lock=LockService.getScriptLock();lock.waitLock(15000);
    try {
      const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues():[];
      if(action==='facelist')return faceOutputFC_({ok:true,data:rows.filter(r=>String(r[0]||'').trim()).map(r=>({nis:String(r[0]),descriptor:JSON.parse(String(r[1]||'[]'))}))});
      const nis=String(x.nis||body.nis||'').trim().replace(/\\D/g,'');
      if(!nis||nis.length>20)return faceOutputFC_({ok:false,error:'NIS tidak valid.'});
      if(action==='faceenroll'){
        const d=x.descriptor;if(x.consent!==true||!x.consentAt)return faceOutputFC_({ok:false,error:'Persetujuan dan waktu persetujuan wajib.'});
        if(!Array.isArray(d)||d.length!==128||d.some(v=>!isFinite(Number(v))))return faceOutputFC_({ok:false,error:'Descriptor tidak valid.'});
        const idx=rows.findIndex(r=>String(r[0]).trim()===nis),row=[nis,JSON.stringify(d.map(Number)),true,String(x.consentAt),new Date()];
        if(idx>=0)sh.getRange(idx+2,1,1,headers.length).setValues([row]);else sh.appendRow(row);
        return faceOutputFC_({ok:true,message:'Descriptor wajah tersimpan untuk NIS '+nis+'.'});
      }
      const idx=rows.findIndex(r=>String(r[0]).trim()===nis);if(idx<0)return faceOutputFC_({ok:true,deleted:false,message:'Data descriptor tidak ditemukan.'});
      sh.deleteRow(idx+2);return faceOutputFC_({ok:true,deleted:true,message:'Descriptor wajah dihapus.'});
    } finally {lock.releaseLock();}
  } catch(err) {return faceOutputFC_({ok:false,error:String(err.message||err)});}
}
function faceParseFC_(e) {
  if(!e||!e.postData||!e.postData.contents)return {};
  const raw=e.postData.contents;
  try{return JSON.parse(raw);}catch(_){}
  try{return e.parameter||{};}catch(_){return {};}
}
function faceConstantTimeFC_(a,b) {
  if(a.length!==b.length)return false;let diff=0;
  for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
