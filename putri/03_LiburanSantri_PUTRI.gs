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
function liburanPeriodeSheet_(){
 var ss=SpreadsheetApp.openById(SPREADSHEET_ID),sh=ss.getSheetByName('MasaLiburan');
 if(!sh){sh=ss.insertSheet('MasaLiburan');sh.appendRow(['id','judul','mulai','akhir','tenggat','jam','status','dibuatPada','diubahPada']);sh.setFrozenRows(1);}
 return sh;
}
function liburanDaftarPeriode_(){
 var rows=liburanPeriodeSheet_().getDataRange().getDisplayValues();
 return rows.slice(1).filter(function(r){return r[0];}).map(function(r){return {id:r[0],judul:r[1],mulai:r[2],akhir:r[3],tenggat:r[4],jam:r[5],status:r[6]};}).reverse();
}
function liburanPeriode_(){
 var all=liburanDaftarPeriode_();
 return all.filter(function(x){return x.status==='Aktif';})[0]||null;
}
function liburanBuatPeriode_(data){
 data=data||{};
 var title=String(data.judul||'').trim(),mulai=String(data.mulai||''),akhir=String(data.akhir||''),tenggat=String(data.tenggat||''),jam=String(data.jam||'');
 if(!title||title.length>120||![mulai,akhir,tenggat].every(function(x){return /^\d{4}-\d{2}-\d{2}$/.test(x);})||!/^([01]\d|2[0-3]):[0-5]\d$/.test(jam)||mulai>akhir||akhir>tenggat)
  return {ok:false,error:'Periksa nama, tanggal mulai, akhir, batas kembali, dan jam kembali.'};
 var lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  var sh=liburanPeriodeSheet_(),id=Utilities.getUuid(),now=Utilities.formatDate(new Date(),'Asia/Jakarta','yyyy-MM-dd HH:mm:ss');
  sh.appendRow([id,title,mulai,akhir,tenggat,jam,'Draf',now,now]);
  return {ok:true,id:id,message:'Masa liburan disimpan sebagai draf.'};
 }finally{lock.releaseLock();}
}
function liburanTerbitkanPengumuman_(period){
 var ss=SpreadsheetApp.openById(SPREADSHEET_ID),sh=ss.getSheetByName('Pengumuman');
 var headers=HEADERS.Pengumuman;
 if(!sh){sh=ss.insertSheet('Pengumuman');sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);}
 if(sh.getLastRow()===0){sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);}
 var current=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getDisplayValues()[0];
 headers.forEach(function(h){if(current.indexOf(h)<0){sh.getRange(1,sh.getLastColumn()+1).setValue(h);current.push(h);}});
 var id='liburan-'+String(period.id),idCol=current.indexOf('id');
 if(sh.getLastRow()>1&&idCol>=0){
  var ids=sh.getRange(2,idCol+1,sh.getLastRow()-1,1).getDisplayValues();
  if(ids.some(function(r){return r[0]===id;}))return {id:id,alreadyExists:true};
 }
 var isi='Informasi resmi '+period.judul+'. Masa liburan: '+period.mulai+' sampai '+period.akhir+'. Batas kembali ke pesantren: '+period.tenggat+' pukul '+period.jam+' WIB. Mohon wali santri memperhatikan jadwal kepulangan.';
 var record={id:id,dibuatPada:new Date().toISOString(),judul:'Pengumuman '+period.judul,kategori:'Liburan',tanggal:period.mulai,target:'Semua',nisTarget:'',isi:isi,status:'Terbit',tanggalMulaiLibur:period.mulai,tanggalAkhirLibur:period.akhir,tanggalKembali:period.tenggat,jamKembali:period.jam};
 sh.appendRow(current.map(function(k){return record[k]===undefined?'':record[k];}));
 return {id:id,alreadyExists:false};
}
function liburanUbahStatus_(data){
 var id=String((data||{}).id||''),target=String((data||{}).status||'');
 if(!id||!['Aktif','Selesai'].includes(target))return {ok:false,error:'Perintah status tidak valid.'};
 var lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  var sh=liburanPeriodeSheet_(),rows=sh.getDataRange().getDisplayValues(),index=-1,active=false;
  for(var i=1;i<rows.length;i++){if(rows[i][0]===id)index=i+1;if(rows[i][6]==='Aktif'&&rows[i][0]!==id)active=true;}
  if(index<0)return {ok:false,error:'Masa liburan tidak ditemukan.'};
  var old=rows[index-1][6];
  if(target==='Aktif'&&(old!=='Draf'||active))return {ok:false,error:'Hanya draf dapat diaktifkan, dan tidak boleh ada masa liburan aktif lain.'};
  if(target==='Selesai'&&old!=='Aktif')return {ok:false,error:'Hanya masa liburan aktif yang dapat diselesaikan.'};
  var announcement=null;
  if(target==='Aktif'){
   var row=rows[index-1];
   announcement=liburanTerbitkanPengumuman_({id:row[0],judul:row[1],mulai:row[2],akhir:row[3],tenggat:row[4],jam:row[5]});
  }
  sh.getRange(index,7).setValue(target);
  sh.getRange(index,9).setValue(Utilities.formatDate(new Date(),'Asia/Jakarta','yyyy-MM-dd HH:mm:ss'));
  return {ok:true,pengumuman:announcement,message:target==='Aktif'?'Masa liburan diaktifkan dan pengumuman diterbitkan.':'Masa liburan diselesaikan dan disimpan sebagai riwayat.'};
 }finally{lock.releaseLock();}
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
  var p=liburanPeriode_();if(!p)return {ok:true,periode:null,riwayat:liburanDaftarPeriode_(),santri:[],jumlah:{total:0,kembali:0,belum:0,terlambat:0}};
  var rows=liburanSheet_().getDataRange().getDisplayValues(),map={};
  rows.slice(1).forEach(function(r){if(String(r[0])===p.id)map[String(r[1])]=r;});
  var santri=liburanSantriAktif_().map(function(x){var r=map[x.nis];x.status=r?String(r[4]):'Belum Kembali';x.waktuKembali=r?String(r[3]):'';return x;});
  return {ok:true,periode:p,riwayat:liburanDaftarPeriode_(),santri:santri,jumlah:{total:santri.length,kembali:santri.filter(function(x){return x.status!=='Belum Kembali';}).length,belum:santri.filter(function(x){return x.status==='Belum Kembali';}).length,terlambat:santri.filter(function(x){return x.status==='Terlambat Kembali';}).length}};
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