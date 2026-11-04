/* Modul kepulangan liburan, terpisah dari absensi dan izin. */
function liburanSheet_() {
  var ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh=ss.getSheetByName('KepulanganLiburan');
  if(!sh){sh=ss.insertSheet('KepulanganLiburan');sh.appendRow(['periodeId','nis','nama','waktuKembali','status']);sh.setFrozenRows(1);}
  return sh;
}
function liburanDate_(value) {
  var s=String(value||'').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  var d=new Date(s);return isNaN(d.getTime())?'':Utilities.formatDate(d,'Asia/Jakarta','yyyy-MM-dd');
}
function liburanPeriode_(){
  var sh=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Pengumuman');
  if(!sh||sh.getLastRow()<2)return null;
  var data=sh.getDataRange().getDisplayValues(),h=data.shift(),today=Utilities.formatDate(new Date(),'Asia/Jakarta','yyyy-MM-dd');
  var periods=data.map(function(row){var x={};h.forEach(function(k,i){x[k]=row[i]||'';});return x;})
   .filter(function(x){return String(x.kategori).toLowerCase()==='liburan'&&String(x.status).toLowerCase()==='terbit';})
   .map(function(x){x.mulai=liburanDate_(x.tanggalMulaiLibur);x.tenggat=liburanDate_(x.tanggalKembali);return x;})
   .filter(function(x){if(!x.mulai||!x.tenggat||x.mulai>today)return false;var d=new Date(x.tenggat+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+30);return today<=d.toISOString().slice(0,10);})
   .sort(function(a,b){return b.mulai.localeCompare(a.mulai);});
  var p=periods[0];return p?{id:String(p.id||p.mulai),judul:String(p.judul||'Liburan Santri'),mulai:p.mulai,tenggat:p.tenggat,jam:String(p.jamKembali||'22:00').slice(0,5)}:null;
}
function liburanSantriAktif_(){
  var sh=SpreadsheetApp.openById(STUDENT_DB_ID).getSheetByName(STUDENT_SHEET_NAME);
  if(!sh)throw new Error('Database santri tidak ditemukan');
  var rows=sh.getDataRange().getDisplayValues(),h=rows.shift().map(function(x){return String(x).toLowerCase().replace(/[^a-z0-9]/g,'');});
  function col(names,fallback){for(var i=0;i<names.length;i++){var j=h.indexOf(names[i]);if(j>=0)return j;}return fallback;}
  var n=col(['nis','nomorinduksantri'],0),a=col(['nama','namasantri','namalengkap'],1),s=col(['status','statussantri'],7);
  return rows.filter(function(r){return /^\d+$/.test(String(r[n]||''))&&(!String(r[s]||'').trim()||/^(aktif|active)$/i.test(String(r[s]).trim()));})
   .map(function(r){return {nis:String(r[n]),nama:String(r[a]||'')};});
}
function liburanRekap_(){
  var p=liburanPeriode_();if(!p)return {ok:true,periode:null,santri:[],jumlah:{total:0,kembali:0,belum:0,terlambat:0}};
  var rows=liburanSheet_().getDataRange().getDisplayValues(),map={};
  rows.slice(1).forEach(function(r){if(String(r[0])===p.id)map[String(r[1])]=r;});
  var santri=liburanSantriAktif_().map(function(x){var r=map[x.nis];x.status=r?String(r[4]):'Belum Kembali';x.waktuKembali=r?String(r[3]):'';return x;});
  return {ok:true,periode:p,santri:santri,jumlah:{total:santri.length,kembali:santri.filter(function(x){return x.status!=='Belum Kembali';}).length,belum:santri.filter(function(x){return x.status==='Belum Kembali';}).length,terlambat:santri.filter(function(x){return x.status==='Terlambat Kembali';}).length}};
}
function liburanScanKembali_(rawNis){
  var nis=String(rawNis||'').replace(/\D/g,'');if(!nis)return {ok:false,error:'NIS tidak valid'};
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var p=liburanPeriode_();if(!p)return {ok:false,error:'Belum ada periode liburan yang berlaku'};
    var santri=liburanSantriAktif_().filter(function(x){return x.nis===nis;})[0];
    if(!santri)return {ok:false,error:'NIS tidak ditemukan pada daftar santri aktif'};
    var sh=liburanSheet_(),rows=sh.getDataRange().getDisplayValues();
    for(var i=1;i<rows.length;i++)if(String(rows[i][0])===p.id&&String(rows[i][1])===nis)
      return {ok:true,duplikat:true,nis:nis,nama:santri.nama,status:String(rows[i][4]),waktuKembali:String(rows[i][3])};
    var now=Utilities.formatDate(new Date(),'Asia/Jakarta','yyyy-MM-dd HH:mm:ss');
    var status=now.slice(0,16)>p.tenggat+' '+p.jam?'Terlambat Kembali':'Sudah Kembali';
    sh.appendRow([p.id,nis,santri.nama,now,status]);
    return {ok:true,duplikat:false,nis:nis,nama:santri.nama,status:status,waktuKembali:now};
  }finally{lock.releaseLock();}
}