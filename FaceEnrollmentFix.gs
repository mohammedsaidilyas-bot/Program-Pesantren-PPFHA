/** FaceEnrollmentFix.gs — helper khusus fitur pendaftaran wajah.
 * Handler dibuat bernama unik agar tidak bentrok dengan doGet/doPost utama.
 * Script Property FACE_API_KEY wajib diset.
 */
const FACE_FIX_SHEET_ID='1JdBEnLlJHeIlb8XI8OoqzxTj84wYGkU2Hr0ySq6p6gA';
const FACE_FIX_TAB='FaceDescriptors';
const FACE_FIX_HEADERS=['nis','descriptor','consent','consentAt','updatedAt'];

function faceFixGet(e){
 return faceFixJson_({ok:true,app:'FaceEnrollmentFix',message:'Helper aktif',actions:['facelist','faceenroll','facedelete']});
}
function faceFixPost(e){
 try{
  const b=JSON.parse((e&&e.postData&&e.postData.contents)||'{}'),a=String(b.action||'').toLowerCase(),k=PropertiesService.getScriptProperties().getProperty('FACE_API_KEY');
  if(!k||!b.apiKey||!faceFixCompare_(String(b.apiKey),k))return faceFixJson_({ok:false,error:'Kunci API tidak valid.'});
  const sh=faceFixSheet_(),rows=faceFixRows_(sh),d=b.data||b,n=String(d.nis||b.nis||'').replace(/\\D/g,'').trim();
  if(a==='facelist')return faceFixJson_({ok:true,data:rows});
  if(a==='faceenroll'){
   if(!n||n.length>20||d.consent!==true||!d.consentAt)return faceFixJson_({ok:false,error:'NIS atau persetujuan tidak valid.'});
   const v=d.descriptor;if(!Array.isArray(v)||v.length!==128||v.some(x=>!Number.isFinite(Number(x))))return faceFixJson_({ok:false,error:'Descriptor harus 128 angka.'});
   const i=rows.findIndex(r=>r.nis===n),row=[n,JSON.stringify(v.map(Number)),true,String(d.consentAt),new Date()];
   if(i>=0)sh.getRange(i+2,1,1,5).setValues([row]);else sh.appendRow(row);SpreadsheetApp.flush();return faceFixJson_({ok:true,message:'Descriptor disimpan.'});
  }
  if(a==='facedelete'){const i=rows.findIndex(r=>r.nis===n);if(i<0)return faceFixJson_({ok:true,deleted:false});sh.deleteRow(i+2);SpreadsheetApp.flush();return faceFixJson_({ok:true,deleted:true});}
  return faceFixJson_({ok:false,error:'Action tidak dikenal.'});
 }catch(x){return faceFixJson_({ok:false,error:String(x&&x.message||x)});}
}
function faceFixSheet_(){const s=SpreadsheetApp.openById(FACE_FIX_SHEET_ID);let h=s.getSheetByName(FACE_FIX_TAB);if(!h){h=s.insertSheet(FACE_FIX_TAB);h.getRange(1,1,1,5).setValues([FACE_FIX_HEADERS]);h.setFrozenRows(1);}return h;}
function faceFixRows_(h){if(h.getLastRow()<2)return[];return h.getRange(2,1,h.getLastRow()-1,5).getValues().filter(r=>String(r[0]).trim()).map(r=>({nis:String(r[0]).trim(),descriptor:JSON.parse(String(r[1]||'[]'))}));}
function faceFixJson_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function faceFixCompare_(a,b){if(a.length!==b.length)return false;let z=0;for(let i=0;i<a.length;i++)z|=a.charCodeAt(i)^b.charCodeAt(i);return z===0;}
