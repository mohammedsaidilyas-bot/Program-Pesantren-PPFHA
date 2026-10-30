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
  Kegiatan: ['id','dibuatPada','judul','lokasi','tanggal','waktu','isi','status'],
  JadwalAbsensi: ['activity','session','startTime','onTimeUntil','endTime','days','updatedAt'],
  Absensi: ['tanggal','activity','session','nis','nama','status','waktuScan','dicatatPada','sumber']
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
    installAttendanceTrigger();
    const msg = 'Selesai. '+hasil.join('. ')+'. Pemicu otomatis absensi diperiksa setiap 5 menit.'; Logger.log(msg); return msg;
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
      const nis = String((e && e.parameter && e.parameter.nis) || '').trim().replace(/\D/g, '');
      if (!nis) return output_({ok:false,error:'NIS wajib diisi.'});
      const studentSS = SpreadsheetApp.openById(STUDENT_DB_ID);
      const studentSheet = studentSS.getSheetByName(STUDENT_SHEET_NAME);
      if (!studentSheet) return output_({ok:false,error:'Tab database Uang Jajan Santri PPFHA tidak ditemukan.'});
      const rows = studentSheet.getDataRange().getDisplayValues();
      const row = rows.slice(1).find(function(r){ return String(r[0] || '').trim().replace(/\D/g, '') === nis; });
      if (!row) return output_({ok:false,error:'NIS '+nis+' tidak ditemukan di database santri.'});
      if (String(row[7] || '').trim().toLowerCase() !== 'aktif') return output_({ok:false,error:'Santri '+nis+' tidak berstatus aktif.'});
      return output_({ok:true,data:{nis:String(row[0]||'').trim(),nama:String(row[1]||'').trim(),kelas:String(row[2]||'').trim(),asrama:String(row[3]||'').trim(),wali:String(row[4]||'').trim(),noWaWali:String(row[5]||'').trim(),status:String(row[7]||'').trim()}});
    }
    if (action === 'attendanceconfig') return output_(getAttendanceConfig_(String((e.parameter && e.parameter.session) || 'Subuh')));
    if (action === 'attendancerecords') {
      const savedKey = PropertiesService.getScriptProperties().getProperty('ADMIN_API_KEY');
      const suppliedKey = String((e.parameter && e.parameter.key) || '');
      if (!savedKey || !constantTimeEquals_(suppliedKey, savedKey)) return output_({ok:false,error:'Akses rekap absensi ditolak. Masukkan kunci pengurus.'});
      const date = String((e.parameter && e.parameter.date) || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd'));
      const activity = String((e.parameter && e.parameter.activity) || 'all');
      const result = getAttendanceRecords_(date, activity);
      return output_(result);
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
    const action = String(body.action||'').toLowerCase();
    if (action === 'saveattendanceconfig') return output_(saveAttendanceConfig_(body.data || {}));
    if (action === 'attendancescan') return output_(recordAttendanceScan_(body.data || {}));
    if (action === 'attendancerecords') return output_(getAttendanceRecords_(String(body.date || Utilities.formatDate(new Date(), ATTENDANCE_TZ, 'yyyy-MM-dd')), String(body.activity || 'all')));
    if (action === 'updatestatus') {
      const id = String(body.id || '').trim();
      const status = String(body.status || '').trim();
      const allowed = ['Diizinkan','Menunggu persetujuan','Ditolak','Sudah keluar','Sudah kembali'];
      if (!id) return output_({ok:false,error:'ID izin wajib diisi.'});
      if (allowed.indexOf(status) === -1) return output_({ok:false,error:'Status tidak valid.'});
      const sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Izin');
      if (!sh || sh.getLastRow() < 2) return output_({ok:false,error:'Data izin tidak ditemukan.'});
      const values = sh.getDataRange().getDisplayValues();
      const headers = values[0].map(function(h){return String(h).trim();});
      const idCol = headers.indexOf('id') + 1, statusCol = headers.indexOf('status') + 1, kembaliCol = headers.indexOf('kembali') + 1, catatanCol = headers.indexOf('catatan') + 1;
      if (!idCol || !statusCol) return output_({ok:false,error:'Kolom ID atau status tidak ditemukan.'});
      let rowNumber = -1;
      for (let i = 1; i < values.length; i++) { if (String(values[i][idCol-1]).trim() === id) { rowNumber = i + 1; break; } }
      if (rowNumber < 0) return output_({ok:false,error:'ID izin tidak ditemukan.'});
      sh.getRange(rowNumber,statusCol).setValue(status);
      if (status === 'Sudah kembali' && kembaliCol) sh.getRange(rowNumber,kembaliCol).setValue(body.kembaliAt ? new Date(body.kembaliAt) : new Date());
      if (status === 'Sudah kembali' && catatanCol && body.catatan !== undefined) sh.getRange(rowNumber,catatanCol).setValue(String(body.catatan || ''));
      return output_({ok:true,message:'Status izin berhasil diperbarui.',id:id,status:status});
    }
    const name = ACTION_TO_SHEET[action], input = body.data;
    if (!name) return output_({ok:false,error:'Aksi tidak dikenal. Gunakan izin, pengumuman, kegiatan, atau updateStatus.'});
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


/* ==================== ABSENSI KEGIATAN SANTRI ==================== */
const ATTENDANCE_ACTIVITY_NAMES = {
  jamaah: 'Sholat Berjamaah',
  'kitab-pagi': 'Ngaji Kitab Pagi',
  albab: 'Ngaji Kitab Metode Albab',
  alquran: "Ngaji Al-Qur'an",
  madrasiyah: 'Madrasiyah'
};
const ATTENDANCE_TZ = 'Asia/Jakarta';

function ensureAttendanceSheets_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Object.keys(HEADERS).forEach(function(name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
      sh.setFrozenRows(1);
    }
  });
  return ss;
}

function getAttendanceConfig_(jamaahSession) {
  const ss = ensureAttendanceSheets_();
  const sh = ss.getSheetByName('JadwalAbsensi');
  const rows = sh.getDataRange().getDisplayValues();
  const headers = rows[0].map(function(v){return String(v).trim();});
  const result = {};
  Object.keys(ATTENDANCE_ACTIVITY_NAMES).forEach(function(k) {
    result[k] = {};
  });
  rows.slice(1).forEach(function(row) {
    const item = {};
    headers.forEach(function(h,i){ if(h) item[h] = row[i]; });
    const activity = String(item.activity || '');
    if (!ATTENDANCE_ACTIVITY_NAMES[activity]) return;
    const days = String(item.days || '').split(',').map(function(v){return Number(v);}).filter(function(v){return !isNaN(v);});
    const config = {
      session: String(item.session || (activity === 'jamaah' ? 'Subuh' : 'Utama')),
      startTime: String(item.startTime || ''),
      onTimeUntil: String(item.onTimeUntil || ''),
      endTime: String(item.endTime || ''),
      days: days
    };
    if (activity === 'jamaah') {
      if (config.session === jamaahSession) result[activity] = config;
    } else {
      result[activity] = config;
    }
  });
  return {ok:true,data:result};
}

function saveAttendanceConfig_(data) {
  const activity = String(data.activity || '').trim();
  const session = activity === 'jamaah' ? String(data.session || 'Subuh').trim() : 'Utama';
  const startTime = String(data.startTime || '').trim();
  const onTimeUntil = String(data.onTimeUntil || '').trim();
  const endTime = String(data.endTime || '').trim();
  const days = Array.isArray(data.days) ? data.days.map(Number).filter(function(v){return v >= 0 && v <= 6;}) : [];
  if (!ATTENDANCE_ACTIVITY_NAMES[activity]) return {ok:false,error:'Kegiatan tidak dikenal.'};
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(onTimeUntil) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime))
    return {ok:false,error:'Format jam tidak valid.'};
  if (!(startTime <= onTimeUntil && onTimeUntil <= endTime)) return {ok:false,error:'Urutan jam tidak valid.'};
  if (!days.length) return {ok:false,error:'Pilih minimal satu hari aktif.'};
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const ss = ensureAttendanceSheets_(), sh = ss.getSheetByName('JadwalAbsensi');
    const values = sh.getDataRange().getDisplayValues();
    let rowNumber = 0;
    for (let i=1;i<values.length;i++) {
      if (String(values[i][0]) === activity && String(values[i][1]) === session) { rowNumber=i+1; break; }
    }
    const row = [activity,session,startTime,onTimeUntil,endTime,days.join(','),new Date()];
    if (rowNumber) sh.getRange(rowNumber,1,1,row.length).setValues([row]);
    else sh.appendRow(row);
    return {ok:true,message:'Jadwal absensi tersimpan.',activity:activity,session:session};
  } finally { lock.releaseLock(); }
}

function attendanceStudentRoster_() {
  const ss = SpreadsheetApp.openById(STUDENT_DB_ID);
  const sh = ss.getSheetByName(STUDENT_SHEET_NAME);
  if (!sh || sh.getLastRow() < 2) throw new Error('Database santri uang jajan tidak ditemukan atau masih kosong.');
  const rows = sh.getDataRange().getDisplayValues();
  const headers = rows[0].map(function(v){return String(v).toLowerCase().replace(/[\s_-]/g,'').trim();});
  let nisCol = headers.findIndex(function(h){return ['nis','nissantri','nomorinduksantri','nomorinduk'].indexOf(h)>=0;});
  let nameCol = headers.findIndex(function(h){return ['nama','namasantri','namalengkap'].indexOf(h)>=0;});
  let statusCol = headers.findIndex(function(h){return ['status','statussantri','keaktifan'].indexOf(h)>=0;});
  if (nisCol < 0) nisCol = 0;
  if (nameCol < 0) nameCol = 1;
  if (statusCol < 0) statusCol = 7;
  return rows.slice(1).map(function(row) {
    return {nis:String(row[nisCol] || '').trim().replace(/\D/g,''),nama:String(row[nameCol] || '').trim(),status:String(row[statusCol] || '').trim().toLowerCase()};
  }).filter(function(x){return x.nis && x.nama && x.status === 'aktif';});
}

function attendanceScheduleRows_() {
  const sh = ensureAttendanceSheets_().getSheetByName('JadwalAbsensi');
  if (sh.getLastRow() < 2) return [];
  const rows = sh.getDataRange().getDisplayValues();
  const h = rows[0].map(function(v){return String(v).trim();});
  return rows.slice(1).map(function(row) {
    const o={}; h.forEach(function(k,i){if(k)o[k]=row[i];});
    o.days=String(o.days||'').split(',').map(Number).filter(function(v){return !isNaN(v);});
    return o;
  }).filter(function(x){return ATTENDANCE_ACTIVITY_NAMES[x.activity] && x.startTime && x.endTime;});
}

function attendanceDateString_(date) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return Utilities.formatDate(new Date(date), ATTENDANCE_TZ, 'yyyy-MM-dd');
}

function attendanceExistingKeys_(sh, date) {
  const set = {};
  if (sh.getLastRow() < 2) return set;
  const rows = sh.getDataRange().getDisplayValues();
  for (let i=1;i<rows.length;i++) {
    if (String(rows[i][0]) === date) set[[rows[i][0],rows[i][1],rows[i][2],rows[i][3]].join('|')] = true;
  }
  return set;
}

/** Membuat baris Tidak Hadir untuk seluruh santri aktif setelah batas akhir sesi lewat. */
function processAttendanceDeadlines_(targetDate) {
  const date = attendanceDateString_(targetDate || new Date());
  const now = new Date();
  const today = Utilities.formatDate(now, ATTENDANCE_TZ, 'yyyy-MM-dd');
  const nowTime = Utilities.formatDate(now, ATTENDANCE_TZ, 'HH:mm');
  if (date > today) return {ok:true,created:0};
  const weekday = new Date(date + 'T12:00:00+07:00').getDay();
  const schedules = attendanceScheduleRows_().filter(function(s){return s.days.indexOf(weekday)>=0;});
  const students = attendanceStudentRoster_();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = ensureAttendanceSheets_().getSheetByName('Absensi');
    const existing = attendanceExistingKeys_(sh,date);
    const additions=[];
    schedules.forEach(function(s) {
      const end = String(s.endTime || '');
      if (date === today && nowTime <= end) return;
      students.forEach(function(st) {
        const key=[date,s.activity,s.session,st.nis].join('|');
        if (!existing[key]) {
          additions.push([date,s.activity,s.session,st.nis,st.nama,'Tidak Hadir','',new Date(),'Otomatis']);
          existing[key]=true;
        }
      });
    });
    if (additions.length) sh.getRange(sh.getLastRow()+1,1,additions.length,HEADERS.Absensi.length).setValues(additions);
    return {ok:true,created:additions.length};
  } finally { lock.releaseLock(); }
}

function processAttendanceDeadlines() {
  return processAttendanceDeadlines_(new Date());
}

function installAttendanceTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  const exists = triggers.some(function(t){return t.getHandlerFunction()==='processAttendanceDeadlines';});
  if (!exists) ScriptApp.newTrigger('processAttendanceDeadlines').timeBased().everyMinutes(5).create();
  return 'Pemicu otomatis absensi aktif (pemeriksaan setiap 5 menit).';
}

function recordAttendanceScan_(data) {
  const activity = String(data.activity || '').trim();
  const session = activity === 'jamaah' ? String(data.session || 'Subuh').trim() : 'Utama';
  const nis = String(data.nis || '').trim().replace(/\D/g,'');
  if (!ATTENDANCE_ACTIVITY_NAMES[activity] || !nis) return {ok:false,error:'Kegiatan atau NIS tidak valid.'};
  const now = new Date();
  const date = Utilities.formatDate(now, ATTENDANCE_TZ, 'yyyy-MM-dd');
  const time = Utilities.formatDate(now, ATTENDANCE_TZ, 'HH:mm');
  const weekday = new Date(date + 'T12:00:00+07:00').getDay();
  const schedules = attendanceScheduleRows_();
  const schedule = schedules.find(function(s){return s.activity===activity && String(s.session)===session;});
  if (!schedule) return {ok:false,error:'Jadwal '+ATTENDANCE_ACTIVITY_NAMES[activity]+' sesi '+session+' belum diatur.'};
  if (schedule.days.indexOf(weekday)<0) return {ok:false,error:'Kegiatan ini tidak dijadwalkan pada hari ini.'};
  if (time < String(schedule.startTime)) return {ok:false,error:'Absensi belum dibuka. Mulai pukul '+schedule.startTime+'.'};
  if (time > String(schedule.endTime)) return {ok:false,error:'Batas scan sudah lewat pukul '+schedule.endTime+'.'};
  const students = attendanceStudentRoster_();
  const student = students.find(function(x){return x.nis===nis;});
  if (!student) return {ok:false,error:'NIS tidak ditemukan atau santri tidak berstatus aktif.'};
  const status = time <= String(schedule.onTimeUntil) ? 'Hadir' : 'Terlambat';
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = ensureAttendanceSheets_().getSheetByName('Absensi');
    const key=[date,activity,session,nis].join('|');
    const existing=attendanceExistingKeys_(sh,date);
    if (existing[key]) return {ok:false,error:'Santri ini sudah tercatat pada sesi '+session+' hari ini.'};
    sh.appendRow([date,activity,session,nis,student.nama,status,time,new Date(),'Scan QR KTS']);
    return {ok:true,data:{nis:nis,nama:student.nama,status:status,time:time,activity:activity,session:session}};
  } finally { lock.releaseLock(); }
}

function getAttendanceRecords_(date, activity) {
  const safeDate = attendanceDateString_(date);
  const process = processAttendanceDeadlines_(safeDate);
  const sh = ensureAttendanceSheets_().getSheetByName('Absensi');
  const rows = sh.getLastRow() < 2 ? [] : sh.getDataRange().getDisplayValues().slice(1);
  const data = rows.filter(function(row) {
    return String(row[0]) === safeDate && (activity === 'all' || !activity || String(row[1]) === activity);
  }).map(function(row) {
    return {date:row[0],activity:row[1],session:row[2],nis:row[3],nama:row[4],status:row[5],time:row[6] ? String(row[6]).slice(0,5) : '',source:row[8]};
  }).sort(function(a,b){return String(b.time).localeCompare(String(a.time)) || a.nama.localeCompare(b.nama);});
  const summary={hadir:0,terlambat:0,tidakHadir:0};
  data.forEach(function(x){if(x.status==='Hadir')summary.hadir++;else if(x.status==='Terlambat')summary.terlambat++;else if(x.status==='Tidak Hadir')summary.tidakHadir++;});
  return {ok:true,data:data,summary:summary,generated:process.created||0};
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
