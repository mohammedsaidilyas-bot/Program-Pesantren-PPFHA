/** FaceDatabaseConnector.gs
 * Modul khusus penyimpanan descriptor wajah ke Google Sheet.
 * Tidak mendefinisikan doGet/doPost dan tidak mengubah handler utama.
 * Fungsi ini baru digunakan setelah handler yang sudah ada mendelegasikan ke modul ini.
 */
const FACE_DB_CONNECTOR_SHEET_ID = '1JdBEnLlJHeIlb8XI8OoqzxTj84wYGkU2Hr0ySq6p6gA';
const FACE_DB_CONNECTOR_TAB = 'FaceDescriptors';
const FACE_DB_CONNECTOR_HEADERS = ['nis','descriptor','consent','consentAt','updatedAt'];

function faceDbConnectorGetSheet_() {
  const ss = SpreadsheetApp.openById(FACE_DB_CONNECTOR_SHEET_ID);
  let sh = ss.getSheetByName(FACE_DB_CONNECTOR_TAB);
  if (!sh) {
    sh = ss.insertSheet(FACE_DB_CONNECTOR_TAB);
    sh.getRange(1,1,1,FACE_DB_CONNECTOR_HEADERS.length).setValues([FACE_DB_CONNECTOR_HEADERS]);
    sh.setFrozenRows(1);
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1,1,1,FACE_DB_CONNECTOR_HEADERS.length).setValues([FACE_DB_CONNECTOR_HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function faceDbConnectorNormalizeNis_(value) {
  return String(value == null ? '' : value).trim().replace(/\D/g,'');
}

function faceDbConnectorList_() {
  const sh = faceDbConnectorGetSheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const rows = sh.getRange(2,1,last-1,FACE_DB_CONNECTOR_HEADERS.length).getValues();
  return rows.filter(r=>String(r[0]||'').trim()).map(r=>{
    let descriptor;
    try { descriptor=JSON.parse(String(r[1]||'[]')); }
    catch(e) { throw new Error('Descriptor rusak pada NIS '+r[0]); }
    if (!Array.isArray(descriptor)||descriptor.length!==128) throw new Error('Descriptor tidak valid pada NIS '+r[0]);
    return {nis:String(r[0]).trim(),descriptor:descriptor.map(Number)};
  });
}

function faceDbConnectorSave_(data) {
  data=data||{};
  const nis=faceDbConnectorNormalizeNis_(data.nis);
  const descriptor=data.descriptor;
  if (!nis || nis.length>20) throw new Error('NIS tidak valid.');
  if (data.consent!==true || !data.consentAt) throw new Error('Persetujuan dan waktu persetujuan wajib.');
  if (!Array.isArray(descriptor)||descriptor.length!==128||descriptor.some(v=>!isFinite(Number(v)))) throw new Error('Descriptor wajah harus berisi 128 angka valid.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try {
    const sh=faceDbConnectorGetSheet_();
    const last=sh.getLastRow(), rows=last>1?sh.getRange(2,1,last-1,FACE_DB_CONNECTOR_HEADERS.length).getValues():[];
    const index=rows.findIndex(r=>faceDbConnectorNormalizeNis_(r[0])===nis);
    const row=[nis,JSON.stringify(descriptor.map(Number)),true,String(data.consentAt),new Date()];
    if(index>=0) sh.getRange(index+2,1,1,row.length).setValues([row]);
    else sh.appendRow(row);
    SpreadsheetApp.flush();
    return {ok:true,nis:nis,updated:index>=0,message:index>=0?'Data wajah NIS diperbarui.':'Data wajah NIS disimpan.'};
  } finally { lock.releaseLock(); }
}

function faceDbConnectorDelete_(nisValue) {
  const nis=faceDbConnectorNormalizeNis_(nisValue);
  if(!nis) throw new Error('NIS tidak valid.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try {
    const sh=faceDbConnectorGetSheet_(),last=sh.getLastRow();
    if(last<2)return {ok:true,deleted:false,message:'Data tidak ditemukan.'};
    const rows=sh.getRange(2,1,last-1,FACE_DB_CONNECTOR_HEADERS.length).getValues();
    const index=rows.findIndex(r=>faceDbConnectorNormalizeNis_(r[0])===nis);
    if(index<0)return {ok:true,deleted:false,message:'Data tidak ditemukan.'};
    sh.deleteRow(index+2);SpreadsheetApp.flush();
    return {ok:true,deleted:true,message:'Data wajah dihapus.'};
  } finally {lock.releaseLock();}
}

/** Tes baca database (tidak mengubah data). Jalankan dari Apps Script editor. */
function faceDbConnectorTestRead() {
  const result={ok:true,spreadsheetId:FACE_DB_CONNECTOR_SHEET_ID,tab:FACE_DB_CONNECTOR_TAB,count:faceDbConnectorList_().length};
  Logger.log(JSON.stringify(result));return JSON.stringify(result);
}
