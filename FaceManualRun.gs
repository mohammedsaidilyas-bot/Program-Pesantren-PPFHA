/** Manual batch importer. Paste JSON array into FaceSyncImport!A2, then Run faceManualImportRun(). */
const FACE_MANUAL_ID='1JdBEnLlJHeIlb8XI8OoqzxTj84wYGkU2Hr0ySq6p6gA';
function faceManualImportRun(){
 const ss=SpreadsheetApp.openById(FACE_MANUAL_ID);let src=ss.getSheetByName('FaceSyncImport');
 if(!src){src=ss.insertSheet('FaceSyncImport');src.getRange('A1').setValue('Paste JSON records into A2');}
 const raw=String(src.getRange('A2').getValue()||'').trim();if(!raw)throw new Error('Paste JSON into FaceSyncImport!A2 first.');
 let records;try{records=JSON.parse(raw);}catch(e){throw new Error('Invalid JSON: '+e.message);}if(!Array.isArray(records))throw new Error('JSON must be an array.');
 let sh=ss.getSheetByName('FaceDescriptors');if(!sh){sh=ss.insertSheet('FaceDescriptors');sh.appendRow(['nis','descriptor','consent','consentAt','updatedAt']);}
 const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,5).getValues():[],map=new Map(rows.map((r,i)=>[String(r[0]).replace(/\\D/g,'').trim(),i+2]));
 let inserted=0,updated=0,skipped=0,errors=[];const lock=LockService.getScriptLock();lock.waitLock(15000);
 try{records.forEach((r,i)=>{try{const nis=String(r.nis||'').replace(/\\D/g,'').trim(),d=r.descriptor;if(!nis||!Array.isArray(d)||d.length!==128||d.some(v=>!isFinite(Number(v)))||r.consent!==true)throw new Error('Invalid NIS/descriptor or consent');const row=[nis,JSON.stringify(d.map(Number)),true,String(r.consentAt||new Date().toISOString()),new Date()];if(map.has(nis)){sh.getRange(map.get(nis),1,1,5).setValues([row]);updated++;}else{sh.appendRow(row);map.set(nis,sh.getLastRow());inserted++;}}catch(e){skipped++;errors.push('Record '+(i+1)+': '+e.message);}});SpreadsheetApp.flush();}finally{lock.releaseLock();}
 const out={ok:true,total:records.length,inserted,updated,skipped,errors};Logger.log(JSON.stringify(out));return JSON.stringify(out);
}