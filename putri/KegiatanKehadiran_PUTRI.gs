// Kegiatan & Kehadiran — dipisahkan dari Code.gs utama.
// Tempel sebagai file KegiatanKehadiran.gs dalam proyek Apps Script YANG SAMA.
// Fungsi dipertahankan namanya agar endpoint dan trigger lama tetap bekerja.
// Memakai SPREADSHEET_ID dan HEADERS dari Code.gs.

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
  const raw = String(value || '').normalize('NFKC').trim().toLowerCase()
    .replace(/[’‘]/g, "'").replace(/[\s_-]+/g, ' ').replace(/\s+/g, ' ');
  const aliases = {
    'jamaah':'jamaah','sholat jamaah':'jamaah','sholat berjamaah':'jamaah','shalat berjamaah':'jamaah',
    'shalat jamaah':'jamaah','sholat berjama ah':'jamaah','jamaah sholat':'jamaah',
    'kitab pagi':'kitab-pagi','ngaji kitab pagi':'kitab-pagi','ngaji pagi':'kitab-pagi','kitab-pagi':'kitab-pagi',
    'albab':'albab','ngaji kitab albab':'albab','ngaji kitab metode albab':'albab',
    'alquran':'alquran',"ngaji al-qur'an":'alquran',"ngaji al qur'an":'alquran','ngaji alquran':'alquran',
    'madrasiyah':'madrasiyah'
  };
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

function normalizeAttendanceTime_(value) { var raw=String(value==null?'':value).trim().toUpperCase(); if(!raw)return ''; var m=raw.match(/^(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*(AM|PM)?$/); if(m){var h=Number(m[1]),min=Number(m[2]);if(min>59||h>23)return '';if(m[4]){if(h<1||h>12)return '';h=(h%12)+(m[4]==='PM'?12:0);}return ('0'+h).slice(-2)+':'+('0'+min).slice(-2);} if(/^\d+(?:\.\d+)?$/.test(raw)){var n=Number(raw);if(n>=0&&n<1){var mins=Math.round(n*1440);return ('0'+Math.floor(mins/60)%24).slice(-2)+':'+('0'+mins%60).slice(-2);}} return ''; }

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
      : (activity === 'kitab-pagi' ? [1,2,3,4] : activity === 'albab' ? [0,2,3,5,6] : activity === 'madrasiyah' ? [0,1,2,3,4,6] : activity === 'alquran' ? [0,1,2,3,6] : (String(item.days || '').trim() ? String(item.days).split(',').map(Number) : [0,1,2,3,4,5,6]));
    const sessionName = String(item.session || (activity === 'jamaah' ? 'Subuh' : 'Utama')).trim();
    const config = {
      session: sessionName,
      startTime: normalizeAttendanceTime_(item.startTime),
      onTimeUntil: normalizeAttendanceTime_(item.onTimeUntil),
      endTime: normalizeAttendanceTime_(item.endTime),
      days: days,
      holidayToday: isAttendanceHoliday_(Utilities.formatDate(new Date(), ATTENDANCE_TZ, 'yyyy-MM-dd'), activity, sessionName)
    };
    if (activity === 'jamaah') {
      if (String(jamaahSession || '').trim().toLowerCase() === 'all') result[activity][sessionName] = config;
      else if (sessionName.toLowerCase() === String(jamaahSession || '').trim().toLowerCase()) result[activity] = config;
    } else {
      result[activity] = config;
    }
  });
  // Sesi khusus Jumat otomatis tersedia dari kalender WIB meskipun belum ada baris
  // tersendiri di sheet. Rentang absensi Sholat Jumat: 10.30–13.00.
  const requestedSession = String(jamaahSession || '').trim().toLowerCase();
  const fridayConfig = {
    session:'Jumat', startTime:'10:30', onTimeUntil:'13:00', endTime:'13:00',
    days:[5], holidayToday:isAttendanceHoliday_(Utilities.formatDate(new Date(), ATTENDANCE_TZ, 'yyyy-MM-dd'), 'jamaah', 'Jumat')
  };
  if (requestedSession === 'all' && !result.jamaah.Jumat) {
    result.jamaah.Jumat = fridayConfig;
  } else if (requestedSession === 'jumat' && !result.jamaah.startTime) {
    result.jamaah = fridayConfig;
  }
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
    : (activity === 'kitab-pagi' ? [1,2,3,4] : activity === 'albab' ? [0,2,3,5,6] : activity === 'madrasiyah' ? [0,1,2,3,4,6] : activity === 'alquran' ? [0,1,2,3,6] : [0,1,2,3,4,5,6]);
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
  const scheduleRows = rows.slice(1).map(function(row) {
    const o={}; h.forEach(function(k,i){if(k)o[k]=row[i];});
    o.activity = normalizeAttendanceActivity_(o.activity);
    o.session = String(o.session || 'Utama').trim();
    o.startTime = normalizeAttendanceTime_(o.startTime);
    o.onTimeUntil = normalizeAttendanceTime_(o.onTimeUntil);
    o.endTime = normalizeAttendanceTime_(o.endTime);
    const rawDays=String(o.days||'').trim();
    o.days = o.activity === 'jamaah'
      ? (o.session.toLowerCase() === 'jumat' ? [5] : (['dzuhur','ashar'].includes(o.session.toLowerCase()) ? [0,1,2,3,4,6] : [0,1,2,3,4,5,6]))
      : (o.activity === 'kitab-pagi' ? [1,2,3,4] : o.activity === 'albab' ? [0,2,3,5,6] : o.activity === 'madrasiyah' ? [0,1,2,3,4,6] : o.activity === 'alquran' ? [0,1,2,3,6] : (rawDays ? rawDays.split(',').map(Number) : [0,1,2,3,4,5,6]));
    return o;
  }).filter(function(x){return ATTENDANCE_ACTIVITY_NAMES[x.activity] && x.startTime && x.endTime;});
  // Tambahkan sesi Jumat otomatis bila belum ada baris manual di JadwalAbsensi.
  const hasFriday = scheduleRows.some(function(s){return s.activity === 'jamaah' && String(s.session).toLowerCase() === 'jumat';});
  if (!hasFriday) scheduleRows.push({activity:'jamaah',session:'Jumat',startTime:'10:30',onTimeUntil:'13:00',endTime:'13:00',days:[5]});
  return scheduleRows;
}

function isAttendanceHoliday_(date, activity, session) {
  const ss = ensureAttendanceSheets_(), sh = ss.getSheetByName('LiburAbsensi');
  if (!sh || sh.getLastRow() < 2) return false;
  const rows = sh.getDataRange().getDisplayValues();
  const headers = rows[0].map(function(v){return String(v).trim();});
  for (let i=1;i<rows.length;i++) {
    const item={}; headers.forEach(function(k,j){if(k)item[k]=rows[i][j];});
    const globalHoliday=String(item.activity||'').toLowerCase()==='all' && String(item.session||'').toLowerCase()==='all';
    const specificHoliday=normalizeAttendanceActivity_(item.activity)===activity && String(item.session || 'Utama')===String(session || 'Utama');
    if (String(item.tanggal)===String(date) && (globalHoliday || specificHoliday) && String(item.status).toLowerCase()==='libur') return true;
  }
  return false;
}
function toggleAttendanceHoliday_(data) {
  const date = String(data.date || Utilities.formatDate(new Date(), ATTENDANCE_TZ, 'yyyy-MM-dd'));
  const activity = normalizeAttendanceActivity_(data.activity);
  const session = activity === 'jamaah' ? String(data.session || 'Subuh') : 'Utama';
  const holiday = data.isHoliday === true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return {ok:false,error:'Tanggal libur tidak valid.'};
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


/** Mengatur libur pondok untuk seluruh kegiatan pada rentang tanggal. */
function setPondokHoliday_(data) {
  const start=String(data.startDate||''), end=String(data.endDate||''), holiday=data.isHoliday!==false;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||end<start) return {ok:false,error:'Rentang tanggal libur tidak valid.'};
  const startDate=new Date(start+'T12:00:00+07:00'), endDate=new Date(end+'T12:00:00+07:00');
  const count=Math.round((endDate-startDate)/86400000)+1;
  if(count>90) return {ok:false,error:'Rentang libur maksimal 90 hari dalam satu pengaturan.'};
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try {
    const sh=ensureAttendanceSheets_().getSheetByName('LiburAbsensi'), values=sh.getDataRange().getDisplayValues();
    const existing={};
    for(let i=1;i<values.length;i++) if(String(values[i][1]).toLowerCase()==='all'&&String(values[i][2]).toLowerCase()==='all') existing[String(values[i][0])]=i+1;
    const rows=[];
    for(let i=0;i<count;i++) {
      const date=Utilities.formatDate(new Date(startDate.getTime()+i*86400000),ATTENDANCE_TZ,'yyyy-MM-dd');
      const row=[date,'all','all',holiday?'Libur':'Aktif',String(data.catatan||'Libur pondok'),new Date()];
      if(existing[date]) sh.getRange(existing[date],1,1,row.length).setValues([row]); else rows.push(row);
    }
    if(rows.length) sh.getRange(sh.getLastRow()+1,1,rows.length,6).setValues(rows);
    return {ok:true,days:count,isHoliday:holiday,message:holiday?'Seluruh kegiatan dinonaktifkan selama libur pondok.':'Status libur pondok dibatalkan untuk rentang tanggal tersebut.'};
  } finally {lock.releaseLock();}
}


/** Mengakhiri libur global mulai hari ini; tanggal lampau tidak diubah. */
function activatePondokNow_() {
  const today=Utilities.formatDate(new Date(),ATTENDANCE_TZ,'yyyy-MM-dd');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try {
    const sh=ensureAttendanceSheets_().getSheetByName('LiburAbsensi');
    if(!sh || sh.getLastRow()<2) return {ok:true,updated:0,message:'Tidak ada jadwal libur pondok yang perlu diaktifkan.'};
    const values=sh.getDataRange().getDisplayValues();
    let updated=0;
    for(let i=1;i<values.length;i++) {
      const date=String(values[i][0]||'');
      const isGlobal=String(values[i][1]||'').toLowerCase()==='all' && String(values[i][2]||'').toLowerCase()==='all';
      const isHoliday=String(values[i][3]||'').toLowerCase()==='libur';
      if(isGlobal && isHoliday && /^\d{4}-\d{2}-\d{2}$/.test(date) && date>=today) {
        sh.getRange(i+1,4).setValue('Aktif');
        sh.getRange(i+1,6).setValue(new Date());
        updated++;
      }
    }
    return {ok:true,updated:updated,message:updated?'Libur pondok dihentikan mulai hari ini. Semua kegiatan kembali mengikuti jadwal normal.':'Tidak ada libur pondok hari ini atau mendatang yang perlu dihentikan.'};
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
  const isoDatePrefix=text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDatePrefix) return isoDatePrefix[1];
  let m = text.match(/^(\d{1,2})[\\/.-](\d{1,2})[\\/.-](\d{4})$/);
  if (m) return m[3] + '-' + String(m[2]).padStart(2,'0') + '-' + String(m[1]).padStart(2,'0');
  const parsed = new Date(value);
  return value && !isNaN(parsed.getTime()) ? Utilities.formatDate(parsed, ATTENDANCE_TZ, 'yyyy-MM-dd') : text;
}
function attendanceCellTime_(value) {
  if (value instanceof Date && !isNaN(value.getTime()))
    return Utilities.formatDate(value, ATTENDANCE_TZ, 'HH:mm');
  const text = String(value == null ? '' : value).trim();
  const match = text.match(/(\d{1,2}):(\d{2})/);
  return match ? String(match[1]).padStart(2,'0') + ':' + match[2] : text;
}
function attendanceExistingKeys_(sh, date) {
  const set = {};
  if (sh.getLastRow() < 2) return set;
  const rows = sh.getDataRange().getValues();
  for (let i=1;i<rows.length;i++) {
    const rowDate = attendanceCellDate_(rows[i][0]);
    if (rowDate === date) {
      const activity=normalizeAttendanceActivity_(rows[i][1]);
      const session=String(rows[i][2]||'Utama').trim() || 'Utama';
      const nis=String(rows[i][3]||'').trim().replace(/\D/g,'');
      set[[date,activity,session,nis].join('|')] = {date:date,activity:activity,session:session,nis:nis,nama:String(rows[i][4]||''),status:String(rows[i][5]||''),time:attendanceCellTime_(rows[i][6])};
    }
  }
  return set;
}


/** Mengambil izin aktif melalui modul ProteksiAbsensiIzin.gs. */
function activeAttendancePermissions_(targetDate) {
  return ppfhaActiveAttendancePermissions_(targetDate);
}

function writePermissionAttendance_(sh,date,activity,session,student,permission) {
  const rows=sh.getLastRow()>1?sh.getDataRange().getValues():[];
  for(let i=1;i<rows.length;i++) {
    const row=rows[i];
    if(attendanceCellDate_(row[0])===date && normalizeAttendanceActivity_(row[1])===activity && String(row[2]||'Utama')===session && String(row[3]||'').trim().replace(/\D/g,'')===student.nis) {
      const old=String(row[5]||'').toLowerCase();
      if(old==='hadir'||old==='terlambat'||old.indexOf('izin')===0) return false;
      sh.getRange(i+1,6,1,4).setValues([[permission.status,'',new Date(),'Otomatis · '+permission.status]]);
      return true;
    }
  }
  sh.appendRow([date,activity,session,student.nis,student.nama,permission.status,'',new Date(),'Otomatis · '+permission.status]);
  return true;
}

/** Membuat baris Tidak Hadir atau Izin Sakit setelah batas akhir sesi lewat. */
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
  const permissions = activeAttendancePermissions_(date);
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
        const session=s.activity==='jamaah'?s.session:'Utama';
        const key=[date,s.activity,session,st.nis].join('|');
        const permission=permissions[st.nis], permissionForSession=!!(permission && (permission.date<date || (permission.date===date && permission.time<=end)) && (!permission.endDate || permission.endDate>date || (permission.endDate===date && permission.endTime>=end)));
        if (permissionForSession) {
          if (!existing[key] || String(existing[key].status).toLowerCase()==='tidak hadir') writePermissionAttendance_(sh,date,s.activity,session,st,permission);
          existing[key]=existing[key]||{status:permission.status};
        } else if (!existing[key]) {
          additions.push([date,s.activity,session,st.nis,st.nama,'Tidak Hadir','',new Date(),'Otomatis']);
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
  // Proteksi izin dijalankan sebelum scan dicatat. Santri dengan izin aktif ditolak.
  const permissionNow = ppfhaFindActivePermission_(nis, date, time);
  if (permissionNow) {
    return {ok:false,error:'Scan ditolak. Santri sedang memiliki '+permissionNow.status+' yang masih aktif. Absensi akan dicatat sebagai izin secara otomatis.'};
  }
  const students = attendanceStudentRoster_();
  const student = students.find(function(x){return x.nis===nis;});
  if (!student) return {ok:false,error:'NIS tidak ditemukan atau santri tidak berstatus aktif.'};
  const testMode = data.testMode === true && requestedActivity === 'madrasiyah';
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
  let schedule = activeSchedules[0] || null;
  // Mode uji coba hanya untuk Madrasiyah; Ngaji Kitab Pagi wajib mengikuti jadwal resmi.
  // Jadwal/status final akan dikunci kembali setelah pengujian dinyatakan selesai.
  if (!schedule && testMode) schedule = {activity:requestedActivity,session:'Utama',startTime:'00:00',onTimeUntil:'23:59',endTime:'23:59',days:[0,1,2,3,4,5,6]};
  if (!schedule) {
    const upcoming = allSchedules.some(function(s){return String(s.startTime) > time;});
    return {ok:false,error:upcoming?'Jadwal kegiatan belum dimulai. Scan akan terbuka otomatis saat waktu mulai tiba.':'Jadwal kegiatan hari ini sudah selesai. Scan ditutup otomatis.'};
  }
  const activity = schedule.activity;
  const session = activity === 'jamaah' ? String(schedule.session) : 'Utama';
  // Jumat memakai sesi khusus Sholat Jumat, bukan sesi Dzuhur musholla.
  if (weekday === 5 && activity === 'jamaah' && session === 'Dzuhur')
    return {ok:false,error:'Hari Jumat gunakan sesi Sholat Jumat, bukan Dzuhur musholla.'};
  if (weekday === 5 && activity === 'jamaah' && session === 'Ashar')
    return {ok:false,error:'Absensi jamaah Ashar ditiadakan khusus hari Jumat.'};
  if (session === 'Jumat' && weekday !== 5)
    return {ok:false,error:'Sesi Sholat Jumat hanya aktif pada hari Jumat.'};
  const status = (testMode || session === 'Jumat') ? 'Hadir' : (time <= String(schedule.onTimeUntil) ? 'Hadir' : 'Terlambat');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = ensureAttendanceSheets_().getSheetByName('Absensi');
    const key=[date,normalizeAttendanceActivity_(activity),String(session||'Utama').trim(),nis].join('|');
    const existing=attendanceExistingKeys_(sh,date);
    if (existing[key]) {
      if (testMode && existing[key].status === 'Tidak Hadir') {
        const lastRow=sh.getLastRow();
        for(let r=2;r<=lastRow;r++) {
          const row=sh.getRange(r,1,1,6).getValues()[0];
          if(attendanceCellDate_(row[0])===date && normalizeAttendanceActivity_(row[1])===activity && String(row[2]||'Utama')===session && String(row[3]||'').trim().replace(/\D/g,'')===nis) {
            sh.getRange(r,6,1,4).setValues([['Hadir',time,new Date(),'Scan QR KTS (Uji Coba)']]);
            return {ok:true,data:{nis:nis,nama:student.nama,status:'Hadir',time:time,activity:activity,session:session},message:'Status uji coba diperbarui menjadi Hadir.'};
          }
        }
      }
      return {ok:true,duplicate:true,data:existing[key],message:'Santri sudah tercatat pada sesi '+session+' hari ini.'};
    }
    sh.appendRow([date,activity,session,nis,student.nama,status,time,new Date(),testMode?'Scan QR KTS (Uji Coba)':'Scan QR KTS']);
    return {ok:true,data:{nis:nis,nama:student.nama,status:status,time:time,activity:activity,session:session}};
  } finally { lock.releaseLock(); }
}

function getAttendanceRecords_(date, activity, session) {
  const safeDate = attendanceDateString_(date);
  const process = processAttendanceDeadlines_(safeDate);
  const sh = ensureAttendanceSheets_().getSheetByName('Absensi');
  // Gunakan nilai asli sel, bukan displayValues: format tampilan tanggal di
  // Google Sheets bisa berbeda (yyyy-MM-dd, dd/MM/yyyy, atau objek Date).
  const rows = sh.getLastRow() < 2 ? [] : sh.getDataRange().getValues().slice(1);
  const wantedActivity = String(activity || 'all').trim().toLowerCase();
  const wantedSession = String(session || '').trim().toLowerCase();
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
    const activityMatches = wantedActivity === 'all' || !wantedActivity || row.activity.toLowerCase() === wantedActivity;
    const sessionMatches = !wantedSession || row.session.toLowerCase() === wantedSession;
    return row.date === safeDate && activityMatches && sessionMatches;
  }).sort(function(a,b){return String(b.time).localeCompare(String(a.time)) || a.nama.localeCompare(b.nama);});
  const summary={hadir:0,terlambat:0,tidakHadir:0};
  data.forEach(function(x){if(x.status.toLowerCase()==='hadir')summary.hadir++;else if(x.status.toLowerCase()==='terlambat')summary.terlambat++;else if(x.status.toLowerCase()==='tidak hadir')summary.tidakHadir++;});
  return {ok:true,data:data,summary:summary,generated:process.created||0};
}

