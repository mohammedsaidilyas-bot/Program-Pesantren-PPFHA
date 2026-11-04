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
  Pengumuman: ['id','dibuatPada','judul','kategori','tanggal','target','nisTarget','isi','status','tanggalMulaiLibur','tanggalAkhirLibur','tanggalKembali','jamKembali'],
  Kegiatan: ['id','dibuatPada','judul','lokasi','tanggal','waktu','isi','status'],
  JadwalAbsensi: ['activity','session','startTime','onTimeUntil','endTime','days','updatedAt'],
  Absensi: ['tanggal','activity','session','nis','nama','status','waktuScan','dicatatPada','sumber'],
  LiburAbsensi: ['tanggal','activity','session','status','catatan','updatedAt']
};
const ACTION_TO_SHEET = { izin:'Izin', pengumuman:'Pengumuman', kegiatan:'Kegiatan' };

// Helper respons JSON untuk seluruh endpoint doGet/doPost.
function output_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Membandingkan kunci tanpa berhenti pada karakter pertama yang berbeda.
function constantTimeEquals_(a, b) {
  a = String(a == null ? '' : a);
  b = String(b == null ? '' : b);
  var diff = a.length ^ b.length;
  var maxLength = Math.max(a.length, b.length);
  for (var i = 0; i < maxLength; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

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
    if (action === 'health') return output_({ok:true,app:'Program Pesantren PPFHA',message:'Endpoint aktif',actions:['izin','pengumuman','kegiatan','student','educationrecords','saveeducationraport','saveeducationalbab','saveeducationhafalan']});
    if (action === 'student') {
      const nis = String((e && e.parameter && e.parameter.nis) || '').trim().replace(/\D/g, '');
      if (!nis) return output_({ok:false,error:'NIS wajib diisi.'});
      const studentSS = SpreadsheetApp.openById(STUDENT_DB_ID);
      const studentSheet = studentSS.getSheetByName(STUDENT_SHEET_NAME);
      if (!studentSheet) return output_({ok:false,error:'Tab database Uang Jajan Santri PPFHA tidak ditemukan.'});
      const rows = studentSheet.getDataRange().getDisplayValues();
      if (rows.length < 2) return output_({ok:false,error:'Database santri masih kosong.'});
      const headers = rows[0].map(function(h){return String(h||'').toLowerCase().replace(/[^a-z0-9]/g,'');});
      function col_(aliases, fallback){ for (var i=0;i<aliases.length;i++){var idx=headers.indexOf(aliases[i]);if(idx>=0)return idx;} return fallback; }
      const iNis=col_(['nis','nomorinduksantri','nomorinduk'],0);
      const iNama=col_(['nama','namasantri','namalengkap'],1);
      const iKelas=col_(['kelas','tingkat'],2);
      const iAsrama=col_(['asrama','kamar'],3);
      const iWali=col_(['wali','namawali','orangtua'],4);
      const iWa=col_(['nowawali','nowa','whatsappwali','nomorwawali'],5);
      const iStatus=col_(['status','statussantri'],7);
      const row = rows.slice(1).find(function(r){ return String(r[iNis] || '').trim().replace(/\D/g, '') === nis; });
      if (!row) return output_({ok:false,error:'NIS '+nis+' tidak ditemukan. Pastikan NIS sesuai database Uang Jajan Santri.'});
      const status = String(row[iStatus] || '').trim();
      if (status && !['aktif','active'].includes(status.toLowerCase())) return output_({ok:false,error:'Santri '+nis+' tidak berstatus aktif ('+status+').'});
      return output_({ok:true,data:{nis:String(row[iNis]||'').trim(),nama:String(row[iNama]||'').trim(),kelas:String(row[iKelas]||'').trim(),asrama:String(row[iAsrama]||'').trim(),wali:String(row[iWali]||'').trim(),noWaWali:String(row[iWa]||'').trim(),status:status||'Aktif'}});
    }
    if (action === 'liburanrekap') {
      const savedKey = PropertiesService.getScriptProperties().getProperty('ADMIN_API_KEY');
      const suppliedKey = String((e.parameter && e.parameter.key) || '');
      if (!savedKey || !constantTimeEquals_(suppliedKey, savedKey)) return output_({ok:false,error:'Akses rekap liburan ditolak.'});
      return output_(liburanRekap_());
    }
    if (action === 'attendanceconfig') return output_(getAttendanceConfig_(String((e.parameter && e.parameter.session) || 'Subuh')));
    if (action === 'attendancerecords') {
      const savedKey = PropertiesService.getScriptProperties().getProperty('ADMIN_API_KEY');
      const suppliedKey = String((e.parameter && e.parameter.key) || '');
      if (!savedKey || !constantTimeEquals_(suppliedKey, savedKey)) return output_({ok:false,error:'Akses rekap absensi ditolak. Masukkan kunci pengurus.'});
      const date = String((e.parameter && e.parameter.date) || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd'));
      const activity = String((e.parameter && e.parameter.activity) || 'all');
      const session = String((e.parameter && e.parameter.session) || '');
      const result = getAttendanceRecords_(date, activity, session);
      return output_(result);
    }
    if (action === 'educationrecords') {
      const savedKey = PropertiesService.getScriptProperties().getProperty('ADMIN_API_KEY');
      const suppliedKey = String((e.parameter && e.parameter.key) || '');
      if (!savedKey || !constantTimeEquals_(suppliedKey, savedKey)) return output_({ok:false,error:'Akses data pendidikan ditolak. Masukkan kunci pengurus.'});
      const nis = String((e.parameter && e.parameter.nis) || '').trim().replace(/\D/g, '');
      const type = String((e.parameter && e.parameter.type) || 'raport').toLowerCase();
      if (!nis) return output_({ok:false,error:'NIS wajib diisi.'});
      if (!['raport','albab','hafalan','evaluasi'].includes(type)) return output_({ok:false,error:'Jenis data belum tersedia.'});
      const sheetName = type === 'raport' ? 'RaportMadrasah' : type === 'albab' ? 'UjianAlbab' : type === 'hafalan' ? 'HafalanKitab' : 'EvaluasiUstaz';
      const sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
      if (!sh || sh.getLastRow() < 2) return output_({ok:true,data:[]});
      const rows = sh.getDataRange().getDisplayValues(), headers = rows[0].map(function(v){return String(v).trim();});
      const data = rows.slice(1).map(function(row){const o={};headers.forEach(function(k,i){if(k)o[k]=row[i];});return o;}).filter(function(o){return String(o.nis||'').replace(/\D/g,'')===nis;});
      return output_({ok:true,data:data});
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
    if (action === 'saveeducationraport') {
      const records = Array.isArray(body.records) ? body.records : [];
      if (!records.length) return output_({ok:false,error:'Tidak ada nilai raport untuk disimpan.'});
      if (records.length > 40) return output_({ok:false,error:'Jumlah entri terlalu banyak dalam satu penyimpanan.'});
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      let sh = ss.getSheetByName('RaportMadrasah');
      const headers = ['id','tanggalInput','nis','nama','kelas','tahunAjaran','mataPelajaran','kelompok','semester','prestasi','rataRataKelas','ustaz','catatan'];
      if (!sh) { sh=ss.insertSheet('RaportMadrasah'); sh.getRange(1,1,1,headers.length).setValues([headers]); sh.setFrozenRows(1); }
      if (sh.getLastRow() === 0) { sh.getRange(1,1,1,headers.length).setValues([headers]); sh.setFrozenRows(1); }
      const now = new Date(), rows = [];
      records.forEach(function(x) {
        const nis = String(x.nis||'').trim().replace(/\D/g,'');
        const semester = String(x.semester||'');
        const mapel = String(x.mataPelajaran||'').trim();
        if (!nis || !mapel || !['1','2'].includes(semester)) throw new Error('Data NIS, mata pelajaran, atau semester tidak valid.');
        ['prestasi','rataRataKelas'].forEach(function(k) {
          const raw = x[k];
          if (raw !== '' && raw !== null && raw !== undefined && (!isFinite(Number(raw)) || Number(raw)<0 || Number(raw)>100)) throw new Error('Nilai harus berupa angka 0 sampai 100.');
        });
        rows.push([Utilities.getUuid(),now,nis,String(x.nama||''),String(x.kelas||''),String(x.tahunAjaran||''),mapel,String(x.kelompok||''),semester,x.prestasi===''?'':Number(x.prestasi),x.rataRataKelas===''?'':Number(x.rataRataKelas),String(x.ustaz||''),'']);
      });
      const lock=LockService.getScriptLock();lock.waitLock(15000);
      try { sh.getRange(sh.getLastRow()+1,1,rows.length,headers.length).setValues(rows); }
      finally { lock.releaseLock(); }
      return output_({ok:true,saved:rows.length,message:'Nilai raport berhasil disimpan.'});
    }
    if (action === 'saveeducationalbab') {
      const x = body.data || {};
      const nis = String(x.nis || '').trim().replace(/\D/g,'');
      const periode = String(x.periodeUjian || '').trim();
      const nilaiTulis = Number(x.nilaiTulis), nilaiBaca = Number(x.nilaiBaca);
      if (!nis || !periode) return output_({ok:false,error:'NIS dan periode ujian wajib diisi.'});
      if (!isFinite(nilaiTulis) || !isFinite(nilaiBaca) || nilaiTulis<0 || nilaiTulis>100 || nilaiBaca<0 || nilaiBaca>100) return output_({ok:false,error:'Nilai tulis dan baca harus 0 sampai 100.'});
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      let sh = ss.getSheetByName('UjianAlbab');
      const headers = ['id','tanggalInput','nis','nama','kelas','periodeUjian','nilaiTulis','nilaiBaca','nilaiAkhir','catatan','ustaz'];
      if (!sh) { sh=ss.insertSheet('UjianAlbab'); sh.getRange(1,1,1,headers.length).setValues([headers]); sh.setFrozenRows(1); }
      if (sh.getLastRow()===0) { sh.getRange(1,1,1,headers.length).setValues([headers]); sh.setFrozenRows(1); }
      const nilaiAkhir = (nilaiTulis + nilaiBaca) / 2;
      const row = [Utilities.getUuid(),new Date(),nis,String(x.nama||''),String(x.kelas||''),periode,nilaiTulis,nilaiBaca,nilaiAkhir,String(x.catatan||''),String(x.ustaz||'')];
      const lock=LockService.getScriptLock();lock.waitLock(15000);
      try { sh.getRange(sh.getLastRow()+1,1,1,headers.length).setValues([row]); }
      finally { lock.releaseLock(); }
      return output_({ok:true,saved:1,nilaiAkhir:nilaiAkhir,message:'Nilai ujian Albab berhasil disimpan.'});
    }

    if (action === 'saveeducationhafalan') {
      const x = body.data || {};
      const nis = String(x.nis || '').trim().replace(/\D/g,'');
      const namaKitabNadzom = String(x.namaKitabNadzom || '').trim();
      const jenis = String(x.jenis || '').trim();
      const targetBait = Number(x.targetBait), capaianBait = Number(x.capaianBait);
      const status = String(x.status || '').trim();
      if (!nis || !namaKitabNadzom || !['Nadzom','Matan'].includes(jenis)) return output_({ok:false,error:'NIS, nama kitab/nadzom, dan jenis hafalan wajib diisi.'});
      if (!Number.isInteger(targetBait) || targetBait < 1 || !Number.isInteger(capaianBait) || capaianBait < 0 || capaianBait > targetBait) return output_({ok:false,error:'Capaian bait harus bilangan bulat dan tidak boleh melebihi target.'});
      if (!['Lancar','Cukup','Perlu Mengulang'].includes(status)) return output_({ok:false,error:'Status hafalan tidak valid.'});
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      let sh = ss.getSheetByName('HafalanKitab');
      const headers = ['id','tanggalInput','nis','nama','kelas','namaKitabNadzom','jenis','targetBait','capaianBait','status','catatan','ustaz'];
      if (!sh) { sh=ss.insertSheet('HafalanKitab'); sh.getRange(1,1,1,headers.length).setValues([headers]); sh.setFrozenRows(1); }
      if (sh.getLastRow()===0) { sh.getRange(1,1,1,headers.length).setValues([headers]); sh.setFrozenRows(1); }
      const row = [Utilities.getUuid(),new Date(),nis,String(x.nama||''),String(x.kelas||''),namaKitabNadzom,jenis,targetBait,capaianBait,status,String(x.catatan||''),String(x.ustaz||'')];
      const lock=LockService.getScriptLock();lock.waitLock(15000);
      try { sh.getRange(sh.getLastRow()+1,1,1,headers.length).setValues([row]); }
      finally { lock.releaseLock(); }
      return output_({ok:true,saved:1,message:'Catatan hafalan berhasil disimpan.'});
    }

    if (action === 'saveeducationevaluasi') {
      const x=body.data||{}, nis=String(x.nis||'').trim().replace(/\D/g,''), kategori=String(x.kategori||'').trim(), catatan=String(x.catatanEvaluasi||'').trim(), ustaz=String(x.ustaz||'').trim();
      const allowed=['Akademik','Kedisiplinan','Ibadah','Akhlak dan Sikap','Kebersihan','Lainnya'];
      if(!nis||!catatan||!ustaz||allowed.indexOf(kategori)<0)return output_({ok:false,error:'NIS, kategori, catatan evaluasi, dan nama ustaz wajib diisi.'});
      const ss=SpreadsheetApp.openById(SPREADSHEET_ID), headers=['id','tanggalInput','nis','nama','kelas','kategori','catatanEvaluasi','saranTindakLanjut','ustaz'];let sh=ss.getSheetByName('EvaluasiUstaz');
      if(!sh){sh=ss.insertSheet('EvaluasiUstaz');sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1)}if(sh.getLastRow()===0){sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1)}
      const row=[Utilities.getUuid(),new Date(),nis,String(x.nama||''),String(x.kelas||''),kategori,catatan,String(x.saranTindakLanjut||''),ustaz],lock=LockService.getScriptLock();lock.waitLock(15000);try{sh.getRange(sh.getLastRow()+1,1,1,headers.length).setValues([row])}finally{lock.releaseLock()}
      return output_({ok:true,saved:1,message:'Catatan evaluasi berhasil disimpan.'});
    }
    if (action === 'liburanbuatperiode') return output_(liburanBuatPeriode_(body.data || {}));
    if (action === 'liburanubahstatus') return output_(liburanUbahStatus_(body.data || {}));
    if (action === 'liburanscankembali') return output_(liburanScanKembali_(body.nis));
    if (action === 'saveattendanceconfig') return output_(saveAttendanceConfig_(body.data || {}));
    if (action === 'toggleattendanceholiday') return output_(toggleAttendanceHoliday_(body.data || {}));
    if (action === 'setpondokholiday') return output_(setPondokHoliday_(body.data || {}));
    if (action === 'activatepondoknow') return output_(activatePondokNow_());
    if (action === 'attendancescan') return output_(recordAttendanceScan_(body.data || {}));
    if (action === 'attendancerecords') return output_(getAttendanceRecords_(String(body.date || Utilities.formatDate(new Date(), ATTENDANCE_TZ, 'yyyy-MM-dd')), String(body.activity || 'all'), String(body.session || '')));
    if (action === 'updatestatus') {
      const id = String(body.id || '').trim();
      const status = String(body.status || '').trim();
      const allowed = ['Diizinkan','Menunggu persetujuan','Ditolak','Sudah keluar','Sudah kembali','Sudah Sehat'];
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
      if ((status === 'Sudah kembali' || status === 'Sudah Sehat') && kembaliCol) sh.getRange(rowNumber,kembaliCol).setValue(body.kembaliAt ? new Date(body.kembaliAt) : new Date());
      if ((status === 'Sudah kembali' || status === 'Sudah Sehat') && catatanCol && body.catatan !== undefined) sh.getRange(rowNumber,catatanCol).setValue(String(body.catatan || ''));
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
    // Migrasi aman: tambahkan kolom baru di ujung tab tanpa mengubah data lama.
    const expectedHeaders = HEADERS[name];
    const currentLastCol = Math.max(sh.getLastColumn(), 1);
    const currentHeaders = sh.getRange(1,1,1,currentLastCol).getDisplayValues()[0].map(function(v){return String(v).trim();});
    expectedHeaders.forEach(function(header){
      if (currentHeaders.indexOf(header) < 0) {
        const nextCol = sh.getLastColumn() + 1;
        sh.getRange(1,nextCol).setValue(header);
        currentHeaders.push(header);
      }
    });
    const record=Object.assign({},input);
    record.id=record.id||Utilities.getUuid(); record.dibuatPada=record.dibuatPada||new Date().toISOString();
    sh.appendRow(HEADERS[name].map(function(k){return record[k]===undefined||record[k]===null?'':record[k];}));
    return output_({ok:true,message:'Data berhasil disimpan.',id:record.id,action:action});
  } catch(err) { return output_({ok:false,error:explainError_(err)}); }
}


// Seluruh fungsi kegiatan, jadwal, scan dan kehadiran berada di KegiatanKehadiran.gs.
// File tersebut wajib berada dalam proyek Apps Script yang sama.

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error('Body permintaan kosong. Kirim JSON melalui POST.');
  try { return JSON.parse(e.postData.contents); } catch(err) { throw new Error('Format body tidak valid. Gunakan JSON yang benar.'); }
}

function explainError_(err) {
  const message=String(err&&err.message?err.message:err);
  if(/invalid_client|OAuth|authorization|otorisasi/i.test(message))
    return 'Otorisasi Google gagal: '+message+'. Ini bukan kesalahan isi spreadsheet. Periksa konfigurasi OAuth/proyek Google Cloud dan izin akun Apps Script.';
  if(/permission|access denied|not have permission/i.test(message))
    return 'Akun yang menjalankan Apps Script belum memiliki izin ke spreadsheet. Pastikan spreadsheet dapat diakses oleh akun tersebut. Detail: '+message;
  return message;
}

/* ==================== DATABASE PENDIDIKAN SANTRI ==================== */
/**
 * Menyiapkan empat tab pendidikan pada database Perizinan KTS PPFHA.
 * Aman: tidak menghapus, menimpa, atau mengubah tab/data yang sudah berisi.
 * Jalankan fungsi ini satu kali dari editor Apps Script.
 */
function setupEducationDatabase() {
  const educationHeaders = {
    RaportMadrasah: [
      'id','tanggalInput','nis','nama','kelas','tahunAjaran',
      'mataPelajaran','kelompok','semester','prestasi','rataRataKelas',
      'ustaz','catatan'
    ],
    UjianAlbab: [
      'id','tanggalInput','nis','nama','kelas','periodeUjian',
      'nilaiTulis','nilaiBaca','nilaiAkhir','catatan','ustaz'
    ],
    HafalanKitab: [
      'id','tanggalInput','nis','nama','kelas','namaKitabNadzom',
      'jenis','targetBait','capaianBait','status','catatan','ustaz'
    ],
    EvaluasiUstaz: ['id','tanggalInput','nis','nama','kelas','kategori','catatanEvaluasi','saranTindakLanjut','ustaz']
  };

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const hasil = [];

    Object.keys(educationHeaders).forEach(function(name) {
      let sh = ss.getSheetByName(name);

      if (!sh) {
        sh = ss.insertSheet(name);
        sh.getRange(1, 1, 1, educationHeaders[name].length)
          .setValues([educationHeaders[name]]);
        sh.setFrozenRows(1);
        hasil.push('Tab ' + name + ' berhasil dibuat beserta header');
        return;
      }

      if (sh.getLastRow() === 0) {
        sh.getRange(1, 1, 1, educationHeaders[name].length)
          .setValues([educationHeaders[name]]);
        sh.setFrozenRows(1);
        hasil.push('Header tab ' + name + ' berhasil ditambahkan');
      } else {
        hasil.push('Tab ' + name + ' sudah ada dan berisi data; tidak diubah');
      }
    });

    const result = {
      ok: true,
      spreadsheet: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      tabs: hasil
    };
    Logger.log(JSON.stringify(result));
    return JSON.stringify(result);
  } catch (err) {
    const message = explainError_(err);
    Logger.log(message);
    throw new Error(message);
  }
}


/**
 * UJI LANGSUNG PENYIMPANAN UJIAN ALBAB.
 * Jalankan manual dari Apps Script editor. Menulis satu baris sementara,
 * memeriksa hasil baca, lalu menghapus baris uji agar database tetap bersih.
 * Tidak memerlukan ADMIN_API_KEY karena dijalankan langsung oleh pemilik script.
 */
function testSaveEducationAlbab() {
  const sheetName = 'UjianAlbab';
  const headers = ['id','tanggalInput','nis','nama','kelas','periodeUjian','nilaiTulis','nilaiBaca','nilaiAkhir','catatan','ustaz'];
  const testId = 'TEST-ALBAB-' + Utilities.getUuid();
  let sh = null, testRow = 0, lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    sh = ss.getSheetByName(sheetName);
    if (!sh) {
      sh = ss.insertSheet(sheetName);
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
    } else if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
    }
    const headerNow = sh.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
    if (headers.some(function(h, i) { return String(headerNow[i]).trim() !== h; })) {
      throw new Error('Header tab UjianAlbab tidak sesuai. Ditemukan: ' + headerNow.join(' | '));
    }
    const nilaiTulis = 50, nilaiBaca = 10, nilaiAkhir = (nilaiTulis + nilaiBaca) / 2;
    const row = [testId, new Date(), 'TEST0000', 'UJI PENYIMPANAN (AKAN DIHAPUS)', 'TEST', 'UJI OTOMATIS', nilaiTulis, nilaiBaca, nilaiAkhir, 'Baris sementara untuk tes fungsi simpan', 'TEST'];
    testRow = sh.getLastRow() + 1;
    sh.getRange(testRow, 1, 1, headers.length).setValues([row]);
    SpreadsheetApp.flush();
    const readBack = sh.getRange(testRow, 1, 1, headers.length).getValues()[0];
    if (String(readBack[0]) !== testId || Number(readBack[6]) !== 50 || Number(readBack[7]) !== 10 || Number(readBack[8]) !== 30) {
      throw new Error('Baris berhasil ditulis tetapi hasil baca ulang tidak cocok.');
    }
    sh.deleteRow(testRow);
    testRow = 0;
    SpreadsheetApp.flush();
    const result = {ok:true, test:'WRITE_READ_DELETE', sheet:sheetName, nilaiTulis:50, nilaiBaca:10, nilaiAkhir:30, temporaryRowRemoved:true, message:'Fungsi tulis, baca ulang, dan hapus baris uji berhasil.'};
    Logger.log(JSON.stringify(result));
    return JSON.stringify(result);
  } catch (err) {
    if (sh && testRow > 0) {
      try {
        const idCell = sh.getRange(testRow, 1).getValue();
        if (String(idCell) === testId) sh.deleteRow(testRow);
      } catch (cleanupErr) { Logger.log('Pembersihan baris uji gagal: ' + cleanupErr.message); }
    }
    const result = {ok:false, test:'WRITE_READ_DELETE', sheet:sheetName, error:explainError_(err)};
    Logger.log(JSON.stringify(result));
    throw new Error(JSON.stringify(result));
  } finally {
    lock.releaseLock();
  }
}


/** Uji idempotensi lokal; tidak mengirim pemberitahuan. */
function testAbsentNotificationKeys() {
  const examples = [
    ['2026-11-02','jamaah','Ashar','20260001'],
    ['2026-11-02','jamaah','Ashar','20260001'],
    ['2026-11-02','jamaah','Maghrib','20260001']
  ];
  const unique = new Set(examples.map(function(row){ return row.join('|'); }));
  return {ok:unique.size===2, input:examples.length, unique:unique.size};
}
