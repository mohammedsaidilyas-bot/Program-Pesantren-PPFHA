/**
 * HANDLER KHUSUS FaceDescriptor (nama unik, tidak bentrok Code.gs utama).
 * Fungsi ini tidak otomatis menjadi endpoint Web App.
 * Untuk endpoint, gunakan dispatcher dari doPost/doGet utama,
 * atau deploy project terpisah yang memiliki handler doPost/doGet standar.
 */
function doPostFaceDescriptor(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = String(body.action || '').toLowerCase();
    const key = PropertiesService.getScriptProperties().getProperty('FACE_API_KEY');
    if (!key || !body.apiKey || !faceStandaloneConstantTime_(String(body.apiKey), key))
      return faceStandaloneOutput_({ok:false,error:'Akses ditolak.'});
    const data = body.data || {};
    if (action === 'facelist') return faceStandaloneOutput_({ok:true,data:faceDbConnectorList_()});
    if (action === 'faceenroll') return faceStandaloneOutput_(faceDbConnectorSave_(data));
    if (action === 'facedelete') return faceStandaloneOutput_(faceDbConnectorDelete_(data.nis || body.nis));
    return faceStandaloneOutput_({ok:false,error:'Action tidak dikenal.'});
  } catch (err) {
    return faceStandaloneOutput_({ok:false,error:String(err && err.message || err)});
  }
}
function doGetFaceDescriptor() {
  return faceStandaloneOutput_({ok:true,message:'FaceDescriptor handler aktif.'});
}
function faceStandaloneOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function faceStandaloneConstantTime_(a,b) {
  if (a.length !== b.length) return false;
  let diff=0; for (let i=0;i<a.length;i++) diff |= a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
