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
  Absensi: ['tanggal','activity','session','nis','nama','status','waktuScan','dicatatPada','sumber'],
  LiburAbsensi: ['tanggal','activity','session','status','catatan','updatedAt']
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
    const absensi = ss.getSheetByName('Absensi');
    const lastRow = absensi ? absensi.getLastRow() : 0;
    const lastRecords = absensi && lastRow > 1
      ? absensi.getRange(Math.max(2, lastRow - 4), 1, Math.min(5, lastRow - 1), Math.min(9, absensi.getLastColumn())).getDisplayValues()
      : [];
    const result = {
      ok:true,
      app:'Program Pesantren PPFHA',
      spreadsheet:ss.getName(),
      spreadsheetId:ss.getId(),
      spreadsheetUrl:ss.getUrl(),
      attendanceTabExists:!!absensi,
      attendanceDataRows:Math.max(0,lastRow - 1),
      attendanceLastRecords:lastRecords,
      tabs:ss.getSheets().map(function(sh){return {name:sh.getName(),rows:sh.getLastRow(),columns:sh.getLastColumn()};})
    };
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
    if (action === 'toggleattendanceholiday') return output_(toggleAttendanceHoliday_(body.data || {}));
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

function normalizeAttendanceActivity_(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/[’‘]/g, "'");
  const aliases = {'jamaah':'jamaah','sholat jamaah':'jamaah','sholat berjamaah':'jamaah','shalat berjamaah':'jamaah','kitab-pagi':'kitab-pagi','ngaji kitab pagi':'kitab-pagi','albab':'albab','ngaji kitab albab':'albab','ngaji kitab metode albab':'albab','alquran':'alquran',"ngaji al-qur'an":'alquran','madrasiyah':'madrasiyah'};
  return aliases[raw] || String(value || '').trim();
}

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
    const activity = normalizeAttendanceActivity_(item.activity);
    if (!ATTENDANCE_ACTIVITY_NAMES[activity]) return;
    const days = activity === 'jamaah'
      ? (String(item.session) === 'Jumat' ? [5] : (String(item.session) === 'Dzuhur' || String(item.session) === 'Ashar' ? [0,1,2,3,4,6] : [0,1,2,3,4,5,6]))
      : (activity === 'kitab-pagi' ? [1,2,3,4] : (String(item.days || '').trim() ? String(item.days).split(',').map(Number) : [0,1,2,3,4,5,6]));
    const config = {
      session: String(item.session || (activity === 'jamaah' ? 'Subuh' : 'Utama')),
      startTime: String(item.startTime || ''),
      onTimeUntil: String(item.onTimeUntil || ''),
      endTime: String(item.endTime || ''),
      days: days,
      holidayToday: isAttendanceHoliday_(Utilities.formatDate(new Date(), ATTENDANCE_TZ, 'yyyy-MM-dd'), activity, String(item.session || (activity === 'jamaah' ? 'Subuh' : 'Utama')))
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
  const activity = normalizeAttendanceActivity_(data.activity);
  const session = activity === 'jamaah' ? String(data.session || 'Subuh').trim() : 'Utama';
  const startTime = String(data.startTime || '').trim();
  const onTimeUntil = String(data.onTimeUntil || '').trim();
  const endTime = String(data.endTime || '').trim();
  // Hari aktif ditentukan otomatis oleh kalender WIB sesuai jenis sesi.
  const days = activity === 'jamaah'
    ? (session === 'Jumat' ? [5] : (session === 'Dzuhur' || session === 'Ashar' ? [0,1,2,3,4,6] : [0,1,2,3,4,5,6]))
    : (activity === 'kitab-pagi' ? [1,2,3,4] : [0,1,2,3,4,5,6]);
  if (!ATTENDANCE_ACTIVITY_NAMES[activity]) return {ok:false,error:'Kegiatan tidak dikenal.'};
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(onTimeUntil) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime))
    return {ok:false,error:'Format jam tidak valid.'};
  if (!(startTime <= onTimeUntil && onTimeUntil <= endTime)) return {ok:false,error:'Urutan jam tidak valid.'};
  // Hari aktif otomatis; tidak perlu dipilih manual.
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
  // Samakan persis dengan endpoint biodata santri yang sudah dipakai aplikasi:
  // kolom A=NIS, B=Nama, H=Status. Hindari salah deteksi header yang
  // menyebabkan NIS terbaca tetapi nama/status kosong.
  const ss = SpreadsheetApp.openById(STUDENT_DB_ID);
  const sh = ss.getSheetByName(STUDENT_SHEET_NAME);
  if (!sh || sh.getLastRow() < 2) throw new Error('Database santri uang jajan tidak ditemukan atau masih kosong.');
  const rows = sh.getDataRange().getDisplayValues();
  return rows.slice(1).map(function(row) {
    return {
      nis:String(row[0] || '').trim().replace(/\D/g,''),
      nama:String(row[1] || '').trim(),
      status:String(row[7] || '').trim().toLowerCase()
    };
  }).filter(function(x){return x.nis && x.nama && x.status === 'aktif';});
}

function attendanceScheduleRows_() {
  const sh = ensureAttendanceSheets_().getSheetByName('JadwalAbsensi');
  if (sh.getLastRow() < 2) return [];
  const rows = sh.getDataRange().getDisplayValues();
  const h = rows[0].map(function(v){return String(v).trim();});
  return rows.slice(1).map(function(row) {
    const o={}; h.forEach(function(k,i){if(k)o[k]=row[i];});
    o.activity = normalizeAttendanceActivity_(o.activity);
    const rawDays=String(o.days||'').trim();
    o.days = o.activity === 'jamaah'
      ? (String(o.session) === 'Jumat' ? [5] : (String(o.session) === 'Dzuhur' || String(o.session) === 'Ashar' ? [0,1,2,3,4,6] : [0,1,2,3,4,5,6]))
      : (o.activity === 'kitab-pagi' ? [1,2,3,4] : (rawDays ? rawDays.split(',').map(Number) : [0,1,2,3,4,5,6]));
    return o;
  }).filter(function(x){return ATTENDANCE_ACTIVITY_NAMES[x.activity] && x.startTime && x.endTime;});
}

function isAttendanceHoliday_(date, activity, session) {
  const ss = ensureAttendanceSheets_(), sh = ss.getSheetByName('LiburAbsensi');
  if (!sh || sh.getLastRow() < 2) return false;
  const rows = sh.getDataRange().getDisplayValues();
  const headers = rows[0].map(function(v){return String(v).trim();});
  for (let i=1;i<rows.length;i++) {
    const item={}; headers.forEach(function(k,j){if(k)item[k]=rows[i][j];});
    if (String(item.tanggal)===String(date) && normalizeAttendanceActivity_(item.activity)===activity &&
        String(item.session || 'Utama')===String(session || 'Utama') && String(item.status).toLowerCase()==='libur') return true;
  }
  return false;
}
function toggleAttendanceHoliday_(data) {
  const date = String(data.date || Utilities.formatDate(new Date(), ATTENDANCE_TZ, 'yyyy-MM-dd'));
  const activity = normalizeAttendanceActivity_(data.activity);
  const session = activity === 'jamaah' ? String(data.session || 'Subuh') : 'Utama';
  const holiday = data.isHoliday === true;
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) return {ok:false,error:'Tanggal libur tidak valid.'};
  if (!ATTENDANCE_ACTIVITY_NAMES[activity]) return {ok:false,error:'Kegiatan tidak dikenal.'};
  const lock=LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const sh=ensureAttendanceSheets_().getSheetByName('LiburAbsensi');
    const values=sh.getDataRange().getDisplayValues();
    let rowNumber=0;
    for(let i=1;i<values.length;i++) if(String(values[i][0])===date && normalizeAttendanceActivity_(values[i][1])===activity && String(values[i][2]||'Utama')===session){rowNumber=i+1;break;}
    const row=[date,activity,session,holiday?'Libur':'Aktif',String(data.catatan||''),new Date()];
    if(rowNumber) sh.getRange(rowNumber,1,1,row.length).setValues([row]); else sh.appendRow(row);
    return {ok:true,isHoliday:holiday,message:holiday?'Kegiatan diliburkan untuk tanggal ini.':'Status libur dibatalkan.'};
  } finally {lock.releaseLock();}
}

function attendanceDateString_(date) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return Utilities.formatDate(new Date(date), ATTENDANCE_TZ, 'yyyy-MM-dd');
}

function attendanceCellDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime()))
    return Utilities.formatDate(value, ATTENDANCE_TZ, 'yyyy-MM-dd');
  const text = String(value == null ? '' : value).trim();
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(text)) return text;
  let m = text.match(/^(\\d{1,2})[\\/.-](\\d{1,2})[\\/.-](\\d{4})$/);
  if (m) return m[3] + '-' + String(m[2]).padStart(2,'0') + '-' + String(m[1]).padStart(2,'0');
  const parsed = new Date(value);
  return value && !isNaN(parsed.getTime()) ? Utilities.formatDate(parsed, ATTENDANCE_TZ, 'yyyy-MM-dd') : text;
}
function attendanceCellTime_(value) {
  if (value instanceof Date && !isNaN(value.getTime()))
    return Utilities.formatDate(value, ATTENDANCE_TZ, 'HH:mm');
  const text = String(value == null ? '' : value).trim();
  const match = text.match(/(\\d{1,2}):(\\d{2})/);
  return match ? String(match[1]).padStart(2,'0') + ':' + match[2] : text;
}
function attendanceExistingKeys_(sh, date) {
  const set = {};
  if (sh.getLastRow() < 2) return set;
  const rows = sh.getDataRange().getValues();
  for (let i=1;i<rows.length;i++) {
    const rowDate = attendanceCellDate_(rows[i][0]);
    if (rowDate === date) {
      const activity=String(rows[i][1]||''), session=String(rows[i][2]||''), nis=String(rows[i][3]||'');
      set[[date,activity,session,nis].join('|')] = {date:date,activity:activity,session:session,nis:nis,nama:String(rows[i][4]||''),status:String(rows[i][5]||''),time:attendanceCellTime_(rows[i][6])};
    }
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
  const schedules = attendanceScheduleRows_().filter(function(s){
    if (s.days.indexOf(weekday)<0) return false;
    if (isAttendanceHoliday_(date, s.activity, s.session)) return false;
    // Jumat: Ashar tidak menggunakan absensi jamaah.
    if (weekday === 5 && s.activity === 'jamaah' && String(s.session) === 'Ashar') return false;
    if (weekday === 5 && s.activity === 'jamaah' && String(s.session) === 'Dzuhur') return false;
    return true;
  });
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
  const nis = String(data.nis || '').trim().replace(/\D/g,'');
  if (!nis) return {ok:false,error:'QR tidak berisi NIS yang valid.'};
  const now = new Date();
  const date = Utilities.formatDate(now, ATTENDANCE_TZ, 'yyyy-MM-dd');
  const time = Utilities.formatDate(now, ATTENDANCE_TZ, 'HH:mm');
  const weekday = new Date(date + 'T12:00:00+07:00').getDay();
  // Kategori portal dipilih dari kartu kegiatan. Sesi/nama sholat tetap
  // ditentukan sepenuhnya di server dari jadwal WIB, tidak menerima pilihan sesi manual.
  const requestedActivity = normalizeAttendanceActivity_(data.activity);
  if (!ATTENDANCE_ACTIVITY_NAMES[requestedActivity]) return {ok:false,error:'Portal kegiatan tidak valid.'};
  const testMode = data.testMode === true && requestedActivity === 'kitab-pagi';
  const activitySchedules = attendanceScheduleRows_().filter(function(s){return s.activity===requestedActivity && s.days.indexOf(weekday)>=0;});
  if (!testMode && activitySchedules.some(function(s){return isAttendanceHoliday_(date,s.activity,s.session);})) return {ok:false,error:'Kegiatan hari ini diliburkan oleh pengurus. Absensi tidak dicatat.'};
  const allSchedules = attendanceScheduleRows_().filter(function(s) {
    if (s.activity !== requestedActivity) return false;
    if (isAttendanceHoliday_(date, s.activity, s.session)) return false;
    if (s.days.indexOf(weekday) < 0) return false;
    if (weekday === 5 && s.activity === 'jamaah' && (String(s.session) === 'Dzuhur' || String(s.session) === 'Ashar')) return false;
    return true;
  });
  const activeSchedules = allSchedules.filter(function(s){return time >= String(s.startTime) && time <= String(s.endTime);})
    .sort(function(a,b){return String(a.endTime).localeCompare(String(b.endTime));});
  const nextSchedules = allSchedules.filter(function(s){return String(s.startTime) > time;})
    .sort(function(a,b){return String(a.startTime).localeCompare(String(b.startTime));});
  let schedule = activeSchedules[0] || nextSchedules[0] || null;
  // Mode uji coba Ngaji Kitab Pagi: izinkan pencatatan tanpa jadwal resmi.
  // Jadwal/status final akan dikunci kembali setelah pengujian dinyatakan selesai.
  if (!schedule && testMode) schedule = {activity:'kitab-pagi',session:'Utama',startTime:'00:00',onTimeUntil:'23:59',endTime:'23:59',days:[0,1,2,3,4,5,6]};
  if (!schedule) return {ok:false,error:'Tidak ada jadwal kegiatan berikutnya yang aktif/tersedia hari ini. Periksa pengaturan jadwal.'};
  const activity = schedule.activity;
  const session = activity === 'jamaah' ? String(schedule.session) : 'Utama';
  // Jumat memakai sesi khusus Sholat Jumat, bukan sesi Dzuhur musholla.
  if (weekday === 5 && activity === 'jamaah' && session === 'Dzuhur')
    return {ok:false,error:'Hari Jumat gunakan sesi Sholat Jumat, bukan Dzuhur musholla.'};
  if (weekday === 5 && activity === 'jamaah' && session === 'Ashar')
    return {ok:false,error:'Absensi jamaah Ashar ditiadakan khusus hari Jumat.'};
  if (session === 'Jumat' && weekday !== 5)
    return {ok:false,error:'Sesi Sholat Jumat hanya aktif pada hari Jumat.'};
  // MODE UJI COBA: kamera tetap dapat digunakan kapan saja. Namun sesi
  // yang dicatat selalu ditentukan otomatis oleh jadwal server, bukan pilihan petugas.
  const students = attendanceStudentRoster_();
  const student = students.find(function(x){return x.nis===nis;});
  if (!student) return {ok:false,error:'NIS tidak ditemukan atau santri tidak berstatus aktif.'};
  const status = (testMode || session === 'Jumat') ? 'Hadir' : (time <= String(schedule.onTimeUntil) ? 'Hadir' : 'Terlambat');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = ensureAttendanceSheets_().getSheetByName('Absensi');
    const key=[date,activity,session,nis].join('|');
    const existing=attendanceExistingKeys_(sh,date);
    if (existing[key]) return {ok:true,duplicate:true,data:existing[key],message:'Santri sudah tercatat pada sesi '+session+' hari ini.'};
    sh.appendRow([date,activity,session,nis,student.nama,status,time,new Date(),'Scan QR KTS']);
    return {ok:true,data:{nis:nis,nama:student.nama,status:status,time:time,activity:activity,session:session}};
  } finally { lock.releaseLock(); }
}

function getAttendanceRecords_(date, activity) {
  const safeDate = attendanceDateString_(date);
  const process = processAttendanceDeadlines_(safeDate);
  const sh = ensureAttendanceSheets_().getSheetByName('Absensi');
  // Gunakan nilai asli sel, bukan displayValues: format tampilan tanggal di
  // Google Sheets bisa berbeda (yyyy-MM-dd, dd/MM/yyyy, atau objek Date).
  const rows = sh.getLastRow() < 2 ? [] : sh.getDataRange().getValues().slice(1);
  const wantedActivity = String(activity || 'all').trim().toLowerCase();
  const data = rows.map(function(row) {
    return {
      date:attendanceCellDate_(row[0]),
      activity:String(row[1]||'').trim(),
      session:String(row[2]||'').trim(),
      nis:String(row[3]||'').trim(),
      nama:String(row[4]||'').trim(),
      status:String(row[5]||'').trim(),
      time:attendanceCellTime_(row[6]),
      source:String(row[8]||'')
    };
  }).filter(function(row) {
    return row.date === safeDate && (wantedActivity === 'all' || !wantedActivity || row.activity.toLowerCase() === wantedActivity);
  }).sort(function(a,b){return String(b.time).localeCompare(String(a.time)) || a.nama.localeCompare(b.nama);});
  const summary={hadir:0,terlambat:0,tidakHadir:0};
  data.forEach(function(x){if(x.status.toLowerCase()==='hadir')summary.hadir++;else if(x.status.toLowerCase()==='terlambat')summary.terlambat++;else if(x.status.toLowerCase()==='tidak hadir')summary.tidakHadir++;});
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
