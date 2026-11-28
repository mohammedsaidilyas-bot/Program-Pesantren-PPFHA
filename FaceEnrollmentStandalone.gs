/** Standalone Apps Script Web App for face enrollment.
 * IMPORTANT: paste this file into a NEW Apps Script project (not the main schedule project).
 * Set Script Property FACE_API_KEY in this project, then deploy as Web App.
 */
const FACE_STANDALONE_SHEET_ID='1JdBEnLlJHeIlb8XI8OoqzxTj84wYGkU2Hr0ySq6p6gA';
const FACE_STANDALONE_TAB='FaceDescriptors';
const FACE_STANDALONE_HEADERS=['nis','descriptor','consent','consentAt','updatedAt'];

function doGet(e){
  const action=String(e&&e.parameter&&e.parameter.action||'health').toLowerCase();
  if(action==='facelist'){
    try{return faceStandaloneJson_({ok:true,data:faceStandaloneRead_()});}
    catch(err){return faceStandaloneJson_({ok:false,error:String(err&&err.message||err)});}
  }
  return faceStandaloneJson_({ok:true,app:'FaceEnrollmentStandalone',message:'Endpoint khusus wajah aktif',actions:['facelist','faceenroll','facedelete']});
}
function doPost(e){
  try{
    const b=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
    const key=PropertiesService.getScriptProperties().getProperty('FACE_API_KEY');
    if(!key||!b.apiKey||!faceStandaloneCompare_(String(b.apiKey),key))return faceStandaloneJson_({ok:false,error:'Kunci API tidak valid.'});
    const action=String(b.action||'').toLowerCase(),d=b.data||b,nis=String(d.nis||b.nis||'').replace(/\D/g,'');
    if(action==='facelist')return faceStandaloneJson_({ok:true,data:faceStandaloneRead_()});
    if(action==='faceenroll'){
      if(!nis||nis.length>20||d.consent!==true||!d.consentAt)return faceStandaloneJson_({ok:false,error:'NIS atau persetujuan tidak valid.'});
      const descriptor=d.descriptor;
      if(!Array.isArray(descriptor)||descriptor.length!==128||descriptor.some(v=>!Number.isFinite(Number(v))))return faceStandaloneJson_({ok:false,error:'Descriptor harus 128 angka valid.'});
      const lock=LockService.getScriptLock();lock.waitLock(15000);
      try{
        const sh=faceStandaloneSheet_(),rows=faceStandaloneRead_(),idx=rows.findIndex(r=>r.nis===nis);
        const row=[nis,JSON.stringify(descriptor.map(Number)),true,String(d.consentAt),new Date()];
        if(idx>=0)sh.getRange(idx+2,1,1,5).setValues([row]);else sh.appendRow(row);
        SpreadsheetApp.flush();return faceStandaloneJson_({ok:true,message:'Descriptor disimpan.',nis});
      }finally{lock.releaseLock();}
    }
    if(action==='facedelete'){
      if(!nis)return faceStandaloneJson_({ok:false,error:'NIS wajib diisi.'});
      const lock=LockService.getScriptLock();lock.waitLock(15000);
      try{const sh=faceStandaloneSheet_(),rows=faceStandaloneRead_(),idx=rows.findIndex(r=>r.nis===nis);if(idx<0)return faceStandaloneJson_({ok:true,deleted:false});sh.deleteRow(idx+2);SpreadsheetApp.flush();return faceStandaloneJson_({ok:true,deleted:true});}
      finally{lock.releaseLock();}
    }
    return faceStandaloneJson_({ok:false,error:'Action tidak dikenal.'});
  }catch(err){return faceStandaloneJson_({ok:false,error:String(err&&err.message||err)});}
}
function faceStandaloneSheet_(){
  const ss=SpreadsheetApp.openById(FACE_STANDALONE_SHEET_ID);let sh=ss.getSheetByName(FACE_STANDALONE_TAB);
  if(!sh){sh=ss.insertSheet(FACE_STANDALONE_TAB);sh.getRange(1,1,1,5).setValues([FACE_STANDALONE_HEADERS]);sh.setFrozenRows(1);}
  return sh;
}
function faceStandaloneRead_(){
  const sh=faceStandaloneSheet_();if(sh.getLastRow()<2)return[];
  return sh.getRange(2,1,sh.getLastRow()-1,5).getValues().filter(r=>String(r[0]).trim()).map(r=>({nis:String(r[0]).trim(),descriptor:JSON.parse(String(r[1]||'[]'))}));
}
function faceStandaloneJson_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function faceStandaloneCompare_(a,b){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
