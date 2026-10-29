/**
 * Program Pesantren PPFHA — Google Apps Script backend.
 * Data lama tidak dihapus. Endpoint tulis dilindungi Script Property ADMIN_API_KEY.
 * Perubahan kode tidak dapat memperbaiki OAuth Google invalid_client.
 */
const SPREADSHEET_ID = '1JdBEnLlJHeIlb8XI8OoqzxTj84wYGkU2Hr0ySq6p6gA';
const STUDENT_DB_ID = '1JmWFYwHcXGTEauL-t9bqNGPtnH_L1dlkmqJFwCPtvyo';
const STUDENT_SHEET_NAME = 'Uang Jajan Santri PPFHA';
const HEADERS = {
  Izin: ['id','dibuatPada','nis','nama','jenis','status','keluar','rencanaKembali','kembali','wali','catatan','terbit'],
  Pengumuman: ['id','dibuatPada','judul','kategori','tanggal','target','nisTarget','isi','status'],
  Kegiatan: ['id','dibuatPada','judul','lokasi','tanggal','waktu','isi','status']
};
const ACTION_TO_SHEET = { izin:'Izin', pengumuman:'Pengumuman', kegiatan:'Kegiatan' };

function setupDatabase() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID), hasil = [];
    Object.keys(HEADERS).forEach(function(name) {
      let sh = ss.getSheetByName(name);
      if (!sh) { sh = ss.insertSheet(name); hasil.push('Tab '+name+' dibuat'); }
      if (sh.getLastRow() === 0) {
        sh.getRange(1,1,1,HEADERS[name].length).setValues([HEADERS[name]]);
        sh.setFrozenRows(1); hasil.push('Header '+name+' ditambahkan');
      } else hasil.push('Tab '+name+' sudah berisi; tidak diubah');
    });
    const msg = 'Selesai. '+hasil.join('. ')+'.'; Logger.log(msg); return msg;
  } catch(err) { const msg = explainError_(err); Logger.log(msg); throw new Error(msg); }
}

function testDatabase() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const result = {ok:true,app:'Program Pesantren PPFHA',spreadsheet:ss.getName(),spreadsheetId:ss.getId(),
      tabs:ss.getSheets().map(function(sh){return {name:sh.getName(),rows:sh.getLastRow(),columns:sh.getLastColumn()};})};
    Logger.log(JSON.stringify(result)); return JSON.stringify(result);
  } catch(err) { const result={ok:false,error:explainError_(err)}; Logger.log(JSON.stringify(result)); return JSON.stringify(result); }
}

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'health').toLowerCase();
    if (action === 'health') return output_({ok:true,app:'Program Pesantren PPFHA',message:'Endpoint aktif',actions:['izin','pengumuman','kegiatan','student']});
    if (action === 'student') {
      const nis = String((e && e.parameter && e.parameter.nis) || '').trim().replace(/\\D/g, '');
      if (!nis) return output_({ok:false,error:'NIS wajib diisi.'});
      const studentSS = SpreadsheetApp.openById(STUDENT_DB_ID);
      const studentSheet = studentSS.getSheetByName(STUDENT_SHEET_NAME);
      if (!studentSheet) return output_({ok:false,error:'Tab database Uang Jajan Santri PPFHA tidak ditemukan.'});
      const rows = studentSheet.getDataRange().getDisplayValues();
      const row = rows.slice(1).find(function(r){ return String(r[0] || '').trim().replace(/\\D/g, '') === nis; });
      if (!row) return output_({ok:false,error:'NIS '+nis+' tidak ditemukan di database santri.'});
      if (String(row[7] || '').trim().toLowerCase() !== 'aktif') return output_({ok:false,error:'Santri '+nis+' tidak berstatus aktif.'});
      return output_({ok:true,data:{nis:String(row[0]||'').trim(),nama:String(row[1]||'').trim(),kelas:String(row[2]||'').trim(),asrama:String(row[3]||'').trim(),wali:String(row[4]||'').trim(),noWaWali:String(row[5]||'').trim(),status:String(row[7]||'').trim()}});
    }
    const name = ACTION_TO_SHEET[action];
    if (!name) return output_({ok:false,error:'Aksi tidak dikenal: '+action});
    const sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
    if (!sh) return output_({ok:false,error:'Tab '+name+' belum tersedia. Siapkan database terlebih dahulu.'});
    const values = sh.getDataRange().getValues();
    if (values.length < 2) return output_({ok:true,data:[]});
    const headers = values[0].map(function(h){return String(h).trim();});
    const data = values.slice(1).filter(function(row){return row.some(function(v){return v!=='' && v!==null;});})
      .map(function(row){const item={}; headers.forEach(function(k,i){if(k){const v=row[i];item[k]=v instanceof Date?v.toISOString():v;}});return item;})
      .filter(function(item){return String(item.status||'').toLowerCase()!=='draf';});
    return output_({ok:true,data:data});
  } catch(err) { return output_({ok:false,error:explainError_(err)}); }
}

/** POST JSON: {action:"izin|pengumuman|kegiatan",apiKey:"...",data:{...}} */
function doPost(e) {
  try {
    const body = parseBody_(e);
    const savedKey = PropertiesService.getScriptProperties().getProperty('ADMIN_API_KEY');
    if (!savedKey) return output_({ok:false,error:'ADMIN_API_KEY belum disetel di Script Properties; penulisan dinonaktifkan.'});
    if (!body.apiKey || !constantTimeEquals_(String(body.apiKey),savedKey))
      return output_({ok:false,error:'Akses ditolak: kunci pengurus tidak valid.'});
    const action = String(body.action||'').toLowerCase(), name = ACTION_TO_SHEET[action], input = body.data;
    if (!name) return output_({ok:false,error:'Aksi tidak dikenal. Gunakan izin, pengumuman, atau kegiatan.'});
    if (!input || typeof input!=='object' || Array.isArray(input)) return output_({ok:false,error:'data harus berupa objek JSON.'});
    const required = {izin:['nis','nama','jenis'],pengumuman:['judul','isi'],kegiatan:['judul','tanggal']}[action];
    const missing = required.filter(function(k){return input[k]===undefined || input[k]===null || String(input[k]).trim()==='';});
    if (missing.length) return output_({ok:false,error:'Kolom wajib belum diisi: '+missing.join(', ')});
    const ss=SpreadsheetApp.openById(SPREADSHEET_ID); let sh=ss.getSheetByName(name);
    if (!sh) { sh=ss.insertSheet(name); sh.getRange(1,1,1,HEADERS[name].length).setValues([HEADERS[name]]); sh.setFrozenRows(1); }
    else if (sh.getLastRow()===0) { sh.getRange(1,1,1,HEADERS[name].length).setValues([HEADERS[name]]); sh.setFrozenRows(1); }
    const record=Object.assign({},input);
    record.id=record.id||Utilities.getUuid(); record.dibuatPada=record.dibuatPada||new Date().toISOString();
    sh.appendRow(HEADERS[name].map(function(k){return record[k]===undefined||record[k]===null?'':record[k];}));
    return output_({ok:true,message:'Data berhasil disimpan.',id:record.id,action:action});
  } catch(err) { return output_({ok:false,error:explainError_(err)}); }
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error('Body permintaan kosong. Kirim JSON melalui POST.');
  try { return JSON.parse(e.postData.contents); } catch(err) { throw new Error('Format body tidak valid. Gunakan JSON yang benar.'); }
}
function output_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function constantTimeEquals_(a,b) {
  if(a.length!==b.length)return false; let diff=0;
  for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
function explainError_(err) {
  const message=String(err&&err.message?err.message:err);
  if(/invalid_client|OAuth|authorization|otorisasi/i.test(message))
    return 'Otorisasi Google gagal: '+message+'. Ini bukan kesalahan isi spreadsheet. Periksa konfigurasi OAuth/proyek Google Cloud dan izin akun Apps Script.';
  if(/permission|access denied|not have permission/i.test(message))
    return 'Akun yang menjalankan Apps Script belum memiliki izin ke spreadsheet. Pastikan spreadsheet dapat diakses oleh akun tersebut. Detail: '+message;
  return message;
}
