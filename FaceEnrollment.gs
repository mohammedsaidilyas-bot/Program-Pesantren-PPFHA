/** FaceEnrollment.gs — isolated face-descriptor storage handlers.
 * Invoked from the authenticated doPost in Code.gs. Do not bypass its API-key guard.
 * Stores descriptors only, not raw images.
 */
function handleFaceEnrollment_(body, action) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const headers = ['nis','descriptor','consent','consentAt','updatedAt'];
  let sh = ss.getSheetByName('FaceDescriptors');
  if (!sh) { sh=ss.insertSheet('FaceDescriptors'); sh.getRange(1,1,1,headers.length).setValues([headers]); sh.setFrozenRows(1); }
  if (sh.getLastRow()===0) { sh.getRange(1,1,1,headers.length).setValues([headers]); sh.setFrozenRows(1); }
  const lock=LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues():[];
    if (action==='facelist') {
      const data=rows.filter(r=>String(r[0]||'').trim()).map(r=>({nis:String(r[0]),descriptor:JSON.parse(String(r[1]||'[]'))}));
      return output_({ok:true,data:data});
    }
    const nis=String((body.data&&body.data.nis)||body.nis||'').trim().replace(/\\D/g,'');
    if (!nis || nis.length>20) return output_({ok:false,error:'NIS tidak valid.'});
    if (action==='faceenroll') {
      const x=body.data||{}, descriptor=x.descriptor;
      if (x.consent!==true || !x.consentAt) return output_({ok:false,error:'Persetujuan eksplisit dan waktu persetujuan wajib dicatat sebelum pendaftaran biometrik.'});
      if (!Array.isArray(descriptor)||descriptor.length!==128||descriptor.some(v=>!isFinite(Number(v)))) return output_({ok:false,error:'Descriptor wajah tidak valid.'});
      const existing=rows.findIndex(r=>String(r[0]).trim()===nis);
      const row=[nis,JSON.stringify(descriptor.map(Number)),true,String(x.consentAt),new Date()];
      if(existing>=0) sh.getRange(existing+2,1,1,headers.length).setValues([row]);
      else sh.appendRow(row);
      return output_({ok:true,message:'Descriptor wajah tersimpan terpusat untuk NIS '+nis+'.'});
    }
    const idx=rows.findIndex(r=>String(r[0]).trim()===nis);
    if(idx<0)return output_({ok:true,deleted:false,message:'Pendaftaran wajah tidak ditemukan.'});
    sh.deleteRow(idx+2); return output_({ok:true,deleted:true,message:'Descriptor wajah dihapus.'});
  } finally { lock.releaseLock(); }
}
