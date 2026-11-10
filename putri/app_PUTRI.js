const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
/* Handler prioritas tombol pengaturan nominal SPP PUTRI.
   Gunakan closest() agar klik pada teks/elemen di dalam tombol tetap tertangkap. */
document.addEventListener('click',function(event){
 const button=event.target&&event.target.closest?event.target.closest('#sppLoadSettings, #sppSaveSettings'):null;
 if(!button)return;
 event.preventDefault();
 event.stopImmediatePropagation();
 if(button.id==='sppLoadSettings'){
  if(typeof sppLoadSettings==='function') sppLoadSettings();
  else console.error('sppLoadSettings belum tersedia');
 }else if(button.id==='sppSaveSettings'){
  if(typeof sppSaveSettings==='function') sppSaveSettings();
  else console.error('sppSaveSettings belum tersedia');
 }
},true);
/* Jalur tombol khusus Hafalan/Nadzom: capture di tingkat dokumen agar klik selalu tertangkap. */
document.addEventListener('click',function(event){
 const button=event.target&&event.target.closest?event.target.closest('#findHafalan, #scanHafalan'):null;
 if(!button)return;
 event.preventDefault();
 event.stopImmediatePropagation();
 if(button.id==='findHafalan'){
  if(typeof lookupHafalanStudent==='function') lookupHafalanStudent();
  else console.error('lookupHafalanStudent belum tersedia');
 }else{
  if(typeof openQr==='function') openQr('hafalan');
  else console.error('openQr belum tersedia');
 }
},true);
document.addEventListener('keydown',function(event){
 if(event.key!=='Enter')return;
 const input=event.target&&event.target.closest?event.target.closest('#hafalanNis'):null;
 if(!input)return;
 event.preventDefault();
 event.stopImmediatePropagation();
 if(typeof lookupHafalanStudent==='function')lookupHafalanStudent();
},true);

/* Handler pendidikan dipasang sejak awal agar tetap aktif bila inisialisasi modul lain mengalami error. */
document.addEventListener('click',function(e){
 const target=e.target&&e.target.closest?e.target.closest('#scanAlbab, #findAlbab'):null;
 if(!target)return;
 e.preventDefault();
 if(target.id==='scanAlbab'){openQr('albab');return;}
 if(target.id==='findAlbab'){lookupAlbabStudent();return;}
},true);
document.addEventListener('keydown',function(e){
 if(e.key!=='Enter')return;
 const input=e.target&&e.target.closest?e.target.closest('#albabNis'):null;
 if(!input)return;
 e.preventDefault();lookupAlbabStudent();
},true);
const API_URL='https://script.google.com/macros/s/AKfycbxyn0OdDg-sVCIMS1DDjzVi5N0fTwD4fJcPDMa-2CtMYgWhhHWpwSc2YRFEomLcGFfcnA/exec';
const data={izin:[],peng:[],keg:[]};const names={dashboard:'Dashboard',izin:'Izin Santri',pengumuman:'Pengumuman',kegiatan:'Kegiatan & Jadwal',kehadiran:'Kegiatan & Kehadiran',pendidikan:'Pendidikan Santri',liburan:'Liburan Santri','finance-dashboard':'Dashboard Keuangan',spp:'SPP Santri','spp-portal':'Portal Bayar SPP',uangjajan:'Uang Jajan Santri',bendahara:'Bendahara',laporan:'Laporan Keuangan'};let adminKey=sessionStorage.getItem('ppfha_admin_key')||'';
function go(p){
 const pages=$$('.page'),navs=$$('.nav');
 pages.forEach(el=>{const active=el.id===p;el.classList.toggle('active',active);el.hidden=!active;});
 navs.forEach(el=>{const active=el.dataset.page===p;el.classList.toggle('active',active);el.setAttribute('aria-current',active?'page':'false');});
 const title=$('#title');if(title)title.textContent=names[p]||'Dashboard';
 window.scrollTo({top:0,behavior:'instant'});
 if(p==='izin')loadIzin();if(p==='liburan')loadLiburan();if(p==='kehadiran')loadAttendanceConfig();
}

function openEducationModule(module){
 const menu=$('#educationMenu');if(menu)menu.classList.add('hidden');
 $$('.education-detail').forEach(x=>x.classList.add('hidden'));
 const target=module==='raport'?'#educationRaportPage':module==='albab'?'#educationAlbabPage':module==='hafalan'?'#educationHafalanPage':module==='evaluasi'?'#educationEvaluasiPage':'';
 if(target&&$(target))$(target).classList.remove('hidden');
 const title=module==='raport'?'Nilai Raport Madrasah':module==='albab'?'Nilai Ujian Kitab Metode Albab':module==='evaluasi'?'Catatan & Evaluasi Ustaz':'Hafalan Kitab & Nadzom';
 $('#title').textContent=title;window.scrollTo(0,0);
}
function showEducationMenu(){
 $('#educationMenu').classList.remove('hidden');
 $$('.education-detail').forEach(x=>x.classList.add('hidden'));
 $('#title').textContent='Pendidikan Santri';window.scrollTo(0,0);
}
document.addEventListener('click',e=>{
 const nav=e.target.closest('button.nav[data-page]');
 if(nav){e.preventDefault();go(nav.dataset.page);return;}
 const quick=e.target.closest('[data-go]');
 if(quick){e.preventDefault();go(quick.dataset.go);return;}
 const tile=e.target.closest('[data-education-open]');
 if(tile){e.preventDefault();openEducationModule(tile.dataset.educationOpen);return;}
 const back=e.target.closest('.education-back');
 if(back){e.preventDefault();showEducationMenu();}
},false);

// Tombol pemindai barcode khusus pencarian NIS raport madrasah.
document.addEventListener('click',function(e){const b=e.target.closest('#scanRaport');if(!b)return;e.preventDefault();openQr('raport')});
function requestAdminKey(title){return new Promise(resolve=>{const modal=$('#adminKeyModal'),form=$('#adminKeyForm'),input=$('#adminKeyInput'),desc=$('#adminKeyDescription'),cancel=$('#cancelAdminKey');if(!modal||!form||!input){resolve('');return}desc.textContent=title+' — masukkan kunci pengurus untuk melanjutkan.';input.value='';modal.classList.remove('hidden');setTimeout(()=>input.focus(),80);let settled=false;const finish=value=>{if(settled)return;settled=true;modal.classList.add('hidden');form.removeEventListener('submit',submit);cancel.removeEventListener('click',cancelClick);modal.removeEventListener('click',outside);resolve(value)};const submit=e=>{e.preventDefault();const value=input.value.trim();if(!value){input.focus();return}adminKey=value;sessionStorage.setItem('ppfha_admin_key',value);finish(value)};const cancelClick=()=>finish('');const outside=e=>{if(e.target===modal)finish('')};form.addEventListener('submit',submit);cancel.addEventListener('click',cancelClick);modal.addEventListener('click',outside)})}
let toastTimer;function toast(s){$('#toast').textContent=s;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',4000)}
function askConfirmation(title,message,confirmLabel){return new Promise(resolve=>{const overlay=document.createElement('div');overlay.className='confirm-overlay';overlay.innerHTML='<section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmTitle"><div class="confirm-icon" aria-hidden="true">☾</div><h3 id="confirmTitle"></h3><p class="confirm-message"></p><div class="confirm-actions"><button type="button" class="secondary confirm-cancel">Batal</button><button type="button" class="primary confirm-accept"></button></div></section>';const heading=overlay.querySelector('#confirmTitle'),body=overlay.querySelector('.confirm-message'),cancel=overlay.querySelector('.confirm-cancel'),accept=overlay.querySelector('.confirm-accept');heading.textContent=title;body.textContent=message;accept.textContent=confirmLabel||'Ya, Lanjutkan';const finish=value=>{overlay.remove();document.removeEventListener('keydown',onKey);resolve(value)};const onKey=e=>{if(e.key==='Escape')finish(false)};cancel.onclick=()=>finish(false);accept.onclick=()=>finish(true);overlay.addEventListener('click',e=>{if(e.target===overlay)finish(false)});document.addEventListener('keydown',onKey);document.body.appendChild(overlay);cancel.focus()})}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function dateOnly(s){if(!s)return'—';const d=new Date(s);return isNaN(d)?String(s):d.toLocaleDateString('id-ID')}
function dateTime(s){if(!s)return'—';const d=new Date(s);return isNaN(d)?String(s):d.toLocaleDateString('id-ID')+'<br><small>'+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+'</small>'}
let lastStudentLookup='';
async function lookupStudent(nis){nis=String(nis||'').trim().replace(/\D/g,'');if(!nis)return;const nameInput=$('#formIzin [name="nama"]');if(!nameInput)return;lastStudentLookup=nis;nameInput.value='';nameInput.placeholder='Mencari biodata santri…';try{const r=await fetch(API_URL+'?action=student&nis='+encodeURIComponent(nis),{cache:'no-store'});const j=await r.json();if(lastStudentLookup!==nis)return;if(!j.ok||!j.data)throw new Error(j.error||'Biodata tidak ditemukan');nameInput.value=j.data.nama||'';nameInput.placeholder='Nama lengkap santri';const old=$('#studentLookupInfo');if(old)old.remove();const info=document.createElement('small');info.id='studentLookupInfo';info.style.cssText='display:block;color:#18734f;margin-top:5px';info.textContent='✓ '+(j.data.nama||'Santri')+(j.data.kelas?' · '+j.data.kelas:'')+(j.data.asrama?' · '+j.data.asrama:'');nameInput.insertAdjacentElement('afterend',info);const wali=$('#formIzin [name="wali"]');if(wali&&!wali.value&&j.data.wali)wali.value=j.data.wali;toast('Biodata santri ditemukan.')}catch(err){nameInput.placeholder='Nama lengkap santri';toast(err.message||'Biodata santri belum dapat dibaca.')}}
function chooseStatus(current){return new Promise(resolve=>{const modal=document.createElement('div');modal.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(10,25,20,.55);display:flex;align-items:center;justify-content:center;padding:20px';const panel=document.createElement('div');panel.style.cssText='width:min(100%,380px);background:#fff;border-radius:18px;padding:22px;box-shadow:0 18px 50px rgba(0,0,0,.22);color:#173c30';const title=document.createElement('h3');title.textContent='Pilih Status Izin';title.style.cssText='margin:0 0 8px;font-size:20px';const sub=document.createElement('p');sub.textContent='Sentuh status yang sesuai:';sub.style.cssText='margin:0 0 16px;color:#64756d;font-size:14px';const list=document.createElement('div');list.style.cssText='display:grid;gap:9px';['Diizinkan','Menunggu persetujuan','Ditolak','Sudah keluar','Sudah kembali','Sudah Sehat'].forEach(status=>{const b=document.createElement('button');b.type='button';b.textContent=status;b.style.cssText='width:100%;padding:13px 14px;border-radius:10px;border:1px solid '+(status===current?'#18734f':'#dce6e0')+';background:'+(status===current?'#e8f5ee':'#fff')+';color:#173c30;text-align:left;font-size:15px;font-weight:600;cursor:pointer';b.onclick=()=>{modal.remove();resolve(status)};list.appendChild(b)});const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Batal';cancel.style.cssText='margin-top:14px;width:100%;padding:11px;border:0;border-radius:10px;background:#f1f4f2;color:#41564d;font-weight:600;cursor:pointer';cancel.onclick=()=>{modal.remove();resolve(null)};panel.append(title,sub,list,cancel);modal.appendChild(panel);modal.addEventListener('click',e=>{if(e.target===modal){modal.remove();resolve(null)}});document.body.appendChild(modal)})}
function statusClass(s){s=String(s||'').toLowerCase();if(s.includes('kembali')||s.includes('selesai')||s.includes('sehat'))return'status-done';if(s.includes('tolak'))return'status-rejected';if(s.includes('tunggu'))return'status-pending';return'status-active'}
function renderIzin(){const q=($('#search').value||'').toLowerCase(),jenis=$('#filterJenis').value,status=$('#filterStatus').value;const a=data.izin.filter(x=>{const hay=[x.nama,x.nis,x.catatan,x.wali].join(' ').toLowerCase();return hay.includes(q)&&(!jenis||x.jenis===jenis)&&(!status||x.status===status)});$('#nIzin').textContent=data.izin.length;$('#rows').innerHTML=a.length?a.slice().reverse().map((x,i)=>{const isExit=/izin (keluar|pulang)/.test(String(x.jenis||'').toLowerCase()),isSick=String(x.jenis||'').toLowerCase()==='izin sakit',statusKey=String(x.status||'').trim().toLowerCase(),isClosed=['sudah kembali','sudah sehat','ditolak','dibatalkan'].includes(statusKey),deadline=x.rencanaKembali?new Date(x.rencanaKembali):null,actual=x.kembali&&String(x.kembali).trim()&&String(x.kembali).trim()!=='—'?new Date(x.kembali):null,validDeadline=deadline&&!isNaN(deadline.getTime()),lateWhenReturned=isExit&&isClosed&&validDeadline&&actual&&!isNaN(actual.getTime())&&actual.getTime()>deadline.getTime(),lateNow=isExit&&!isClosed&&validDeadline&&deadline.getTime()<Date.now()&&['diizinkan','sudah keluar'].includes(statusKey),late=lateWhenReturned||lateNow,lateMinutes=lateWhenReturned?Math.ceil((actual-deadline)/60000):lateNow?Math.ceil((Date.now()-deadline)/60000):0,shownStatus=lateNow?'Terlambat kembali':(x.status||'Menunggu persetujuan'),rawNote=String(x.catatan||'').replace(/\s*\|?\s*TERLAMBAT KEMBALI\s+\d+\s+menit(?:\s*\(batas\s+[^)]*\))?/ig,'').trim(),deadlineLabel=validDeadline?String(deadline.getHours()).padStart(2,'0')+'.'+String(deadline.getMinutes()).padStart(2,'0'):'',lateNote=late?'Terlambat '+lateMinutes+' menit'+(deadlineLabel?' (batas '+deadlineLabel+')':''):'',note=[rawNote&&rawNote!=='—'?rawNote:'',lateNote].filter(Boolean).join(' · ')||'—';return '<tr><td>'+(i+1)+'</td><td>'+dateTime(x.keluar)+'</td><td><b>'+esc(x.nama)+'</b><br><small>NIS '+esc(x.nis)+'</small></td><td>'+esc(x.jenis)+'</td><td>'+dateOnly(x.keluar)+'<br><small>s/d '+dateOnly(x.rencanaKembali)+'</small></td><td>'+esc(x.wali||'—')+'</td><td>'+esc(note)+''+'</td><td><span class="status-pill '+statusClass(shownStatus)+'">'+esc(shownStatus)+'</span></td><td>'+((!isSick&&!['sudah kembali','sudah sehat','ditolak'].includes(String(x.status||'').trim().toLowerCase())&&x.id)?'<button type="button" class="primary return-now" data-id="'+esc(x.id)+'" style="margin-bottom:6px;padding:9px 10px;font-size:12px;white-space:nowrap">✓ Sudah kembali</button><br>':'')+((isExit&&!isClosed&&x.id)?'<button type="button" class="secondary extend-permit" data-id="'+esc(x.id)+'">📅 Perpanjang Izin</button><br>':'')+'<button type="button" class="secondary edit-status" data-id="'+esc(x.id||'')+'" data-status="'+esc(x.status||'Menunggu persetujuan')+'" '+(!x.id?'disabled title="Data lama belum memiliki ID"':'')+'>'+(isSick?'✓ Sudah Sehat':'Ubah Status')+'</button></td></tr>';}).join(''):'<tr><td colspan="9" class="empty">Tidak ada data izin yang cocok.</td></tr>'}
function render(){renderIzin();const aktif=data.izin.filter(x=>!['sudah kembali','sudah sehat','ditolak'].includes(String(x.status||'').trim().toLowerCase())).length;$('#nIzin').textContent=aktif;$('#nPeng').textContent=data.peng.length;$('#nKeg').textContent=data.keg.length}
async function loadIzin(){const body=$('#rows');if(body)body.innerHTML='<tr><td colspan="8" class="empty">Memuat data izin dari database…</td></tr>';try{const r=await fetch(API_URL+'?action=izin',{cache:'no-store'});const j=await r.json();if(!j.ok)throw new Error(j.error||'Gagal membaca database');data.izin=Array.isArray(j.data)?j.data:[];render()}catch(err){if(body)body.innerHTML='<tr><td colspan="8" class="empty">Data belum berhasil dimuat. Periksa koneksi lalu tekan Muat ulang.</td></tr>';toast('Koneksi data izin gagal: '+err.message)}}
let qrScanner=null,qrTarget=null,qrStarting=false,qrLocked=false;
async function closeQr(){
 qrLocked=true;
 if(qrScanner){try{if(qrScanner.isScanning)await qrScanner.stop()}catch(e){}try{qrScanner.clear()}catch(e){}qrScanner=null}
 const reader=$('#qrReader');if(reader)reader.innerHTML='';
 const modal=$('#qrModal');if(modal)modal.classList.add('hidden');
 qrStarting=false;qrLocked=false;
}
async function handleQrDecoded(decoded){
 if(qrLocked)return;
 const raw=String(decoded||'').trim();let value=raw;
 try{const obj=JSON.parse(raw);value=obj.nis||obj.NIS||obj.nomorInduk||obj.nomor_induk||obj.id||obj.value||raw}catch(e){}
 const payload=String(value||raw).trim();
 // QR kartu KTS: PPFHA|KTS|NIS:20260001
 const nisMatch=payload.match(/NIS\s*[:=：-]\s*(\d+)/i);
 const lastPart=payload.split(/[|;]/).pop()||payload;
 const nis=(nisMatch&&nisMatch[1])||(lastPart.match(/\d+/g)||[]).join('');
 if(!nis){$('#qrMessage').textContent='QR terbaca, tetapi isi QR tidak memuat NIS.';return}
 qrLocked=true;$('#qrMessage').textContent='QR terbaca. Memuat biodata santri…';
 if(qrTarget==='liburan'){await closeQr();await catatLiburan(nis);return}
 if(qrTarget==='spp'){await closeQr();$('#sppNis').value=nis;await sppFindStudent(nis);return}
 if(qrTarget==='spp-portal'){await closeQr();$('#sppPortalNis').value=nis;await sppPortalFindStudent(nis);return}
 if(qrTarget==='attendance'){if(!currentAttendanceActivity){await closeQr();toast('Pilih kegiatan terlebih dahulu.');return}enqueueAttendanceScan(nis);await closeQr();toast('NIS '+nis+' masuk antrean penyimpanan. Buka scan untuk santri berikutnya.');return}
 const targets={raport:['#raportNis',lookupRaportStudent],albab:['#albabNis',lookupAlbabStudent],hafalan:['#hafalanNis',lookupHafalanStudent],evaluasi:['#evaluasiNis',lookupEvaluasiStudent]};
 if(targets[qrTarget]){const input=$(targets[qrTarget][0]);if(!input){await closeQr();toast('Kolom NIS tidak ditemukan.');return}input.value=nis;await closeQr();await targets[qrTarget][1]();return}
 const input=$('#nisInput');if(!input){await closeQr();toast('Kolom NIS tidak ditemukan.');return}
 input.value=nis;$('#formIzin').classList.remove('hidden');if(qrTarget==='search'){$('#search').value=nis;renderIzin()}
 await closeQr();$('#formIzin').scrollIntoView({behavior:'smooth',block:'start'});await lookupStudent(nis)
}
async function openQr(target){
 if(qrStarting)return;
 qrStarting=true;qrTarget=target;qrLocked=false;
 const modal=$('#qrModal'),reader=$('#qrReader'),message=$('#qrMessage');
 if(!modal||!reader||!message){qrStarting=false;toast('Panel pemindai QR tidak ditemukan.');return}
 modal.classList.remove('hidden');message.textContent='Memeriksa izin dan perangkat kamera…';
 reader.innerHTML='<div id="qrCameraMount" style="width:100%;min-height:260px"></div>';
 try{
  if(!window.isSecureContext)throw new Error('Kamera hanya bisa dibuka melalui alamat HTTPS.');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('Browser ini tidak menyediakan akses kamera. Buka website langsung melalui Chrome.');
  if(typeof window.Html5Qrcode!=='function')throw new Error('Modul pemindai QR belum termuat. Periksa internet lalu muat ulang website.');
  qrScanner=new Html5Qrcode('qrCameraMount',{verbose:false});
  message.textContent='Meminta izin kamera…';
  // Prefer selecting a real camera ID; this is more reliable on Android WebView/Chrome than facingMode alone.
  let cameras=[];
  try{cameras=await Html5Qrcode.getCameras()}catch(cameraError){}
  if(cameras&&cameras.length){
   const back=cameras.find(c=>/back|rear|environment|belakang/i.test(c.label||''))||cameras[cameras.length-1];
   message.textContent='Kamera ditemukan. Mengaktifkan kamera…';
   await qrScanner.start(back.id,{fps:20,qrbox:(w,h)=>{const size=Math.max(180,Math.floor(Math.min(w,h)*0.72));return {width:Math.min(size,w),height:Math.min(size,h)}},aspectRatio:1.0,disableFlip:false},decoded=>handleQrDecoded(decoded),()=>{});
  }else{
   message.textContent='Mencoba kamera belakang…';
   await qrScanner.start({facingMode:{ideal:'environment'}},{fps:20,qrbox:(w,h)=>{const size=Math.max(180,Math.floor(Math.min(w,h)*0.72));return {width:Math.min(size,w),height:Math.min(size,h)}},aspectRatio:1.0,disableFlip:false},decoded=>handleQrDecoded(decoded),()=>{});
  }
  qrStarting=false;
  if(!qrLocked)message.textContent='Kamera aktif. Arahkan QR pada kartu santri ke kotak pemindai.';
 }catch(err){
  const msg=String(err&&err.message||err||'Kesalahan tidak diketahui');
  let help=msg;
  if(/NotAllowed|Permission|denied|Permission dismissed/i.test(msg))help='Izin kamera ditolak. Buka ikon pengaturan situs di Chrome, izinkan Kamera, lalu muat ulang.';
  else if(/NotFound|Requested device|no camera/i.test(msg))help='Kamera tidak ditemukan pada perangkat ini.';
  else if(/NotReadable|Could not start|in use/i.test(msg))help='Kamera sedang dipakai aplikasi lain. Tutup Kamera/WhatsApp lalu coba lagi.';
  else if(/secure|HTTPS/i.test(msg))help='Buka website Program PUTRI melalui alamat HTTPS dari proyek Vercel PUTRI.';
  message.textContent='Kamera belum bisa dibuka: '+help;
  if(qrScanner){try{if(qrScanner.isScanning)await qrScanner.stop()}catch(e){}try{qrScanner.clear()}catch(e){}qrScanner=null}
  qrStarting=false;toast('Kamera gagal dibuka: '+help);
 }
}
const jenisSelect=$('#formIzin [name="jenis"]');
const keluarInput=$('#formIzin [name="keluar"]');
const kembaliInput=$('#formIzin [name="rencanaKembali"]');
function applyJenisIzin(){
 const isKeluar=jenisSelect.value==='Izin Keluar (berbatas waktu)',isSick=jenisSelect.value==='Izin Sakit';
 const label=keluarInput.closest('label'); if(label)label.querySelector('label');
 const planLabel=kembaliInput.closest('label');
 const freshKeluar=$('#formIzin [name="keluar"]'),freshKembali=$('#formIzin [name="rencanaKembali"]');
 const now=new Date();now.setMinutes(now.getMinutes()-now.getTimezoneOffset());const local=now.toISOString().slice(0,16);
 if(label){label.style.display='';label.querySelector('input').required=!isSick;label.firstChild.textContent=(isKeluar?'Waktu Keluar *':isSick?'Mulai Izin Sakit *':'Tanggal / Waktu Berangkat *');}
 if(planLabel){planLabel.style.display=isSick?'none':'';freshKembali.required=!isSick;planLabel.firstChild.textContent=(isKeluar?'Batas Waktu Kembali *':'Rencana Kembali *');}
 const actualLabel=$('#formIzin [name="kembali"]').closest('label');if(actualLabel)actualLabel.style.display=isSick?'none':'';
 if(!freshKeluar.value||isSick)freshKeluar.value=local;
 if(!freshKembali.value&&!isSick){const later=new Date(now);later.setHours(later.getHours()+(isKeluar?0:24));freshKembali.value=later.toISOString().slice(0,16);}
 const statusSelect=$('#formIzin [name="status"]');
 if(statusSelect){statusSelect.value=isSick?'Sakit':'Diizinkan';statusSelect.disabled=isSick;}
}
jenisSelect.addEventListener('change',applyJenisIzin);
$('#formIzin').addEventListener('change',e=>{if(e.target.name==='keluar'){applyJenisIzin();return}if(e.target.name==='rencanaKembali'&&jenisSelect.value==='Izin Keluar (berbatas waktu)'){const start=new Date($('#formIzin [name="keluar"]').value),end=new Date(e.target.value);if(end<start){e.target.value=$('#formIzin [name="keluar"]').value;toast('Batas kembali tidak boleh lebih awal dari waktu keluar.')}}});
$('#nisInput').addEventListener('change',()=>lookupStudent($('#nisInput').value));$('#nisInput').addEventListener('blur',()=>lookupStudent($('#nisInput').value));
$('#scanSearch').onclick=()=>openQr('search');$('#scanForm').onclick=()=>openQr('form');$('#closeQr').onclick=()=>closeQr();$('#qrModal').addEventListener('click',e=>{if(e.target===$('#qrModal'))closeQr()});
$('#showIzin').onclick=()=>{$('#formIzin').classList.remove('hidden');applyJenisIzin();$('#formIzin').scrollIntoView({behavior:'smooth',block:'start'})};$('#cancelIzin').onclick=()=>{$('#formIzin').classList.add('hidden');$('#formIzin').reset()};$('#search').oninput=renderIzin;$('#filterJenis').onchange=renderIzin;$('#filterStatus').onchange=renderIzin;$('#refreshIzin').onclick=loadIzin;
function ppfhaFormPerpanjangan_(row){
 return new Promise(resolve=>{
  const old=document.getElementById('ppfhaExtendDialog');if(old)old.remove();
  const wrap=document.createElement('div');wrap.id='ppfhaExtendDialog';
  wrap.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.58);display:flex;align-items:center;justify-content:center;padding:18px';
  wrap.innerHTML='<div style="background:#fff;color:#20332d;border-radius:16px;padding:22px;width:min(460px,100%);box-shadow:0 18px 55px rgba(0,0,0,.25)"><h3 style="margin:0 0 8px;font-size:20px">Perpanjang Izin</h3><p style="margin:0 0 16px;color:#66736e">Santri: <b>'+esc(row.nama)+'</b><br>NIS: '+esc(row.nis)+'</p><label style="display:block;font-weight:600;margin:10px 0 6px">Tanggal dan jam kembali yang baru</label><input id="ppfhaExtendDate" type="datetime-local" style="box-sizing:border-box;width:100%;padding:13px;border:1px solid #ccd6d1;border-radius:10px;font:inherit"><label style="display:block;font-weight:600;margin:14px 0 6px">Alasan perpanjangan</label><textarea id="ppfhaExtendReason" rows="3" placeholder="Contoh: Belum sembuh dan masih menjalani pengobatan" style="box-sizing:border-box;width:100%;padding:12px;border:1px solid #ccd6d1;border-radius:10px;font:inherit;resize:vertical"></textarea><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px"><button type="button" id="ppfhaExtendCancel" style="padding:11px 17px;border:0;border-radius:9px;background:#edf2ef;color:#40534b">Batal</button><button type="button" id="ppfhaExtendSave" style="padding:11px 17px;border:0;border-radius:9px;background:#176b50;color:#fff;font-weight:600">Lanjutkan</button></div></div>';
  document.body.appendChild(wrap);
  const finish=v=>{wrap.remove();resolve(v)};
  wrap.querySelector('#ppfhaExtendCancel').onclick=()=>finish(null);
  wrap.addEventListener('click',e=>{if(e.target===wrap)finish(null)});
  wrap.querySelector('#ppfhaExtendSave').onclick=()=>{
   const date=wrap.querySelector('#ppfhaExtendDate').value,reason=wrap.querySelector('#ppfhaExtendReason').value.trim();
   if(!date){toast('Tanggal dan jam kembali wajib diisi.');return}
   if(!reason){toast('Alasan perpanjangan wajib diisi.');return}
   const d=new Date(date);if(isNaN(d.getTime())||d.getTime()<=Date.now()){toast('Tanggal kembali harus di masa mendatang.');return}
   finish({date:date,reason:reason});
  };
 });
}
$('#rows').addEventListener('click',async e=>{
 const btn=e.target.closest('.extend-permit');if(!btn)return;
 const row=data.izin.find(x=>String(x.id)===String(btn.dataset.id));if(!row)return;
 const form=await ppfhaFormPerpanjangan_(row);if(!form)return;
 if(!confirm('Perpanjang izin '+row.nama+' hingga '+form.date.replace('T',' ')+' WIB?'))return;
 if(!adminKey){adminKey=await requestAdminKey('Perpanjang izin santri');if(!adminKey)return;adminKey=adminKey.trim();if(!adminKey){toast('Kunci pengurus tidak boleh kosong.');return}sessionStorage.setItem('ppfha_admin_key',adminKey)}
 btn.disabled=true;
 try{
  const res=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'perpanjangizin',apiKey:adminKey,id:row.id,rencanaKembali:form.date,alasan:form.reason})});
  const json=await res.json();if(!json.ok)throw Error(json.error||'Gagal memperpanjang');
  await loadIzin();toast('Izin diperpanjang hingga '+json.batasBaru+' WIB.');
 }catch(err){toast('Gagal: '+err.message)}finally{btn.disabled=false}
});
$('#rows').addEventListener('click',async e=>{const returnBtn=e.target.closest('.return-now');if(returnBtn){if(!confirm('Konfirmasi santri ini sudah kembali ke pesantren?'))return;if(!adminKey){adminKey=await requestAdminKey('Konfirmasi kepulangan santri');if(!adminKey)return;adminKey=adminKey.trim();if(!adminKey)return;sessionStorage.setItem('ppfha_admin_key',adminKey)}returnBtn.disabled=true;returnBtn.textContent='Menyimpan…';try{const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify((()=>{const row=data.izin.find(x=>String(x.id)===String(returnBtn.dataset.id));const now=new Date();const deadline=row&&row.rencanaKembali?new Date(row.rencanaKembali):null;const late=deadline&&!isNaN(deadline.getTime())&&now.getTime()>deadline.getTime();const minutes=late?Math.ceil((now.getTime()-deadline.getTime())/60000):0;const note=late?((row.catatan&&row.catatan!=='—'?row.catatan+' | ':'')+'TERLAMBAT KEMBALI '+minutes+' menit (batas '+deadline.toLocaleString('id-ID')+')'):(row&&row.catatan?row.catatan:'');return {action:'updateStatus',apiKey:adminKey,id:returnBtn.dataset.id,status:'Sudah kembali',kembaliAt:now.toISOString(),catatan:note}})())});const j=await r.json();if(!j.ok)throw new Error(j.error||'Gagal mencatat kepulangan');await loadIzin();toast('Santri ditandai sudah kembali ke pesantren.')}catch(err){toast('Belum berhasil: '+err.message)}finally{returnBtn.disabled=false;returnBtn.textContent='✓ Sudah kembali'}return}const btn=e.target.closest('.edit-status');if(!btn)return;const statuses=['Diizinkan','Menunggu persetujuan','Ditolak','Sudah keluar','Sudah kembali','Sudah Sehat'];const current=btn.dataset.status;const next=await chooseStatus(current);if(next===null)return;if(next===current){toast('Status tidak berubah.');return}if(!adminKey){adminKey=await requestAdminKey('Ubah status izin santri');if(!adminKey)return;adminKey=adminKey.trim();if(!adminKey)return;sessionStorage.setItem('ppfha_admin_key',adminKey)}btn.disabled=true;btn.textContent='Menyimpan…';try{const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'updateStatus',apiKey:adminKey,id:btn.dataset.id,status:next,kembaliAt:next==='Sudah kembali'?new Date().toISOString():''})});const j=await r.json();if(!j.ok)throw new Error(j.error||'Gagal mengubah status');await loadIzin();toast('Status izin diperbarui menjadi '+next+'.')}catch(err){adminKey='';sessionStorage.removeItem('ppfha_admin_key');toast('Status belum berubah: '+err.message)}finally{btn.disabled=false;btn.textContent='Ubah Status'}});
$('#formIzin').onsubmit=async e=>{e.preventDefault();const form=e.target,d=Object.fromEntries(new FormData(form).entries());if(d.jenis==='Izin Sakit'){const n=new Date();n.setMinutes(n.getMinutes()-n.getTimezoneOffset());d.keluar=n.toISOString().slice(0,16);d.rencanaKembali='';d.kembali='';d.status='Sakit'}if(d.jenis==='Izin Keluar (berbatas waktu)'&&!d.rencanaKembali){toast('Izin keluar wajib memiliki batas waktu kembali.');return}if(d.jenis!=='Izin Sakit'&&new Date(d.rencanaKembali)<new Date(d.keluar)){toast('Batas kembali tidak boleh lebih awal dari waktu keluar.');return}if(!adminKey){adminKey=await requestAdminKey('Simpan izin santri');if(!adminKey){toast('Penyimpanan dibatalkan.');return}adminKey=adminKey.trim();if(!adminKey){adminKey='';toast('Kunci pengurus tidak boleh kosong.');return}sessionStorage.setItem('ppfha_admin_key',adminKey)}const btn=form.querySelector('button[type="submit"]'),old=btn.textContent;btn.disabled=true;btn.textContent='Menyimpan…';try{const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'izin',apiKey:adminKey,data:d})});const j=await r.json();if(!j.ok)throw new Error(j.error||'Data gagal disimpan');form.reset();form.classList.add('hidden');await loadIzin();toast('Izin berhasil disimpan ke database.')}catch(err){adminKey='';sessionStorage.removeItem('ppfha_admin_key');toast('Penyimpanan belum terkonfirmasi: '+err.message+'. Kunci sesi dihapus; coba lagi.')}finally{btn.disabled=false;btn.textContent=old}};
async function loadCollection(action,bodyId,kind){const body=$(bodyId);if(body)body.innerHTML='<tr><td colspan="7" class="empty">Memuat data…</td></tr>';try{const r=await fetch(API_URL+'?action='+action,{cache:'no-store'});const j=await r.json();if(!j.ok)throw new Error(j.error||'Gagal membaca data');data[kind]=Array.isArray(j.data)?j.data:[];renderCollections()}catch(err){if(body)body.innerHTML='<tr><td colspan="7" class="empty">Data gagal dimuat. Tekan Muat ulang.</td></tr>';toast('Gagal memuat '+action+': '+err.message)}}
function renderCollections(){const ps=(data.peng||[]).slice().reverse(),ks=(data.keg||[]).slice().reverse();$('#rowsPeng').innerHTML=ps.length?ps.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(x.tanggal||'—')+'</td><td><b>'+esc(x.judul||'—')+'</b></td><td>'+esc(x.kategori||'Umum')+'</td><td>'+esc(x.target||'Semua wali santri')+'</td><td>'+esc(x.isi||'—')+'</td><td>'+esc(x.status||'Terbit')+'</td></tr>').join(''):'<tr><td colspan="7" class="empty">Belum ada pengumuman.</td></tr>';$('#rowsKeg').innerHTML=ks.length?ks.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(x.tanggal||'—')+'</td><td><b>'+esc(x.judul||'—')+'</b></td><td>'+esc(x.lokasi||'—')+'</td><td>'+esc(x.waktu||'—')+'</td><td>'+esc(x.isi||'—')+'</td><td>'+esc(x.status||'Terbit')+'</td></tr>').join(''):'<tr><td colspan="7" class="empty">Belum ada kegiatan.</td></tr>';$('#nPeng').textContent=data.peng.length;$('#nKeg').textContent=data.keg.length}
function setupSaveForm(formId,action,afterSave){$(formId).onsubmit=async e=>{e.preventDefault();const form=e.target,d=Object.fromEntries(new FormData(form).entries());if(!adminKey){adminKey=await requestAdminKey('Simpan '+(action==='pengumuman'?'pengumuman':'kegiatan'));if(!adminKey)return;adminKey=adminKey.trim();if(!adminKey)return;sessionStorage.setItem('ppfha_admin_key',adminKey)}const btn=form.querySelector('button[type="submit"]'),old=btn.textContent;btn.disabled=true;btn.textContent='Menyimpan…';try{const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,apiKey:adminKey,data:d})});const j=await r.json();if(!j.ok)throw new Error(j.error||'Data gagal disimpan');form.reset();form.classList.add('hidden');await afterSave();toast((action==='pengumuman'?'Pengumuman':'Kegiatan')+' berhasil disimpan.')}catch(err){adminKey='';sessionStorage.removeItem('ppfha_admin_key');toast('Belum berhasil menyimpan: '+err.message)}finally{btn.disabled=false;btn.textContent=old}}}
const holidayCategory=$('#formPeng select[name="kategori"]'),holidayFields=$('#holidayFields');
function syncHolidayFields(){
 const isHoliday=holidayCategory&&holidayCategory.value.toLowerCase()==='liburan';
 if(holidayFields)holidayFields.classList.toggle('hidden',!isHoliday);
 if(holidayFields)holidayFields.querySelectorAll('input').forEach(input=>{input.required=!!isHoliday;});
}
if(holidayCategory){holidayCategory.addEventListener('change',syncHolidayFields);syncHolidayFields();}
$('#showPeng').onclick=()=>$('#formPeng').classList.remove('hidden');$('#cancelPeng').onclick=()=>{$('#formPeng').reset();$('#formPeng').classList.add('hidden')};$('#refreshPeng').onclick=()=>loadCollection('pengumuman','#rowsPeng','peng');$('#showKeg').onclick=()=>$('#formKeg').classList.remove('hidden');$('#cancelKeg').onclick=()=>{$('#formKeg').reset();$('#formKeg').classList.add('hidden')};$('#refreshKeg').onclick=()=>loadCollection('kegiatan','#rowsKeg','keg');setupSaveForm('#formPeng','pengumuman',()=>loadCollection('pengumuman','#rowsPeng','peng'));setupSaveForm('#formKeg','kegiatan',()=>loadCollection('kegiatan','#rowsKeg','keg'));$('#backDashboard').onclick=()=>go('dashboard');
render();loadIzin();loadCollection('pengumuman','#rowsPeng','peng');loadCollection('kegiatan','#rowsKeg','keg');
/* ATTENDANCE MODULE — uses the same KTS QR/NIS */
const ATTENDANCE_ACTIVITIES={jamaah:'Sholat Berjamaah','kitab-pagi':'Ngaji Kitab Pagi',albab:'Ngaji Kitab Metode Albab',alquran:"Ngaji Al-Qur'an",madrasiyah:'Madrasiyah'};
let currentAttendanceActivity='',attendanceScanBusy=false,attendanceConfig={};
function todayLocal(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
// HTML input[type=time] requires zero-padded HH:mm; Sheets may return H:mm.
function normalizeTimeInput(value){const raw=String(value??'').trim().toUpperCase();if(!raw)return '';let m=raw.match(/^(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*(AM|PM)?$/);if(m){let h=Number(m[1]),min=Number(m[2]);if(min>59||h>23)return '';if(m[4]){if(h<1||h>12)return '';h=(h%12)+(m[4]==='PM'?12:0)}return String(h).padStart(2,'0')+':'+String(min).padStart(2,'0')}if(/^\d+(?:\.\d+)?$/.test(raw)){const n=Number(raw);if(n>=0&&n<1){const mins=Math.round(n*1440);return String(Math.floor(mins/60)%24).padStart(2,'0')+':'+String(mins%60).padStart(2,'0')}}return '';}
async function attendancePayload(action,extra={}){const send=key=>fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,apiKey:key,...extra})}).then(r=>r.json());let result=await send(adminKey);if(!result.ok&&/kunci pengurus tidak valid|akses ditolak/i.test(String(result.error||''))){adminKey='';sessionStorage.removeItem('ppfha_admin_key');const renewed=await requestAdminKey('Kunci pengurus tidak cocok. Masukkan kembali kunci yang tersimpan di Apps Script.');if(!renewed)return {ok:false,error:'Permintaan dibatalkan. Kunci pengurus belum dimasukkan.'};adminKey=String(renewed).trim();if(!adminKey)return {ok:false,error:'Kunci pengurus tidak boleh kosong.'};sessionStorage.setItem('ppfha_admin_key',adminKey);result=await send(adminKey);if(!result.ok&&/kunci pengurus tidak valid|akses ditolak/i.test(String(result.error||''))){adminKey='';sessionStorage.removeItem('ppfha_admin_key');}}return result}
function jakartaClock(){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const v={};p.forEach(x=>v[x.type]=x.value);return {day:({Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6})[v.weekday],time:v.hour+':'+v.minute};}
function findActiveAttendanceSchedule(){const now=jakartaClock(),all=[];Object.keys(attendanceConfig).forEach(activity=>{const cfg=attendanceConfig[activity]||{};if(activity==='jamaah'){Object.keys(cfg).forEach(session=>{const s=cfg[session];if(s&&s.startTime&&s.endTime)all.push({activity,session,...s})})}else if(cfg.startTime&&cfg.endTime)all.push({activity,session:'Utama',...cfg})});const valid=all.filter(s=>(!(s.days||[]).length||(s.days||[]).map(Number).includes(now.day))&&now.time>=s.startTime&&now.time<=s.endTime);valid.sort((a,b)=>a.endTime.localeCompare(b.endTime));if(valid.length)return valid[0];const next=all.filter(s=>(!(s.days||[]).length||(s.days||[]).map(Number).includes(now.day))&&s.startTime>now.time).sort((a,b)=>a.startTime.localeCompare(b.startTime));return next[0]||null;}
function findActiveAttendanceScheduleForActivity(activity){const now=jakartaClock(),cfg=attendanceConfig[activity]||{},all=[];if(activity==='jamaah'){Object.keys(cfg).forEach(session=>{const s=cfg[session];if(s&&s.startTime&&s.endTime)all.push({activity,session,...s})})}else if(cfg.startTime&&cfg.endTime)all.push({activity,session:'Utama',...cfg});const valid=all.filter(s=>(!(s.days||[]).length||(s.days||[]).map(Number).includes(now.day))&&now.time>=s.startTime&&now.time<=s.endTime).sort((a,b)=>a.endTime.localeCompare(b.endTime));if(valid.length)return valid[0];const next=all.filter(s=>(!(s.days||[]).length||(s.days||[]).map(Number).includes(now.day))&&s.startTime>now.time).sort((a,b)=>a.startTime.localeCompare(b.startTime));return next[0]||null;}
function findJamaahSessionForCurrentTime(){const now=jakartaClock(),cfg=attendanceConfig.jamaah||{},all=Object.keys(cfg).map(session=>({activity:'jamaah',session,...cfg[session]})).filter(s=>s.startTime&&s.endTime&&(!(s.days||[]).length||(s.days||[]).map(Number).includes(now.day)));const active=all.filter(s=>now.time>=s.startTime&&now.time<=s.endTime).sort((a,b)=>a.endTime.localeCompare(b.endTime));if(active.length)return active[0];const upcoming=all.filter(s=>s.startTime>now.time).sort((a,b)=>a.startTime.localeCompare(b.startTime));return upcoming[0]||null;}
function getActiveScheduleForActivity(activity){const now=jakartaClock(),list=[];const cfg=attendanceConfig[activity]||{};if(activity==='jamaah'){Object.keys(cfg).forEach(session=>{const s=cfg[session];if(s&&s.startTime&&s.endTime)list.push({activity,session,...s})})}else if(cfg.startTime&&cfg.endTime)list.push({activity,session:'Utama',...cfg});return list.find(s=>(!(s.days||[]).length||(s.days||[]).map(Number).includes(now.day))&&now.time>=s.startTime&&now.time<=s.endTime)||null;}
function updateAttendancePortalSession(){if(!currentAttendanceActivity)return;const jamaah=currentAttendanceActivity==='jamaah',session=jamaah?$('#scheduleSession').value:'';const now=jakartaClock();const label=session?(session==='Jumat'?'Sholat Jumat':session):'Jadwal belum tersedia';$('#attendanceScannerTitle').textContent='Portal '+ATTENDANCE_ACTIVITIES[currentAttendanceActivity]+(jamaah?' · '+label:'');let hint=jamaah?(session?'Sesi yang dicatat: '+label+'. Sesi dipilih otomatis berdasarkan jadwal WIB.':'Jadwal sholat belum tersedia untuk hari ini. Scan belum dapat dilakukan.'):'Scan QR KTS santri untuk '+ATTENDANCE_ACTIVITIES[currentAttendanceActivity]+'.';$('#attendanceScannerHint').textContent=hint;const msg=$('#attendanceSessionMessage');if(msg)msg.textContent='Data absensi '+todayLocal()+' · '+ATTENDANCE_ACTIVITIES[currentAttendanceActivity]+(jamaah?' · '+label:'')}
function refreshAttendanceScanGate(){const btn=$('#startAttendanceScan');if(!btn)return;const testMode=false,now=jakartaClock();let active=null,next=null,latest=null;if(currentAttendanceActivity==='jamaah'){const list=Object.keys(attendanceConfig.jamaah||{}).map(session=>({activity:'jamaah',session,...attendanceConfig.jamaah[session]})).filter(s=>(!(s.days||[]).length||(s.days||[]).map(Number).includes(now.day))&&s.startTime&&s.endTime).sort((a,b)=>a.startTime.localeCompare(b.startTime));active=list.find(s=>now.time>=s.startTime&&now.time<=s.endTime)||null;next=list.find(s=>s.startTime>now.time)||null;latest=list.filter(s=>s.endTime<now.time).sort((a,b)=>b.endTime.localeCompare(a.endTime))[0]||null;if(active)$('#scheduleSession').value=active.session;else if(next)$('#scheduleSession').value=next.session;else if(latest)$('#scheduleSession').value=latest.session;if(active||next||latest)loadScheduleForm()}else{const cfg=attendanceConfig[currentAttendanceActivity]||{};if(cfg.startTime&&cfg.endTime&&(cfg.days||[]).map(Number).includes(now.day)){active=now.time>=cfg.startTime&&now.time<=cfg.endTime?{...cfg}:null;next=cfg.startTime>now.time?{...cfg}:null;latest=cfg.endTime<now.time?{...cfg}:null}}const selected=currentAttendanceActivity==='jamaah'?(attendanceConfig.jamaah||{})[$('#scheduleSession').value]||{}:attendanceConfig[currentAttendanceActivity]||{};const weeklyAlbabHoliday=currentAttendanceActivity==='albab'&&(now.day===1||now.day===4);const holiday=!!selected.holidayToday||weeklyAlbabHoliday;const inWindow=!!active,blocked=holiday||(!testMode&&!inWindow);btn.disabled=blocked;btn.textContent=weeklyAlbabHoliday?'Libur Rutin Albab (Senin & Kamis)':holiday?'Kegiatan Sedang Libur':testMode?'Buka Kamera & Scan (Mode Uji Coba)':inWindow?'Buka Kamera & Scan':next?'Belum Waktunya Scan':'Jadwal Selesai Hari Ini';const hint=$('#attendanceScannerHint');if(hint&&currentAttendanceActivity){if(holiday)hint.textContent='⛔ '+ATTENDANCE_ACTIVITIES[currentAttendanceActivity]+' sedang LIBUR hari ini. Absensi dinonaktifkan; santri tidak dihitung Tidak Hadir.';else if(testMode)hint.textContent='Mode uji coba aktif. '+ATTENDANCE_ACTIVITIES[currentAttendanceActivity]+' dapat diuji scan QR KTS dan akan dicatat Hadir.';else if(inWindow)hint.textContent='Jadwal '+(active.session==='Jumat'?'Sholat Jumat':active.session||'kegiatan')+' sedang berlangsung ('+active.startTime+'–'+active.endTime+' WIB). Scan akan ditutup otomatis setelah batas akhir.';else if(next)hint.textContent='Jadwal '+(next.session==='Jumat'?'Sholat Jumat':next.session||'kegiatan')+' dimulai pukul '+next.startTime+' WIB. Tombol scan akan aktif otomatis saat waktunya tiba.';else hint.textContent='Jadwal '+ATTENDANCE_ACTIVITIES[currentAttendanceActivity]+' hari ini sudah selesai. Scan ditutup otomatis agar tidak salah mencatat kehadiran.';}}
function applyAutomaticAttendanceSelection(){const s=findActiveAttendanceSchedule();if(!s)return false;const activity=$('#scheduleActivity'),session=$('#scheduleSession');if(activity.value!==s.activity)activity.value=s.activity;if(session.value!==s.session)session.value=s.session;$('#scheduleStart').value=normalizeTimeInput(s.startTime);$('#scheduleOnTime').value=normalizeTimeInput(s.onTimeUntil);$('#scheduleEnd').value=normalizeTimeInput(s.endTime);const note=$('.calendar-auto-note');if(note){const now=jakartaClock();note.textContent='Otomatis WIB · '+(s.startTime<=now.time&&now.time<=s.endTime?'Sedang berlangsung: ':'Jadwal berikutnya: ')+ATTENDANCE_ACTIVITIES[s.activity]+' – '+(s.session==='Utama'?'Kegiatan utama':s.session)+' ('+s.startTime+'–'+s.endTime+').'}return true;}
async function loadAttendanceConfig(){
  const date=$('#attendanceDate');
  if(date&&!date.value)date.value=todayLocal();
  try{
    // Ambil seluruh sesi dalam satu permintaan agar Subuh tidak terlewat
    // akibat respons terpisah per sesi.
    const response=await fetch(API_URL+'?action=attendanceConfig&session=all',{cache:'no-store'});
    const j=await response.json();
    if(!j||!j.ok)throw new Error(j?.error||'Backend jadwal sholat belum tersedia');
    const d=j.data||{},jamaah={},other={};
    const normalizeScheduleTimes=x=>x?({...x,
      startTime:normalizeTimeInput(x.startTime),
      onTimeUntil:normalizeTimeInput(x.onTimeUntil),
      endTime:normalizeTimeInput(x.endTime)
    }):x;
    const rawJamaah=d.jamaah||{};
    if(rawJamaah.startTime){
      const item=normalizeScheduleTimes(rawJamaah);
      jamaah[item.session||'Subuh']=item;
    }else{
      Object.keys(rawJamaah).forEach(key=>{
        const item=normalizeScheduleTimes(rawJamaah[key]);
        if(item&&item.startTime)jamaah[item.session||key]=item;
      });
    }
    Object.keys(d).forEach(k=>{
      if(k!=='jamaah'&&d[k]&&d[k].startTime)other[k]=normalizeScheduleTimes(d[k]);
    });
    attendanceConfig={...other,jamaah};
    Object.keys(ATTENDANCE_ACTIVITIES).forEach(k=>{
      const el=$('#status-'+k);
      const list=k==='jamaah'?Object.values(jamaah):[attendanceConfig[k]||{}];
      if(el){const holiday=list.some(x=>x.holidayToday);el.textContent=holiday?'⛔ LIBUR HARI INI · '+list.filter(x=>x.startTime).map(x=>(x.session&&x.session!=='Utama'?x.session+': ':'')+x.startTime+'–'+x.endTime).join(' · '):list.some(x=>x.startTime)?'Jadwal '+list.filter(x=>x.startTime).map(x=>(x.session&&x.session!=='Utama'?x.session+': ':'')+x.startTime+'–'+x.endTime).join(' · '):'Jadwal belum diatur';el.style.color=holiday?'#b42318':'';el.style.fontWeight=holiday?'700':'';}
    });
    if(currentAttendanceActivity==='jamaah'){
      const now=jakartaClock();
      const all=Object.keys(jamaah).map(session=>({session,...jamaah[session]}))
        .filter(x=>x.startTime&&x.endTime&&(!(x.days||[]).length||(x.days||[]).map(Number).includes(now.day)))
        .sort((a,b)=>a.startTime.localeCompare(b.startTime));
      const chosen=all.find(x=>now.time>=x.startTime&&now.time<=x.endTime)
        ||all.find(x=>x.startTime>now.time)
        ||all.filter(x=>x.endTime<now.time).sort((a,b)=>b.endTime.localeCompare(a.endTime))[0];
      if(chosen)$('#scheduleSession').value=chosen.session;
    }
    loadScheduleForm();
    if(currentAttendanceActivity)refreshAttendanceScanGate();
  }catch(e){toast('Pengaturan absensi belum terhubung ke database: '+e.message)}
}
function loadScheduleForm(){const a=$('#scheduleActivity').value,session=$('#scheduleSession').value,cfg=attendanceConfig[a]||{},s=a==='jamaah'?(cfg[session]||{}):cfg;$('#scheduleStart').value=normalizeTimeInput(s.startTime);$('#scheduleOnTime').value=normalizeTimeInput(s.onTimeUntil);$('#scheduleEnd').value=normalizeTimeInput(s.endTime);['scheduleStart','scheduleOnTime','scheduleEnd'].forEach(id=>{$('#'+id).readOnly=true;$('#'+id).disabled=true;$('#'+id).setAttribute('aria-readonly','true')});$('#scheduleActivity').disabled=true;$('#scheduleSession').disabled=true;if(s.session&&a==='jamaah')$('#scheduleSession').value=s.session;else if(a!=='jamaah')$('#scheduleSession').value='Utama';const dayNames=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];const dayText=(s.days||[]).length===7?'Setiap hari':(s.days||[]).map(x=>dayNames[Number(x)]).join(', ');const note=$('.calendar-auto-note');const hasSchedule=!!(s.startTime&&s.onTimeUntil&&s.endTime);if(note)note.textContent=s.holidayToday?'⛔ KEGIATAN SEDANG LIBUR HARI INI. Absensi dinonaktifkan dan santri tidak dihitung Tidak Hadir.':hasSchedule?'Jadwal otomatis WIB: '+(dayText||'belum ada hari aktif')+'. Jam dan batas status dikunci mengikuti jadwal yang tersimpan.':'Jadwal kegiatan ini belum tersimpan di database JadwalAbsensi. Jam akan tampil otomatis setelah jadwal resmi disimpan oleh pengurus.';const holidayBtn=$('#toggleAttendanceHoliday');if(holidayBtn){holidayBtn.disabled=!hasSchedule;holidayBtn.textContent=s.holidayToday?'Batalkan Libur Hari Ini':'Liburkan Kegiatan Hari Ini';holidayBtn.title=hasSchedule?'Berlaku hanya untuk tanggal hari ini':'Jadwal belum tersedia';}updateAttendancePortalSession()}
$('#scheduleActivity').addEventListener('change',()=>{$('#scheduleSession').value=$('#scheduleActivity').value==='jamaah'?'Subuh':'Utama';loadAttendanceConfig()});$('#scheduleSession').addEventListener('change',()=>{if($('#scheduleActivity').value==='jamaah'){loadScheduleForm();updateAttendancePortalSession()}});
$('#loadSchedule').onclick=loadAttendanceConfig;
$('#activatePondokNow').onclick=async()=>{if(!await askConfirmation('Aktifkan Semua Kegiatan Sekarang?', 'Libur pondok untuk hari ini dan tanggal mendatang akan dibatalkan. Semua kegiatan kembali mengikuti jadwal normal.', 'Ya, Aktifkan Sekarang'))return;const j=await attendancePayload('activatePondokNow');if(!j.ok){toast(j.error||'Kegiatan belum berhasil diaktifkan.');return}await loadAttendanceConfig();toast(j.message||'Semua kegiatan diaktifkan kembali.');};
$('#setPondokHoliday').onclick=async()=>{const startDate=prompt('Tanggal mulai libur pondok (YYYY-MM-DD):',todayLocal());if(!startDate)return;const endDate=prompt('Tanggal selesai libur pondok (YYYY-MM-DD):',startDate);if(!endDate)return;if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||!/^\d{4}-\d{2}-\d{2}$/.test(endDate)||endDate<startDate){toast('Format tanggal tidak valid. Gunakan YYYY-MM-DD.');return}if(!await askConfirmation('Liburkan Semua Kegiatan?', 'Semua kegiatan dan absensi dinonaktifkan dari '+startDate+' sampai '+endDate+'. Santri tidak dihitung Tidak Hadir.', 'Ya, Liburkan Pondok'))return;const j=await attendancePayload('setPondokHoliday',{data:{startDate:startDate,endDate:endDate,isHoliday:true,catatan:'Libur pondok'}});if(!j.ok){toast(j.error||'Pengaturan libur gagal disimpan.');return}await loadAttendanceConfig();toast(j.message||'Semua kegiatan diliburkan.');};
$('#toggleAttendanceHoliday').onclick=async()=>{const a=$('#scheduleActivity').value,session=$('#scheduleSession').value,cfg=attendanceConfig[a]||{},s=a==='jamaah'?(cfg[session]||{}):cfg;if(!s.startTime||!s.endTime){toast('Jadwal belum tersimpan. Libur belum dapat diatur.');return}const next=!s.holidayToday;if(!await askConfirmation(next?'Liburkan Kegiatan Hari Ini?':'Batalkan Libur Kegiatan?',next?'Kegiatan '+ATTENDANCE_ACTIVITIES[a]+' akan dinonaktifkan untuk hari ini. Scan ditolak dan santri tidak dihitung Tidak Hadir.':'Kegiatan '+ATTENDANCE_ACTIVITIES[a]+' akan diaktifkan kembali untuk hari ini.',next?'Ya, Liburkan':'Ya, Aktifkan'))return;const j=await attendancePayload('toggleAttendanceHoliday',{data:{date:todayLocal(),activity:a,session:session||'Utama',isHoliday:next}});if(!j.ok){toast(j.error||'Status libur gagal disimpan.');return}await loadAttendanceConfig();toast(j.message||'Status kegiatan diperbarui.');};
$$('.attendance-open').forEach(button=>button.onclick=()=>{
  const requestedActivity=button.dataset.activity;
  // Buka portal lebih dahulu agar tidak menunggu enam permintaan jadwal.
  let selected=findActiveAttendanceScheduleForActivity(requestedActivity);
  if(!selected&&requestedActivity==='jamaah')selected=findJamaahSessionForCurrentTime()||(()=>{const n=jakartaClock(),items=Object.keys(attendanceConfig.jamaah||{}).map(session=>({session,...attendanceConfig.jamaah[session]})).filter(s=>(s.days||[]).map(Number).includes(n.day)&&s.endTime&&s.endTime<n.time).sort((a,b)=>b.endTime.localeCompare(a.endTime));return items[0]||null})();
  if(!selected)selected={activity:requestedActivity,session:requestedActivity==='jamaah'?'':'Utama',...(requestedActivity==='jamaah'?{}:(attendanceConfig[requestedActivity]||{}))};
  currentAttendanceActivity=requestedActivity;
  // Setiap portal harus mulai dengan tampilan milik kegiatannya sendiri.
  // Jangan biarkan notifikasi scan dari portal sebelumnya terbawa.
  $('#attendanceLastScan').innerHTML='<div class="last-scan-empty" style="color:#64756d;padding:8px 0">Belum ada pemindaian pada portal '+esc(ATTENDANCE_ACTIVITIES[requestedActivity])+' ini.</div>';
  $('#countHadir').textContent='0';
  $('#countTerlambat').textContent='0';
  $('#countTidakHadir').textContent='0';
  $('#scheduleActivity').value=requestedActivity;
  $('#scheduleSession').value=requestedActivity==='jamaah'?(selected.session||''):(selected.session||'Utama');
  $('#attendancePortalList').classList.add('hidden');
  $('#attendanceWorkspace').classList.remove('hidden');
  $('#attendanceScannerPanel').classList.remove('hidden');
  $('#attendanceSettingsPanel').classList.remove('hidden');
  $('#scheduleActivity').disabled=true;
  $('#scheduleSession').disabled=true;
  loadScheduleForm();
  updateAttendancePortalSession();
  $('#attendanceScannerTitle').textContent='Portal Absensi Otomatis · '+ATTENDANCE_ACTIVITIES[requestedActivity]+(requestedActivity==='jamaah'?' · '+(selected.session==='Jumat'?'Sholat Jumat':selected.session):'');
  $('#attendanceScannerHint').textContent='Memuat jadwal… Portal sudah siap. Petugas dapat menyiapkan barcode KTS.';
  refreshAttendanceScanGate();
  $('#attendanceScannerPanel').scrollIntoView({behavior:'smooth',block:'start'});
  // Jangan tampilkan dialog kunci saat membuka portal; rekap dimuat bila kunci sudah tersimpan.
  if(adminKey) loadAttendanceRecords();
  loadAttendanceConfig().then(()=>{
    const latest=findActiveAttendanceScheduleForActivity(requestedActivity);
    const chosen=latest||(requestedActivity==='jamaah'?findJamaahSessionForCurrentTime():(requestedActivity==='kitab-pagi'?{activity:'kitab-pagi',session:'Utama',...(attendanceConfig['kitab-pagi']||{})}:null));
    if(chosen){
      $('#scheduleSession').value=chosen.session||'Utama';
      loadScheduleForm();
      updateAttendancePortalSession();
      refreshAttendanceScanGate();
      $('#attendanceScannerHint').textContent='Jadwal WIB berhasil dimuat. Petugas cukup scan QR KTS; kegiatan ditentukan otomatis.';
    }else{
      const label=ATTENDANCE_ACTIVITIES[requestedActivity]||'Kegiatan';
      $('#attendanceScannerHint').textContent='Portal '+label+' sudah terbuka, tetapi tidak ada jadwal aktif atau jadwal berikutnya hari ini. Scan dinonaktifkan.';
      toast('Jadwal '+label+' sudah selesai atau belum tersedia hari ini.');
    }
    refreshAttendanceScanGate();
    if(adminKey) loadAttendanceRecords();
  });
});
$('#closeAttendancePanel').onclick=()=>{$('#attendanceWorkspace').classList.add('hidden');$('#attendanceScannerPanel').classList.add('hidden');$('#attendancePortalList').classList.remove('hidden');$('#attendanceSettingsPanel').classList.add('hidden');$('#scheduleActivity').disabled=false;$('#scheduleSession').disabled=false;currentAttendanceActivity=''};
/* Antrean scan cepat: kamera tidak menunggu respons Apps Script.
   Server tetap menyimpan satu per satu; hasil gagal tidak dinyatakan berhasil. */
const attendanceScanQueue=[],attendanceScanQueued=new Set();
let attendanceQueueRunning=false;
function enqueueAttendanceScan(nis){
 const activity=currentAttendanceActivity;
 const key=activity+'|'+todayLocal()+'|'+nis;
 const msg=$('#qrMessage');
 if(attendanceScanQueued.has(key)){
  if(msg)msg.textContent='NIS '+nis+' sudah dalam antrean. Arahkan KTS berikutnya.';
  return;
 }
 if(attendanceScanQueue.length>=30){
  if(msg)msg.textContent='Antrean penuh (30). Tunggu penyimpanan sebelum scan lagi.';
  return;
 }
 attendanceScanQueued.add(key);
 attendanceScanQueue.push({nis,activity,key,scannedAt:new Date().toISOString()});
 if(msg)msg.textContent='NIS '+nis+' diterima · '+attendanceScanQueue.length+' antre. Siap scan berikutnya.';
 const panel=$('#attendanceLastScan');
 if(panel)panel.innerHTML='<div class="last-scan-success"><b>NIS '+esc(nis)+'</b><br>QR terbaca · Menunggu konfirmasi penyimpanan ('+attendanceScanQueue.length+' antre)</div>';
 drainAttendanceScanQueue();
}
async function drainAttendanceScanQueue(){
 if(attendanceQueueRunning)return;
 attendanceQueueRunning=true;
 try{
  while(attendanceScanQueue.length){
   const item=attendanceScanQueue[0];
   try{await recordAttendanceScan(item.nis,item.activity,item.scannedAt)}
   catch(err){console.error('Antrean absensi:',err)}
   finally{attendanceScanQueue.shift();attendanceScanQueued.delete(item.key)}
  }
 }finally{attendanceQueueRunning=false}
}
async function recordAttendanceScan(nis,activityAtScan,scannedAt){if(!activityAtScan&&!currentAttendanceActivity){toast('Portal scan otomatis belum dibuka.');return}attendanceScanBusy=true;try{const j=await attendancePayload('attendanceScan',{data:{nis,activity:activityAtScan||currentAttendanceActivity,testMode:false,scannedAt:scannedAt||new Date().toISOString()}});if(!j.ok)throw new Error(j.error||'Scan belum tercatat');const d=j.data||{};if(qrTarget==='attendance'&&qrScanner&&qrScanner.isScanning){const m=$('#qrMessage');if(m)m.textContent=(d.nama||'Santri NIS '+nis)+(j.duplicate?' — sudah tercatat.':' — '+(d.status||'Hadir')+' tersimpan.')}const activity=ATTENDANCE_ACTIVITIES[d.activity]||'Kegiatan';const session=d.session?(d.session==='Jumat'?'Sholat Jumat':d.session):'';const duplicate=!!j.duplicate;const title=duplicate?'Sudah tercatat sebelumnya':'Berhasil dicatat';const color=duplicate?'#a16207':'#176b50';$('#attendanceLastScan').innerHTML='<div class="last-scan-success"><b style="font-size:16px;color:'+color+'">'+title+'</b><br><b style="font-size:20px;color:#176b50">'+esc(d.nama||'Nama santri tidak terbaca')+'</b><br><span>NIS '+esc(d.nis||nis)+'</span><br><span>'+esc(activity)+(session?' · '+esc(session):'')+'</span><br><span>Waktu '+(duplicate?'tercatat':'scan')+': '+esc(d.time||new Date().toLocaleTimeString('id-ID'))+'</span><br><span class="status-pill '+(d.status==='Terlambat'?'status-pending':d.status==='Tidak Hadir'?'status-rejected':'status-done')+'">'+esc(d.status||'Hadir')+'</span></div>';const label=session?' · '+session:'';$('#attendanceScannerTitle').textContent='Portal '+activity+label;$('#attendanceSessionMessage').textContent='Data absensi '+todayLocal()+' · '+activity+label;toast(duplicate?(d.nama||'Santri')+' sudah tercatat pada sesi '+(session||'ini')+'.':(d.nama||'Santri')+' berhasil tercatat '+(d.status||'Hadir')+'.');const countId=d.status==='Terlambat'?'countTerlambat':d.status==='Tidak Hadir'?'countTidakHadir':'countHadir';const countEl=$('#'+countId);if(countEl&&!duplicate)countEl.textContent=String((Number(countEl.textContent)||0)+1);if(adminKey)loadAttendanceRecords()}catch(e){if(qrTarget==='attendance'&&qrScanner&&qrScanner.isScanning){const m=$('#qrMessage');if(m)m.textContent='Gagal menyimpan NIS '+nis+': '+(e.message||'Periksa koneksi')+'. Silakan scan ulang.'}$('#attendanceLastScan').innerHTML='<div class="last-scan-error"><b style="color:#b45309">Scan belum tercatat</b><br>'+esc(e.message||'Periksa QR dan koneksi database.')+'</div>';toast('Absensi belum tersimpan: '+e.message)}finally{attendanceScanBusy=false}}
$('#startAttendanceScan').onclick=async()=>{if(!currentAttendanceActivity){toast('Pilih folder kegiatan terlebih dahulu.');return}if(!adminKey){adminKey=await requestAdminKey('Mulai absensi '+ATTENDANCE_ACTIVITIES[currentAttendanceActivity]);if(!adminKey)return;adminKey=adminKey.trim();if(!adminKey)return;sessionStorage.setItem('ppfha_admin_key',adminKey)}openQr('attendance')};
async function loadAttendanceRecords(){if(!adminKey){adminKey=await requestAdminKey('Lihat rekap kehadiran santri');if(!adminKey)return;adminKey=adminKey.trim();if(!adminKey)return;sessionStorage.setItem('ppfha_admin_key',adminKey)}const date=$('#attendanceDate').value||todayLocal(),activity=currentAttendanceActivity||$('#attendanceFilter').value||'all';try{const session=activity==='jamaah'?$('#scheduleSession').value:'';const j=await attendancePayload('attendanceRecords',{date,activity:activity||'all',session});if(!j.ok)throw new Error(j.error||'Rekap belum tersedia');const rows=Array.isArray(j.data)?j.data:[];$('#attendanceRows').innerHTML=rows.length?rows.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(x.time||'—')+'</td><td>'+esc(x.nis||'—')+'</td><td><b>'+esc(x.nama||'—')+'</b></td><td>'+esc(ATTENDANCE_ACTIVITIES[x.activity]||x.activity||'—')+(x.session?' · '+esc(x.session):'')+'</td><td><span class="status-pill '+(x.status==='Hadir'?'status-done':x.status==='Terlambat'?'status-pending':'status-rejected')+'">'+esc(x.status||'—')+'</span></td></tr>').join(''):'<tr><td colspan="6" class="empty">Belum ada catatan untuk tanggal ini.</td></tr>';const c=j.summary||{};$('#countHadir').textContent=c.hadir||0;$('#countTerlambat').textContent=c.terlambat||0;$('#countTidakHadir').textContent=c.tidakHadir||0;$('#attendanceSessionMessage').textContent='Data absensi '+date+' · '+(ATTENDANCE_ACTIVITIES[activity]||'Semua kegiatan')+(activity==='jamaah'?' · '+(session==='Jumat'?'Sholat Jumat':session):'')}catch(e){$('#attendanceRows').innerHTML='<tr><td colspan="6" class="empty">Backend absensi belum tersambung. Data belum dapat ditampilkan.</td></tr>';$('#attendanceSessionMessage').textContent='Layanan penyimpanan absensi belum terhubung.'}}
$('#refreshAttendance').onclick=loadAttendanceConfig;$('#loadAttendanceRecords').onclick=loadAttendanceRecords;
let attendanceAutoTimer=null;function startAttendanceAutoRefresh(){if(attendanceAutoTimer)clearInterval(attendanceAutoTimer);attendanceAutoTimer=setInterval(()=>{if($('#kehadiran')&&$('#kehadiran').classList.contains('active'))refreshAttendanceScanGate()},1000)}startAttendanceAutoRefresh();
// Extend existing QR scanner: keep the same KTS QR payload (NIS only).
const originalQrHandlerMarker='attendance-qr-hook';


/* ==================== PENDIDIKAN SANTRI: RAPORT MADRASAH ==================== */
const raportSubjects=[
 ['Tafsir','mapel'],['Hadits','mapel'],['Tajwid','mapel'],['Akhlaq','mapel'],['Fiqh','mapel'],
 ['Bahasa Arab','mapel'],['Nahwu','mapel'],['Shorrof','mapel'],['Tauhid','mapel'],["I’lal",'mapel'],
 ['Tarikh / Kholashoh','mapel'],['Bhesanah','mapel'],
 ['Muatan Lokal','group'],["a. Imla’",'lokal'],['b. Baca Kitab','lokal'],['c. Muhafadzoh','lokal'],['d.','custom']
];
function renderRaportInputs(){
 const body=$('#raportSubjects');if(!body)return;
 body.innerHTML=raportSubjects.map((s,i)=>{
  const custom=s[1]==='custom'?'<input class="raport-custom-name" data-custom-name placeholder="Nama mapel tambahan">':esc(s[0]);
  if(s[1]==='group')return '<tr class="raport-group"><td>13.</td><td><b>'+custom+'</b></td><td colspan="4">Muatan lokal</td></tr>';
  return '<tr><td>'+(s[1]==='lokal'?'':(i+1)+'.')+'</td><td>'+custom+'</td>'+[1,1,2,2].map((sem,k)=>'<td><input class="raport-score" type="number" min="0" max="100" step="0.01" inputmode="decimal" data-subject="'+i+'" data-sem="'+sem+'" data-kind="'+(k%2?'rataRataKelas':'prestasi')+'" aria-label="Nilai '+esc(s[0])+' semester '+sem+'"></td>').join('')+'</tr>';
 }).join('');
 body.addEventListener('input',updateRaportTotals);
}
function updateRaportTotals(){
 [1,2].forEach(sem=>['prestasi','rataRataKelas'].forEach(kind=>{
  const vals=$$('.raport-score').filter(x=>x.dataset.sem===String(sem)&&x.dataset.kind===kind&&x.value.trim()!=='').map(x=>Number(x.value)||0);
  const total=vals.reduce((a,b)=>a+b,0);
  const id=kind==='prestasi'?'sumPrestasi':'sumRata';
  $('#'+id+sem).textContent=total.toLocaleString('id-ID',{maximumFractionDigits:2});
 }));
}
async function lookupRaportStudent(){
 const nis=$('#raportNis').value.trim().replace(/\D/g,'');if(!nis)return;
 try{const r=await fetch(API_URL+'?action=student&nis='+encodeURIComponent(nis),{cache:'no-store'});const j=await r.json();if(!j.ok)throw new Error(j.error||'Santri tidak ditemukan');$('#raportNis').value=j.data.nis;$('#raportNama').value=j.data.nama;$('#raportKelas').value=j.data.kelas||'';await loadRaportHistory(nis)}
 catch(err){$('#raportNama').value='';$('#raportKelas').value='';toast('Data santri: '+err.message)}
}
async function loadRaportHistory(nis){
 const body=$('#raportHistory');if(!body)return;
 if(!adminKey){adminKey=await requestAdminKey('Lihat riwayat nilai raport');if(!adminKey){body.innerHTML='<tr><td colspan="6" class="empty">Masukkan kunci pengurus untuk melihat riwayat.</td></tr>';return}adminKey=String(adminKey).trim();sessionStorage.setItem('ppfha_admin_key',adminKey)}
 body.innerHTML='<tr><td colspan="6" class="empty">Memuat riwayat nilai…</td></tr>';
 try{const r=await fetch(API_URL+'?action=educationrecords&type=raport&nis='+encodeURIComponent(nis)+'&key='+encodeURIComponent(adminKey),{cache:'no-store'});const j=await r.json();if(!j.ok)throw new Error(j.error||'Gagal membaca nilai');
 const rows=j.data||[];body.innerHTML=rows.length?rows.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(x.mataPelajaran||'—')+'</td><td>'+esc(x.semester||'—')+'</td><td>'+esc(x.prestasi||'—')+'</td><td>'+esc(x.rataRataKelas||'—')+'</td><td>'+esc(x.tahunAjaran||'—')+'</td></tr>').join(''):'<tr><td colspan="6" class="empty">Belum ada nilai tersimpan untuk NIS ini.</td></tr>';
 }catch(err){body.innerHTML='<tr><td colspan="6" class="empty">'+esc(err.message)+'</td></tr>'}
}
$('#scanRaport').addEventListener('click',()=>openQr('raport'));
$('#findRaport').addEventListener('click',lookupRaportStudent);
$('#raportNis').addEventListener('change',lookupRaportStudent);
$('#raportNis').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();lookupRaportStudent()}});
$('#raportNis').addEventListener('blur',lookupRaportStudent);
$('#refreshRaport').onclick=()=>{const n=$('#raportNis').value.trim();if(n)loadRaportHistory(n);else toast('Masukkan NIS santri terlebih dahulu.')};
$('#formRaport').addEventListener('reset',()=>setTimeout(()=>{ $('#raportNama').value='';$('#raportKelas').value='';updateRaportTotals();},0));

function raportSaveStatus(message,type){
 let status=$('#raportSaveStatus');
 if(!status){
  status=document.createElement('div');status.id='raportSaveStatus';
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  status.className='notice';status.style.margin='12px 0';
  const form=$('#formRaport'),actions=form&&form.querySelector('.actions');
  if(actions)form.insertBefore(status,actions);else if(form)form.appendChild(status);
 }
 status.textContent=message;status.style.display='block';
 status.dataset.state=type||'info';
 status.style.background=type==='success'?'#e8f7ee':type==='error'?'#fdecec':'#eef5f2';
 status.style.color=type==='success'?'#17633b':type==='error'?'#a12626':'#28594b';
 return status;
}
async function handleRaportSave(){
 const form=$('#formRaport'),btn=form&&form.querySelector('#saveRaportBtn, button[type="submit"]');
 if(!form||!btn){raportSaveStatus('Form atau tombol Simpan Raport tidak ditemukan.','error');return}
 if(btn.dataset.busy==='1')return;
 if(!form.checkValidity()){form.reportValidity();return}
 const nis=String($('#raportNis').value||'').trim(),nama=$('#raportNama').value.trim(),kelas=$('#raportKelas').value.trim();
 if(!nis||!nama){raportSaveStatus('Cari NIS sampai biodata santri muncul sebelum menyimpan.','error');return}
 const tahunAjaran=form.elements.tahunAjaran.value.trim(),ustaz=form.elements.ustaz.value.trim(),records=[];
 raportSubjects.forEach((s,i)=>{
  if(s[1]==='group')return;
  const name=s[1]==='custom'?($('#raportSubjects [data-custom-name]')?.value.trim()):s[0];
  if(!name)return;
  [1,2].forEach(semester=>{
   const p=$('.raport-score[data-subject="'+i+'"][data-sem="'+semester+'"][data-kind="prestasi"]');
   const a=$('.raport-score[data-subject="'+i+'"][data-sem="'+semester+'"][data-kind="rataRataKelas"]');
   if((p&&p.value!=='')||(a&&a.value!==''))records.push({nis,nama,kelas,tahunAjaran,mataPelajaran:name,kelompok:s[1]==='lokal'?'Muatan Lokal':'Mata Pelajaran',semester,prestasi:p?p.value:'',rataRataKelas:a?a.value:'',ustaz});
  });
 });
 if(!records.length){raportSaveStatus('Isi minimal satu nilai sebelum menyimpan.','error');return}
 btn.dataset.busy='1';btn.disabled=true;btn.textContent='Menyimpan…';
 raportSaveStatus('Mengirim nilai raport ke Google Sheets…','loading');
 try{
  if(!adminKey){adminKey=await requestAdminKey('Simpan nilai raport madrasah');if(!adminKey)throw new Error('Penyimpanan dibatalkan: kunci pengurus belum dimasukkan.')}
  const send=async key=>{
   const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'saveeducationraport',apiKey:key,records})});
   const result=await response.json();
   if(!result.ok)throw new Error(result.error||'Nilai gagal disimpan.');
   return result;
  };
  let result;
  try{result=await send(adminKey)}
  catch(error){
   if(!/kunci pengurus tidak valid|akses ditolak/i.test(error.message))throw error;
   adminKey='';sessionStorage.removeItem('ppfha_admin_key');
   adminKey=await requestAdminKey('Kunci pengurus lama ditolak. Masukkan kunci pengurus yang benar.');
   if(!adminKey)throw new Error('Penyimpanan dibatalkan karena kunci pengurus tidak dimasukkan.');
   result=await send(adminKey);
  }
  adminKey=String(adminKey).trim();sessionStorage.setItem('ppfha_admin_key',adminKey);
  raportSaveStatus('✓ BERHASIL DISIMPAN. '+(result.message||('Nilai raport berhasil disimpan ('+result.saved+' entri).')),'success');
  toast('Nilai raport berhasil disimpan ('+result.saved+' entri).');
  await loadRaportHistory(nis);
 }catch(error){
  raportSaveStatus('✕ GAGAL DISIMPAN: '+(error&&error.message?error.message:'Kesalahan tidak diketahui.'),'error');
  toast('Gagal menyimpan nilai raport: '+(error.message||'Periksa koneksi.'));
 }finally{
  btn.dataset.busy='0';btn.disabled=false;btn.textContent='➤ Simpan Nilai Raport';
 }
}
window.handleRaportSave=handleRaportSave;
document.addEventListener('click',function(event){
 const button=event.target&&event.target.closest?event.target.closest('#formRaport button[type="submit"]'):null;
 if(!button)return;
 event.preventDefault();event.stopImmediatePropagation();
 handleRaportSave();
},true);
$('#formRaport').addEventListener('submit',event=>{event.preventDefault();event.stopPropagation();handleRaportSave()});

renderRaportInputs();

/* UJIAN KITAB METODE ALBAB */
async function lookupAlbabStudent(){
 const input=$('#albabNis'),nama=$('#albabNama'),kelas=$('#albabKelas'),btn=$('#findAlbab');
 const nis=String(input&&input.value||'').trim().replace(/\D/g,'');
 if(!nis){toast('Masukkan NIS santri terlebih dahulu.');if(input)input.focus();return}
 if(btn){btn.disabled=true;btn.textContent='Mencari…'}
 try{
  const response=await fetch(API_URL+'?action=student&nis='+encodeURIComponent(nis)+'&_='+Date.now(),{method:'GET',cache:'no-store'});
  if(!response.ok)throw new Error('Server biodata merespons HTTP '+response.status);
  const result=await response.json();
  if(!result||result.ok!==true||!result.data)throw new Error(result&&result.error?result.error:'Biodata santri tidak ditemukan.');
  input.value=String(result.data.nis||nis).replace(/\D/g,'');
  nama.value=result.data.nama||'';kelas.value=result.data.kelas||'';
  toast('Biodata ditemukan: '+nama.value);
  loadAlbabHistory(nis).catch(err=>console.warn('Riwayat Albab:',err));
 }catch(err){nama.value='';kelas.value='';toast('Pencarian NIS Albab gagal: '+(err.message||'Periksa koneksi.'))}
 finally{if(btn){btn.disabled=false;btn.textContent='Cari'}}
}
async function loadAlbabHistory(nis){
 const body=$('#albabHistory');if(!body)return;
 if(!adminKey){adminKey=await requestAdminKey('Lihat riwayat ujian Albab');if(!adminKey){body.innerHTML='<tr><td colspan="6" class="empty">Masukkan kunci pengurus untuk melihat riwayat.</td></tr>';return}adminKey=String(adminKey).trim();sessionStorage.setItem('ppfha_admin_key',adminKey)}
 body.innerHTML='<tr><td colspan="6" class="empty">Memuat riwayat ujian…</td></tr>';
 try{const r=await fetch(API_URL+'?action=educationrecords&type=albab&nis='+encodeURIComponent(nis)+'&key='+encodeURIComponent(adminKey),{cache:'no-store'});const j=await r.json();if(!j.ok)throw new Error(j.error||'Gagal membaca riwayat');
 const rows=j.data||[];body.innerHTML=rows.length?rows.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(x.periodeUjian||'—')+'</td><td>'+esc(x.nilaiTulis||'—')+'</td><td>'+esc(x.nilaiBaca||'—')+'</td><td>'+esc(x.nilaiAkhir||'—')+'</td><td>'+esc(x.ustaz||'—')+'</td></tr>').join(''):'<tr><td colspan="6" class="empty">Belum ada nilai ujian Albab untuk NIS ini.</td></tr>';
 }catch(err){body.innerHTML='<tr><td colspan="6" class="empty">'+esc(err.message)+'</td></tr>'}
}
function updateAlbabFinal(){
 const t=$('#nilaiTulis').value,b=$('#nilaiBaca').value;
 const akhir=t!==''&&b!==''?((Number(t)+Number(b))/2):0;
 $('#nilaiAkhir').value=Number.isFinite(akhir)?String(Number(akhir.toFixed(2))):'0';
}
$('#nilaiTulis').addEventListener('input',updateAlbabFinal);
$('#nilaiBaca').addEventListener('input',updateAlbabFinal);
$('#formAlbab').addEventListener('reset',()=>setTimeout(()=>{$('#albabNama').value='';$('#albabKelas').value='';updateAlbabFinal()},0));
function albabSaveStatus(message,kind){
 const el=$('#albabSaveStatus');if(!el)return;
 el.textContent=message;el.style.display='block';
 el.style.cssText='display:block;margin:12px 0;padding:12px 14px;border-radius:10px;font-weight:600;background:'+(kind==='error'?'#fff0f0':kind==='success'?'#eaf8ef':'#eef5ff')+';color:'+(kind==='error'?'#a12626':kind==='success'?'#176b3a':'#24527a');
}
async function sendAlbabSave(payload,key){
 const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'saveeducationalbab',apiKey:key,data:payload})});
 const raw=await response.text();let result;
 try{result=JSON.parse(raw)}catch(_){throw new Error('Server tidak mengirim JSON yang valid. Pastikan URL dan deployment Apps Script sudah terbaru.')}
 if(!response.ok)throw new Error('Server merespons HTTP '+response.status);
 if(!result||result.ok!==true)throw new Error(result&&result.error?result.error:'Server menolak penyimpanan tanpa keterangan.');
 return result;
}
async function handleAlbabSave(){
 const form=$('#formAlbab'),btn=form&&form.querySelector('.albab-save-action');
 if(!form||!btn){toast('Form atau tombol Simpan Albab tidak ditemukan.');return}
 if(btn.dataset.busy==='1')return;
 if(!form.checkValidity()){form.reportValidity();return}
 const nis=String($('#albabNis').value||'').trim().replace(/\D/g,'');
 const nama=$('#albabNama').value.trim(),kelas=$('#albabKelas').value.trim();
 if(!nis||!nama){albabSaveStatus('Cari NIS sampai biodata santri muncul sebelum menyimpan.','error');return}
 const nilaiTulis=Number(form.elements.nilaiTulis.value),nilaiBaca=Number(form.elements.nilaiBaca.value);
 if(!Number.isFinite(nilaiTulis)||!Number.isFinite(nilaiBaca)||nilaiTulis<0||nilaiTulis>100||nilaiBaca<0||nilaiBaca>100){albabSaveStatus('Nilai ujian harus 0 sampai 100.','error');return}
 const payload={nis,nama,kelas,periodeUjian:form.elements.periodeUjian.value.trim(),nilaiTulis,nilaiBaca,nilaiAkhir:(nilaiTulis+nilaiBaca)/2,catatan:form.elements.catatan.value.trim(),ustaz:form.elements.ustaz.value.trim()};
 btn.dataset.busy='1';btn.disabled=true;const old=btn.textContent;btn.textContent='Menyimpan…';
 albabSaveStatus('Mengirim nilai ujian ke Google Sheets…','loading');
 try{
  if(!adminKey)adminKey=await requestAdminKey('Simpan nilai ujian Albab');
  if(!adminKey)throw new Error('Penyimpanan dibatalkan karena kunci pengurus belum dimasukkan.');
  let result;
  try{result=await sendAlbabSave(payload,adminKey)}
  catch(error){
   if(!/kunci pengurus tidak valid|akses ditolak/i.test(error.message))throw error;
   adminKey='';sessionStorage.removeItem('ppfha_admin_key');
   adminKey=await requestAdminKey('Kunci pengurus lama ditolak. Masukkan kunci pengurus yang benar.');
   if(!adminKey)throw new Error('Penyimpanan dibatalkan karena kunci pengurus tidak dimasukkan.');
   result=await sendAlbabSave(payload,adminKey);
  }
  adminKey=String(adminKey).trim();sessionStorage.setItem('ppfha_admin_key',adminKey);
  $('#nilaiAkhir').value=String(Number(payload.nilaiAkhir.toFixed(2)));
  albabSaveStatus('✓ BERHASIL DISIMPAN. '+(result.message||'Nilai ujian sudah diterima Google Sheets.'),'success');
  toast('Nilai ujian Albab berhasil disimpan.');
  await loadAlbabHistory(nis);
 }catch(error){
  albabSaveStatus('✕ GAGAL DISIMPAN: '+(error&&error.message?error.message:'Kesalahan tidak diketahui.'),'error');
  toast('Gagal menyimpan nilai Albab: '+(error.message||'Periksa koneksi.'));
 }finally{btn.dataset.busy='0';btn.disabled=false;btn.textContent=old}
}
const albabSaveButton=$('#formAlbab .albab-save-action');
if(albabSaveButton)albabSaveButton.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();handleAlbabSave()});
$('#formAlbab').addEventListener('submit',function(event){event.preventDefault();event.stopPropagation();handleAlbabSave()});



/* HAFALAN KITAB & NADZOM */
function setHafalanLookupStatus(message,kind){
 const el=$('#hafalanLookupStatus');if(!el)return;
 el.textContent=message;el.style.display='block';el.style.padding='9px 11px';el.style.marginTop='8px';el.style.borderRadius='8px';
 el.style.background=kind==='error'?'#fff0f0':kind==='success'?'#eaf8ef':'#eef5ff';
 el.style.color=kind==='error'?'#a12626':kind==='success'?'#176b3a':'#24527a';
}
async function lookupHafalanStudent(){
 const input=$('#hafalanNis'),nama=$('#hafalanNama'),kelas=$('#hafalanKelas'),btn=$('#findHafalan');
 if(!input||!nama||!kelas){setHafalanLookupStatus('Form Hafalan tidak ditemukan. Muat ulang halaman.','error');return}
 const raw=String(input.value||'').trim();
 const label=raw.match(/NIS\s*[:=：-]\s*(\d+)/i);
 const tail=raw.split(/[|;]/).pop()||raw;
 const nis=(label&&label[1])||(tail.match(/\d+/g)||[]).join('');
 if(!nis){setHafalanLookupStatus('Masukkan NIS santri terlebih dahulu.','error');input.focus();return}
 input.value=nis;nama.value='';kelas.value='';
 setHafalanLookupStatus('Sedang mencari NIS '+nis+'…','loading');
 if(btn){btn.disabled=true;btn.textContent='Mencari…'}
 try{
  const response=await fetch(API_URL+'?action=student&nis='+encodeURIComponent(nis)+'&_='+Date.now(),{method:'GET',cache:'no-store'});
  if(!response.ok)throw new Error('Server biodata merespons HTTP '+response.status);
  const result=await response.json();
  if(!result||result.ok!==true||!result.data)throw new Error(result&&result.error?result.error:'Biodata santri tidak ditemukan.');
  const student=result.data;
  if(!student.nama)throw new Error('Data NIS ditemukan, tetapi nama santri kosong.');
  input.value=String(student.nis||nis).replace(/\D/g,'');
  nama.value=student.nama||'';kelas.value=student.kelas||'';
  setHafalanLookupStatus('✓ Biodata ditemukan: '+nama.value+(kelas.value?' — '+kelas.value:''),'success');
 }catch(err){
  nama.value='';kelas.value='';
  setHafalanLookupStatus('Pencarian NIS gagal: '+(err&&err.message?err.message:'Periksa koneksi internet.'),'error');
 }finally{
  if(btn){btn.disabled=false;btn.textContent='Cari'}
 }
}
window.lookupHafalanStudent=lookupHafalanStudent;
/* Handler khusus Hafalan: dipasang langsung pada elemen form agar tidak bergantung
   pada delegated listener bersama modul lain. Perubahan dibatasi ke modul ini. */
const hafalanFindButton=$('#findHafalan'),hafalanScanButton=$('#scanHafalan'),hafalanNisInput=$('#hafalanNis');
if(hafalanFindButton)hafalanFindButton.addEventListener('click',event=>{event.preventDefault();lookupHafalanStudent()});
if(hafalanNisInput)hafalanNisInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();lookupHafalanStudent()}});
if(hafalanScanButton)hafalanScanButton.addEventListener('click',event=>{event.preventDefault();openQr('hafalan')});
$('#refreshHafalan').onclick=()=>{const n=$('#hafalanNis').value.trim();if(n)loadHafalanHistory(n);else setHafalanLookupStatus('Masukkan NIS santri terlebih dahulu.','error')};
$('#formHafalan').addEventListener('reset',()=>setTimeout(()=>{$('#hafalanNama').value='';$('#hafalanKelas').value='';setHafalanLookupStatus('Form dikosongkan.','loading')},0));
function hafalanSaveStatus(message,kind){
 const el=$('#hafalanSaveStatus');if(!el)return;el.textContent=message;el.style.cssText='display:block;margin:12px 0;padding:12px 14px;border-radius:10px;font-weight:600;background:'+(kind==='error'?'#fff0f0':kind==='success'?'#eaf8ef':'#eef5ff')+';color:'+(kind==='error'?'#a12626':kind==='success'?'#176b3a':'#24527a');
}
async function sendHafalanSave(payload,key){
 const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'saveeducationhafalan',apiKey:key,data:payload})});
 const raw=await response.text();let result;
 try{result=JSON.parse(raw)}catch(_){throw new Error('Server tidak mengirim JSON yang valid. Periksa URL deployment Apps Script.')}
 if(!response.ok)throw new Error('Server merespons HTTP '+response.status);
 if(!result||result.ok!==true)throw new Error(result&&result.error?result.error:'Server menolak penyimpanan tanpa keterangan.');
 return result;
}
async function handleHafalanSave(){
 const form=$('#formHafalan'),button=$('#saveHafalanBtn');
 if(!form||!button){hafalanSaveStatus('Form atau tombol Simpan Hafalan tidak ditemukan. Muat ulang halaman.','error');return}
 if(button.dataset.busy==='1')return;
 if(!form.checkValidity()){form.reportValidity();return}
 const nis=String($('#hafalanNis').value||'').replace(/\D/g,'');
 const nama=$('#hafalanNama').value.trim(),kelas=$('#hafalanKelas').value.trim();
 if(!nis||!nama){setHafalanLookupStatus('Cari NIS sampai biodata santri muncul sebelum menyimpan.','error');return}
 const target=Number(form.elements.targetBait.value),capaian=Number(form.elements.capaianBait.value);
 if(!Number.isInteger(target)||target<1||!Number.isInteger(capaian)||capaian<0||capaian>target){hafalanSaveStatus('Periksa Target Bait dan Capaian Bait. Capaian harus bilangan bulat dan tidak boleh melebihi target.','error');return}
 const payload={nis,nama,kelas,namaKitabNadzom:form.elements.namaKitabNadzom.value.trim(),jenis:form.elements.jenis.value,targetBait:target,capaianBait:capaian,status:form.elements.status.value,catatan:form.elements.catatan.value.trim(),ustaz:form.elements.ustaz.value.trim()};
 if(!payload.namaKitabNadzom){hafalanSaveStatus('Nama kitab atau nadzom wajib diisi.','error');return}
 button.dataset.busy='1';button.disabled=true;button.textContent='Menyimpan…';
 hafalanSaveStatus('Mengirim catatan hafalan ke Google Sheets…','loading');
 try{
  if(!adminKey){adminKey=await requestAdminKey('Simpan catatan hafalan');if(!adminKey)throw new Error('Penyimpanan dibatalkan: kunci pengurus belum dimasukkan.')}
  let result;
  try{result=await sendHafalanSave(payload,adminKey)}
  catch(error){
   if(!/kunci pengurus tidak valid|akses ditolak/i.test(error.message))throw error;
   adminKey='';sessionStorage.removeItem('ppfha_admin_key');
   adminKey=await requestAdminKey('Kunci pengurus lama ditolak. Masukkan kunci pengurus yang benar.');
   if(!adminKey)throw new Error('Penyimpanan dibatalkan karena kunci pengurus tidak dimasukkan.');
   result=await sendHafalanSave(payload,adminKey);
  }
  adminKey=String(adminKey).trim();sessionStorage.setItem('ppfha_admin_key',adminKey);
  hafalanSaveStatus('✓ BERHASIL DISIMPAN. '+(result.message||'Catatan hafalan sudah diterima server.'),'success');
  toast('Catatan hafalan berhasil disimpan.');
  await loadHafalanHistory(nis);
 }catch(error){
  hafalanSaveStatus('✕ GAGAL DISIMPAN: '+(error&&error.message?error.message:'Kesalahan tidak diketahui.'),'error');
  toast('Gagal menyimpan hafalan: '+(error.message||'Periksa koneksi.'));
 }finally{
  button.dataset.busy='0';button.disabled=false;button.textContent='➤ Simpan Catatan Hafalan';
 }
}
window.handleHafalanSave=handleHafalanSave;
/* Tombol Simpan Hafalan ditangani lewat capture dokumen agar klik selalu tertangkap. */
document.addEventListener('click',function(event){
 const button=event.target&&event.target.closest?event.target.closest('#saveHafalanBtn'):null;
 if(!button)return;
 event.preventDefault();event.stopImmediatePropagation();
 handleHafalanSave();
},true);
$('#formHafalan').addEventListener('submit',event=>{event.preventDefault();event.stopPropagation();handleHafalanSave()});


async function loadHafalanHistory(nis){
 const body=$('#hafalanHistory');if(!body)return;
 if(!adminKey){adminKey=await requestAdminKey('Lihat riwayat hafalan kitab dan nadzom');if(!adminKey){body.innerHTML='<tr><td colspan="9" class="empty">Masukkan kunci pengurus untuk melihat riwayat.</td></tr>';return}adminKey=String(adminKey).trim();sessionStorage.setItem('ppfha_admin_key',adminKey)}
 body.innerHTML='<tr><td colspan="9" class="empty">Memuat riwayat hafalan…</td></tr>';
 try{const r=await fetch(API_URL+'?action=educationrecords&type=hafalan&nis='+encodeURIComponent(nis)+'&key='+encodeURIComponent(adminKey),{cache:'no-store'});const j=await r.json();if(!j.ok)throw new Error(j.error||'Gagal membaca riwayat');
 const rows=j.data||[];body.innerHTML=rows.length?rows.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(x.tanggalInput||'—')+'</td><td>'+esc(x.namaKitabNadzom||'—')+'</td><td>'+esc(x.jenis||'—')+'</td><td>'+esc(x.targetBait||'—')+'</td><td>'+esc(x.capaianBait||'—')+'</td><td>'+esc(x.status||'—')+'</td><td>'+esc(x.catatan||'—')+'</td><td>'+esc(x.ustaz||'—')+'</td></tr>').join(''):'<tr><td colspan="9" class="empty">Belum ada catatan hafalan untuk NIS ini.</td></tr>';
 }catch(err){body.innerHTML='<tr><td colspan="9" class="empty">'+esc(err.message)+'</td></tr>'}
}
/* CATATAN & EVALUASI USTAZ */
async function lookupEvaluasiStudent(){const nis=$('#evaluasiNis').value.trim().replace(/\D/g,'');if(!nis)return;try{const r=await fetch(API_URL+'?action=student&nis='+encodeURIComponent(nis),{cache:'no-store'});const x=await r.json();if(!x.ok||!x.data)throw new Error(x.error||'Santri tidak ditemukan');$('#evaluasiNis').value=x.data.nis;$('#evaluasiNama').value=x.data.nama;$('#evaluasiKelas').value=x.data.kelas||'';await loadEvaluasiHistory(nis)}catch(err){$('#evaluasiNama').value='';$('#evaluasiKelas').value='';toast('Data santri: '+err.message)}}
async function loadEvaluasiHistory(nis){const body=$('#evaluasiHistory');if(!body)return;if(!adminKey){adminKey=await requestAdminKey('Lihat riwayat evaluasi ustaz');if(!adminKey){body.innerHTML='<tr><td colspan="6" class="empty">Masukkan kunci pengurus untuk melihat riwayat.</td></tr>';return}adminKey=String(adminKey).trim();sessionStorage.setItem('ppfha_admin_key',adminKey)}body.innerHTML='<tr><td colspan="6" class="empty">Memuat riwayat evaluasi…</td></tr>';try{const r=await fetch(API_URL+'?action=educationrecords&type=evaluasi&nis='+encodeURIComponent(nis)+'&key='+encodeURIComponent(adminKey),{cache:'no-store'});const x=await r.json();if(!x.ok)throw new Error(x.error||'Gagal membaca riwayat');const rows=x.data||[];body.innerHTML=rows.length?rows.map((v,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(v.tanggalInput||'—')+'</td><td>'+esc(v.kategori||'—')+'</td><td>'+esc(v.catatanEvaluasi||'—')+'</td><td>'+esc(v.saranTindakLanjut||'—')+'</td><td>'+esc(v.ustaz||'—')+'</td></tr>').join(''):'<tr><td colspan="6" class="empty">Belum ada evaluasi untuk NIS ini.</td></tr>'}catch(err){body.innerHTML='<tr><td colspan="6" class="empty">'+esc(err.message)+'</td></tr>'}}
$('#scanEvaluasi').addEventListener('click',()=>openQr('evaluasi'));$('#findEvaluasi').addEventListener('click',lookupEvaluasiStudent);$('#evaluasiNis').addEventListener('change',lookupEvaluasiStudent);$('#evaluasiNis').addEventListener('blur',lookupEvaluasiStudent);
$('#refreshEvaluasi').onclick=()=>{const n=$('#evaluasiNis').value.trim();if(n)loadEvaluasiHistory(n);else toast('Masukkan NIS santri terlebih dahulu.')};
$('#formEvaluasi').addEventListener('reset',()=>setTimeout(()=>{$('#evaluasiNama').value='';$('#evaluasiKelas').value=''},0));
$('#formEvaluasi').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,nis=$('#evaluasiNis').value.trim(),nama=$('#evaluasiNama').value.trim(),kelas=$('#evaluasiKelas').value.trim();if(!nis||!nama){toast('Masukkan NIS santri yang valid terlebih dahulu.');return}if(!form.elements.catatanEvaluasi.value.trim()||!form.elements.ustaz.value.trim()){toast('Catatan evaluasi dan nama ustaz wajib diisi.');return}if(!adminKey){adminKey=await requestAdminKey('Simpan catatan evaluasi ustaz');if(!adminKey)return;sessionStorage.setItem('ppfha_admin_key',adminKey)}const btn=form.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent='Menyimpan…';try{const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'saveeducationevaluasi',apiKey:adminKey,data:{nis,nama,kelas,kategori:form.elements.kategori.value,catatanEvaluasi:form.elements.catatanEvaluasi.value.trim(),saranTindakLanjut:form.elements.saranTindakLanjut.value.trim(),ustaz:form.elements.ustaz.value.trim()}})});const x=await r.json();if(!x.ok)throw new Error(x.error||'Evaluasi gagal disimpan');toast('Catatan evaluasi berhasil disimpan.');await loadEvaluasiHistory(nis)}catch(err){toast('Gagal menyimpan evaluasi: '+err.message)}finally{btn.disabled=false;btn.textContent='➤ Simpan Evaluasi'}});

/* HOTFIX 2026-11-01: pastikan tombol simpan Albab tertangkap dan status selalu terlihat. */
(function(){
 function ensureAlbabSaveStatus(){
  const form=document.getElementById('formAlbab');
  if(!form)return;
  let status=document.getElementById('albabSaveStatus');
  if(!status){
   status=document.createElement('div');
   status.id='albabSaveStatus';
   status.setAttribute('role','status');
   status.setAttribute('aria-live','polite');
   status.style.display='none';
   const actions=form.querySelector('.actions');
   if(actions)form.insertBefore(status,actions);
   else form.appendChild(status);
  }
 }
 ensureAlbabSaveStatus();
 document.addEventListener('input',function(event){
  if(event.target&&['nilaiTulis','nilaiBaca'].includes(event.target.id)){
   if(typeof updateAlbabFinal==='function')updateAlbabFinal();
  }
 },true);
 document.addEventListener('click',function(event){
  const button=event.target&&event.target.closest?event.target.closest('#formAlbab .albab-save-action'):null;
  if(!button)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  ensureAlbabSaveStatus();
  if(typeof handleAlbabSave==='function')handleAlbabSave();
  else {
   const status=document.getElementById('albabSaveStatus');
   if(status){status.textContent='Kesalahan aplikasi: fungsi simpan belum siap. Muat ulang halaman.';status.style.display='block';}
  }
 },true);
})();


/* HOTFIX 2026-11-01: jalur langsung tombol Simpan Hafalan/Nadzom, setara Albab. */
(function(){
 function ensureHafalanSaveStatus(){
  const form=document.getElementById('formHafalan');
  if(!form)return null;
  let status=document.getElementById('hafalanSaveStatus');
  if(!status){
   status=document.createElement('div');
   status.id='hafalanSaveStatus';
   status.setAttribute('role','status');
   status.setAttribute('aria-live','polite');
   status.style.display='none';
   const actions=form.querySelector('.actions');
   if(actions)form.insertBefore(status,actions);
   else form.appendChild(status);
  }
  return status;
 }
 ensureHafalanSaveStatus();
 document.addEventListener('click',function(event){
  const button=event.target&&event.target.closest?event.target.closest('#formHafalan #saveHafalanBtn'):null;
  if(!button)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  ensureHafalanSaveStatus();
  if(typeof handleHafalanSave==='function')handleHafalanSave();
  else {
   const status=ensureHafalanSaveStatus();
   if(status){status.textContent='Kesalahan aplikasi: fungsi simpan Hafalan belum siap. Muat ulang halaman.';status.style.display='block';}
  }
 },true);
})();


/* Liburan Santri: simpan otomatis segera setelah KTS dipindai. */
var liburanData=null,liburanSaving=false;
async function liburanRequest(action,nis){
 if(!adminKey){adminKey=await requestAdminKey('Akses Liburan Santri');if(!adminKey)return null;}
 const options=nis?{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'liburanscankembali',apiKey:adminKey,nis:nis})}:null;
 const url=nis?API_URL:API_URL+'?action=liburanrekap&key='+encodeURIComponent(adminKey);
 const response=await fetch(url,options||{cache:'no-store'});const json=await response.json();
 if(!json.ok)throw new Error(json.error||'Gagal mengakses data liburan');return json;
}
function renderLiburan(){
 if(!liburanData)return;
 const p=liburanData.periode,c=liburanData.jumlah||{},list=liburanData.santri||[];
 $('#liburanJudul').textContent=p?p.judul:'Belum ada masa liburan aktif';
 $('#selesaikanLiburan').classList.toggle('hidden',!p);
 $('#aktifkanLiburan').classList.add('hidden');
 const history=liburanData.riwayat||[];
 $('#liburanRiwayat').innerHTML=history.length?history.map(x=>'<div style="padding:12px 0;border-bottom:1px solid #e5e9e6"><b>'+esc(x.judul)+'</b> · '+esc(x.status)+'<p>'+esc(x.mulai)+' s.d. '+esc(x.akhir)+' · kembali '+esc(x.tenggat)+' '+esc(x.jam)+' WIB</p>'+(x.status==='Draf'?'<button type="button" class="primary liburan-activate" data-id="'+esc(x.id)+'">Aktifkan Liburan</button>':'')+'</div>').join(''):'Belum ada masa liburan yang dibuat.';
 $('#liburanJadwal').textContent=p?'Mulai '+p.mulai+' · Batas kembali '+p.tenggat+' pukul '+p.jam+' WIB':'Buat masa liburan baru, simpan draf, lalu aktifkan dari Riwayat Masa Liburan.';
 $('#liburanTotal').textContent=c.total||0;$('#liburanKembali').textContent=c.kembali||0;
 $('#liburanBelum').textContent=c.belum||0;$('#liburanTerlambat').textContent=c.terlambat||0;
 const q=String($('#liburanFilter').value||'').toLowerCase();
 const filtered=list.filter(x=>(x.nis+' '+x.nama).toLowerCase().includes(q));
 $('#liburanRows').innerHTML=filtered.length?filtered.map(x=>'<tr><td><b>'+esc(x.nama)+'</b><br><small>'+esc(x.nis)+'</small></td><td>'+esc(x.status)+'</td><td>'+esc(x.waktuKembali||'—')+'</td></tr>').join(''):'<tr><td colspan="3">Belum ada data yang cocok.</td></tr>';
}
async function loadLiburan(){
 try{const json=await liburanRequest('liburanrekap');if(!json)return;liburanData=json;renderLiburan();}
 catch(err){$('#liburanHasil').textContent='Gagal memuat: '+err.message;toast('Liburan: '+err.message);}
}
async function catatLiburan(nis){
 nis=String(nis||'').replace(/\D/g,'');
 if(!nis){$('#liburanHasil').textContent='Masukkan NIS santri yang benar.';return}
 if(liburanSaving)return;
 liburanSaving=true;$('#liburanHasil').textContent='Menyimpan kepulangan NIS '+nis+'…';
 try{
  const result=await liburanRequest('liburanscankembali',nis);if(!result)return;
  $('#liburanHasil').textContent=(result.duplikat?'Sudah pernah tercatat: ':'Berhasil tersimpan: ')+result.nama+' · '+result.status+' · '+result.waktuKembali;
  $('#liburanNis').value='';await loadLiburan();
 }catch(err){$('#liburanHasil').textContent='Belum tersimpan: '+err.message;toast(err.message)}
 finally{liburanSaving=false}
}
async function simpanMasaLiburan(action,data){
 if(!adminKey){adminKey=await requestAdminKey('Kelola Masa Liburan');if(!adminKey)return;}
 const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:action,apiKey:adminKey,data:data})});
 const result=await response.json();if(!result.ok)throw new Error(result.error||'Gagal menyimpan');return result;
}
$('#buatLiburan').onclick=()=>{$('#formMasaLiburan').classList.remove('hidden');$('#formMasaLiburan').style.setProperty('display','block','important');$('#formMasaLiburan').scrollIntoView({behavior:'smooth'});};
$('#batalMasaLiburan').onclick=()=>{$('#formMasaLiburan').classList.add('hidden');$('#formMasaLiburan').style.setProperty('display','none','important');};
$('#formMasaLiburan').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('[type="submit"]');if(button.disabled)return;const d=Object.fromEntries(new FormData(form).entries());button.disabled=true;try{const r=await simpanMasaLiburan('liburanbuatperiode',d);toast(r.message);form.reset();form.classList.add('hidden');form.style.setProperty('display','none','important');await loadLiburan();}catch(err){toast(err.message)}finally{button.disabled=false;}});
$('#liburanRiwayat').addEventListener('click',async e=>{const b=e.target.closest('.liburan-activate');if(!b)return;if(!await askConfirmation('Aktifkan liburan?','Seluruh santri aktif akan masuk daftar liburan. Scan KTS setelah diaktifkan.','Aktifkan'))return;b.disabled=true;try{const r=await simpanMasaLiburan('liburanubahstatus',{id:b.dataset.id,status:'Aktif'});toast(r.message);await loadLiburan();}catch(err){toast(err.message)}finally{b.disabled=false;}});
$('#selesaikanLiburan').onclick=async()=>{if(!liburanData||!liburanData.periode)return;if(!await askConfirmation('Selesaikan liburan?','Periode akan ditutup dan disimpan dalam riwayat. Scan kepulangan tidak lagi dapat dilakukan untuk periode ini.','Selesaikan'))return;try{const r=await simpanMasaLiburan('liburanubahstatus',{id:liburanData.periode.id,status:'Selesai'});toast(r.message);await loadLiburan();}catch(err){toast(err.message)}};
$('#liburanScan').addEventListener('click',()=>openQr('liburan'));
$('#liburanCari').addEventListener('click',()=>catatLiburan($('#liburanNis').value));
$('#liburanNis').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();catatLiburan(e.target.value)}});
$('#liburanFilter').addEventListener('input',renderLiburan);
$('#refreshLiburan').addEventListener('click',loadLiburan);


/* ================= SPP PUTRI ================= */
let sppCurrentStudent=null,sppCurrentBills=[];
async function sppApiGet(action,params={}){
 const q=new URLSearchParams({action,...params});
 const r=await fetch(API_URL+'?'+q.toString(),{cache:'no-store'});return await r.json();
}
async function sppApiPost(action,data){
 const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,data})});
 return await r.json();
}
function sppMoney(n){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0)}
function sppPeriodNow(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
async function sppFindStudent(nis){
 nis=String(nis||$('#sppNis')?.value||'').replace(/\D/g,'');
 if(!nis){toast('Masukkan NIS santri PUTRI.');return}
 $('#sppStudentResult').textContent='Mencari data santri PUTRI…';
 $('#sppPaymentArea').hidden=true;
 try{
  const j=await sppApiGet('spp_student',{nis});
  if(!j.ok||!j.data)throw new Error(j.error||'Santri tidak ditemukan.');
  sppCurrentStudent=j.data;
  $('#sppStudentResult').innerHTML='<div class="spp-student-card"><b>'+esc(j.data.nama)+'</b><p>NIS: '+esc(j.data.nis)+' · Kelas: '+esc(j.data.kelas||'—')+' · Asrama: '+esc(j.data.asrama||'—')+'</p><small>Wali: '+esc(j.data.wali||'—')+'</small></div>';
  $('#sppPaymentArea').hidden=false;
  $('#sppPeriod').value=sppPeriodNow();
  await sppLoadBills();
  await sppLoadHistory();
 }catch(e){$('#sppStudentResult').textContent=e.message;toast(e.message)}
}
async function sppLoadBills(){
 if(!sppCurrentStudent)return;
 const period=$('#sppPeriod').value||'';
 $('#sppBills').textContent='Memuat tagihan…';
 try{
  const j=await sppApiGet('spp_tagihan',{nis:sppCurrentStudent.nis,periode:period});
  if(!j.ok)throw new Error(j.error||'Tagihan gagal dimuat.');
  sppCurrentBills=j.data||[];
  if(!sppCurrentBills.length){$('#sppBills').innerHTML='<div class="spp-empty-state">Belum ada tagihan pada periode ini.</div>';return}
  $('#sppBills').innerHTML='<div class="spp-table-wrap"><table class="spp-table"><thead><tr><th>PILIH</th><th>PERIODE</th><th>NOMINAL</th><th>STATUS</th></tr></thead><tbody>'+sppCurrentBills.map(x=>'<tr><td>'+(x.status=== 'Belum Lunas'||x.status==='Ditolak'?'<input type="checkbox" class="sppBillCheck" value="'+esc(x.idTagihan)+'">':'—')+'</td><td>'+esc(x.periode)+'</td><td>'+sppMoney(x.nominal)+'</td><td>'+esc(x.status)+'</td></tr>').join('')+'</tbody></table></div>';
 }catch(e){$('#sppBills').textContent=e.message;toast(e.message)}
}
async function sppLoadHistory(){
 if(!sppCurrentStudent)return;
 try{const j=await sppApiGet('spp_riwayat',{nis:sppCurrentStudent.nis});const rows=j.data||[];
 $('#sppHistory').innerHTML='<h3>Riwayat Pembayaran</h3>'+(rows.length?'<div class="spp-table-wrap"><table class="spp-table"><thead><tr><th>TANGGAL</th><th>PERIODE</th><th>NOMINAL</th><th>METODE</th><th>STATUS</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+dateOnly(x.tanggalAjukan)+'</td><td>'+esc(x.periode)+'</td><td>'+sppMoney(x.nominal)+'</td><td>'+esc(x.metode)+'</td><td>'+esc(x.status)+'</td></tr>').join('')+'</tbody></table></div>':'<p>Belum ada riwayat pembayaran.</p>');
 }catch(e){toast(e.message)}
}
async function sppSubmitPayment(){
 if(!sppCurrentStudent)return;
 const ids=$$('.sppBillCheck:checked').map(x=>x.value),metode=$('#sppMethod').value,proof=$('#sppProof').value.trim();
 if(!ids.length){toast('Pilih minimal satu tagihan yang belum lunas.');return}
 if(metode==='transfer'&&!proof){toast('Masukkan tautan bukti transfer terlebih dahulu.');return}
 if(!await askConfirmation('Ajukan pembayaran SPP','Pembayaran akan masuk status Menunggu Verifikasi. Lanjutkan?','Ya, Ajukan'))return;
 try{const j=await sppApiPost('spp_ajukan_pembayaran',{nis:sppCurrentStudent.nis,tagihanIds:ids,metode,referensiBukti:proof});
 if(!j.ok)throw new Error(j.error||'Pembayaran gagal disimpan.');
 toast(j.message||'Pembayaran diajukan.');$('#sppProof').value='';await sppLoadBills();await sppLoadHistory();
 }catch(e){toast(e.message)}
}
async function sppLoadSettings(){
 const info=$('#sppSettingsInfo'),field=$('#sppPutriNominal');
 info.textContent='Memuat pengaturan nominal SPP PUTRI…';
 const key=await requestAdminKey('Melihat pengaturan nominal SPP PUTRI');
 if(!key){info.textContent='Akses bendahara diperlukan untuk melihat nominal.';return;}
 try{
  const j=await sppApiGet('spp_pengaturan',{key:String(key).trim()});
  if(!j.ok)throw new Error(j.error||'Pengaturan gagal dimuat.');
  field.value=j.nominalSpp||'';
  info.textContent=j.nominalSpp?'Nominal aktif saat ini: '+sppMoney(j.nominalSpp):'Nominal SPP PUTRI belum ditetapkan. Isi nominal lalu tekan Simpan Pengaturan.';
 }catch(e){info.textContent=e.message;toast(e.message);}
}
async function sppSaveSettings(){
 const field=$('#sppPutriNominal'),amount=Number(field.value);
 if(!Number.isSafeInteger(amount)||amount<=0){toast('Masukkan nominal SPP berupa angka bulat lebih dari Rp0.');field.focus();return;}
 const key=await requestAdminKey('Menyimpan nominal SPP PUTRI');
 if(!key)return;
 if(!await askConfirmation('Simpan nominal SPP PUTRI','Nominal bulanan akan diubah menjadi '+sppMoney(amount)+'. Tagihan lama tidak berubah; tagihan baru memakai nominal ini.','Simpan Nominal'))return;
 const btn=$('#sppSaveSettings'),old=btn.textContent;btn.disabled=true;btn.textContent='Menyimpan…';
 try{
  const j=await sppApiPost('spp_simpan_pengaturan',{apiKey:String(key).trim(),nominalSpp:amount});
  if(!j.ok)throw new Error(j.error||'Pengaturan gagal disimpan.');
  $('#sppSettingsInfo').textContent='Nominal SPP PUTRI aktif: '+sppMoney(j.nominalSpp)+'.';
  toast(j.message||'Nominal SPP PUTRI berhasil disimpan.');
 }catch(e){toast(e.message);$('#sppSettingsInfo').textContent=e.message;}
 finally{btn.disabled=false;btn.textContent=old;}
}
async function sppCreateBills(){
 const periode=$('#sppCreatePeriod').value,nominal=Number($('#sppCreateAmount').value);
 if(!periode||!Number.isSafeInteger(nominal)||nominal<=0){toast('Periode dan nominal SPP wajib diisi.');return}
 const key=await requestAdminKey('Pembuatan tagihan SPP PUTRI');if(!key)return;
 if(!await askConfirmation('Buat tagihan SPP','Tagihan akan dibuat untuk seluruh santri PUTRI aktif yang belum memiliki tagihan periode ini.','Buat Tagihan'))return;
 try{const j=await sppApiPost('spp_buat_tagihan',{apiKey:key,periode,nominal});if(!j.ok)throw new Error(j.error||'Gagal membuat tagihan.');toast(j.message+' Jumlah: '+j.created);if(sppCurrentStudent)await sppLoadBills();}
 catch(e){toast(e.message)}
}
document.addEventListener('click',e=>{
 const id=e.target&&e.target.id;
 if(id==='sppFind'){e.preventDefault();sppFindStudent();}
 if(id==='sppScan'){e.preventDefault();openQr('spp');}
 if(id==='sppLoadBills'){e.preventDefault();sppLoadBills();}
 if(id==='sppSubmit'){e.preventDefault();sppSubmitPayment();}
 if(id==='sppCreateBills'){e.preventDefault();sppCreateBills();}
 if(id==='sppLoadSettings'){e.preventDefault();sppLoadSettings();}
 if(id==='sppSaveSettings'){e.preventDefault();sppSaveSettings();}
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='sppNis'){e.preventDefault();sppFindStudent();}});

/* VERIFIKASI PEMBAYARAN SPP PUTRI */
async function sppLoadPending(){
 const body=$('#sppPendingList'),count=$('#sppPendingCount');
 body.textContent='Memuat daftar pembayaran…';
 const key=await requestAdminKey('Verifikasi pembayaran SPP PUTRI');
 if(!key){body.textContent='Akses pengurus diperlukan untuk melihat pembayaran.';return;}
 try{
  const j=await sppApiGet('spp_pending',{key:String(key).trim()});
  if(!j.ok)throw new Error(j.error||'Gagal memuat pembayaran.');
  const rows=j.data||[];count.textContent=rows.length+' menunggu';
  if(!rows.length){body.innerHTML='<div class="spp-empty-state">Tidak ada pembayaran yang menunggu verifikasi.</div>';return;}
  body.innerHTML='<div class="spp-table-wrap"><table class="spp-table"><thead><tr><th>TANGGAL</th><th>SANTRI / NIS</th><th>PERIODE</th><th>NOMINAL</th><th>METODE</th><th>BUKTI</th><th>AKSI</th></tr></thead><tbody>'+
   rows.map(x=>'<tr><td>'+dateOnly(x.tanggalAjukan)+'</td><td><b>'+esc(x.nama||'—')+'</b><br><small>'+esc(x.nis||'—')+'</small></td><td>'+esc(x.periode||'—')+'</td><td>'+sppMoney(x.nominal)+'</td><td>'+esc(x.metode||'—')+'</td><td>'+(x.referensiBukti?'<a href="'+esc(x.referensiBukti)+'" target="_blank" rel="noopener">Lihat bukti ↗</a>':'—')+'</td><td><button type="button" class="primary spp-verify" data-id="'+esc(x.idPembayaran)+'">Sahkan</button> <button type="button" class="secondary spp-reject" data-id="'+esc(x.idPembayaran)+'">Tolak</button></td></tr>').join('')+'</tbody></table></div>';
 }catch(e){body.textContent=e.message;toast(e.message);}
}
async function sppReviewPayment(id,approved){
 const key=await requestAdminKey(approved?'Sahkan pembayaran SPP PUTRI':'Tolak pembayaran SPP PUTRI');if(!key)return;
 let catatan='';
 if(!approved){catatan=prompt('Tuliskan alasan penolakan pembayaran:')||'';if(!catatan.trim()){toast('Alasan penolakan wajib diisi.');return;}}
 if(!await askConfirmation(approved?'Sahkan pembayaran?':'Tolak pembayaran?',approved?'Tagihan terkait akan berubah menjadi Lunas.':'Pengajuan ditolak dan tagihan dapat diajukan kembali.',approved?'Sahkan':'Tolak'))return;
 try{
  const j=await sppApiPost(approved?'spp_verifikasi':'spp_tolak',{apiKey:String(key).trim(),idPembayaran:id,diverifikasiOleh:'Pengurus PUTRI',catatan});
  if(!j.ok)throw new Error(j.error||'Status pembayaran gagal diperbarui.');
  toast(j.message||'Status pembayaran diperbarui.');await sppLoadPending();
  if(sppCurrentStudent){await sppLoadBills();await sppLoadHistory();}
 }catch(e){toast(e.message);}
}
document.addEventListener('click',e=>{
 const b=e.target&&e.target.closest?e.target.closest('#sppLoadPending,#sppVerificationPanel .spp-verify,#sppVerificationPanel .spp-reject'):null;
 if(!b)return;
 if(b.id==='sppLoadPending'){e.preventDefault();sppLoadPending();return;}
 e.preventDefault();sppReviewPayment(b.dataset.id,b.classList.contains('spp-verify'));
});


/* PORTAL PEMBAYARAN MANDIRI SPP PUTRI */
var sppPortalStudent=null,sppPortalBills=[]; // var di-hoist agar handler klik tidak terkena temporal dead zone.
function sppPortalFormatPeriod(p){const raw=String(p??'').trim();const m=raw.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?(?:T.*)?$/i);let year='',month=0;if(m){year=m[1];month=Number(m[2]);}else{const d=new Date(raw);if(raw&&Number.isFinite(d.getTime())){year=String(d.getUTCFullYear());month=d.getUTCMonth()+1;}}if(month>=1&&month<=12&&year){const date=new Date(Date.UTC(Number(year),month-1,1));const label=new Intl.DateTimeFormat('id-ID',{month:'long',timeZone:'UTC'}).format(date);return label+' '+year;}return raw||'Periode';}
function sppPortalUpdateTotal(){const container=$('#sppPortalMonths');const out=$('#sppPortalTotal');if(!out)return;const checks=container?Array.from(container.querySelectorAll('.spp-portal-check:checked')):[];const total=checks.reduce((sum,input)=>sum+Number(input.dataset.amount||((sppPortalBills.find(b=>String(b.idTagihan)===input.value)||{}).nominal)||0),0);out.textContent=sppMoney(total);}
async function sppPortalLoadHistory(){if(!sppPortalStudent)return;try{const j=await sppApiGet('spp_riwayat',{nis:sppPortalStudent.nis});const rows=j.data||[];$('#sppPortalHistory').innerHTML='<h3>Riwayat Pembayaran</h3>'+(rows.length?rows.map(x=>'<div class="spp-portal-history-row"><span>'+esc(sppPortalFormatPeriod(x.periode))+'<small>'+esc(x.metode||'—')+'</small></span><b>'+sppMoney(x.nominal)+'</b><em>'+esc(x.status||'—')+'</em></div>').join(''):'<p>Belum ada riwayat pembayaran.</p>');}catch(e){$('#sppPortalHistory').textContent='Riwayat belum dapat dimuat.';}}
async function sppPortalLoadBills(){if(!sppPortalStudent)return;$('#sppPortalMonths').innerHTML='<p>Memuat daftar bulan tagihan…</p>';try{const j=await sppApiGet('spp_tagihan',{nis:sppPortalStudent.nis});if(!j.ok)throw new Error(j.error||'Tagihan gagal dimuat.');sppPortalBills=j.data||[];const fee=$('#sppPortalFee');if(fee)fee.textContent=j.nominal?sppMoney(j.nominal):'Belum diatur';if(!sppPortalBills.length){$('#sppPortalMonths').innerHTML='<div class="spp-portal-no-bills">Belum ada tagihan SPP untuk santri ini. Silakan hubungi bendahara PUTRI.</div>';return;}sppPortalBills.sort((a,b)=>String(a.periode).localeCompare(String(b.periode)));$('#sppPortalMonths').innerHTML=sppPortalBills.map(b=>{const paid=b.status==='Lunas',pending=b.status==='Menunggu Verifikasi',available=b.status==='Belum Lunas'||b.status==='Ditolak';return '<label class="spp-portal-month '+(paid?'is-paid':pending?'is-pending':'')+'"><span><b>'+esc(sppPortalFormatPeriod(b.periode))+'</b><small>'+esc(b.status)+'</small></span>'+(available?'<input class="spp-portal-check" type="checkbox" value="'+esc(b.idTagihan)+'" data-amount="'+Number(b.nominal||0)+'">':'<span class="spp-portal-status">'+(paid?'✓':'◷')+'</span>')+'</label>';}).join('');sppPortalUpdateTotal();}catch(e){$('#sppPortalMonths').textContent=e.message;toast(e.message);}}
async function sppPortalFindStudent(nis){nis=String(nis||$('#sppPortalNis').value||'').replace(/\\D/g,'');if(!nis){toast('Masukkan NIS santri PUTRI.');return;}$('#sppPortalFind').disabled=true;$('#sppPortalFind').textContent='Mencari…';try{const j=await sppApiGet('spp_student',{nis});if(!j.ok||!j.data)throw new Error(j.error||'Santri tidak ditemukan.');sppPortalStudent=j.data;$('#sppPortalResult').hidden=false;$('#sppPortalName').textContent=j.data.nama||'—';$('#sppPortalNisValue').textContent=j.data.nis||'—';$('#sppPortalClass').textContent=j.data.kelas||'—';$('#sppPortalDorm').textContent=j.data.asrama||'—';$('#sppPortalGuardian').textContent=j.data.wali||'—';$('#sppPortalPhone').textContent=j.data.noWaWali||'—';if(j.data.fotoUrl){$('#sppPortalAvatar').innerHTML='<img src="'+esc(j.data.fotoUrl)+'" alt="Foto santri">';}else{$('#sppPortalAvatar').textContent=(j.data.nama||'FH').trim().charAt(0).toUpperCase();}$('#sppPortalProofBox').hidden=true;$('#sppPortalCashBox').hidden=true;await sppPortalLoadBills();await sppPortalLoadHistory();$('#sppPortalResult').scrollIntoView({behavior:'smooth',block:'start'});}catch(e){toast(e.message);$('#sppPortalResult').hidden=true;}finally{$('#sppPortalFind').disabled=false;$('#sppPortalFind').textContent='Cek';}}
function sppPortalSelectedIds(){return $$('#sppPortalMonths .spp-portal-check:checked').map(x=>x.value);}
async function sppPortalSubmit(method){if(!sppPortalStudent)return;const ids=sppPortalSelectedIds();if(!ids.length){toast('Pilih minimal satu bulan tagihan yang belum lunas.');return;}const proof=method==='transfer'?$('#sppPortalProof').value.trim():'';if(method==='transfer'&&!proof){toast('Masukkan tautan bukti transfer terlebih dahulu.');return;}if(!await askConfirmation('Ajukan pembayaran SPP','Total pembayaran '+$('#sppPortalTotal').textContent+'. Pengajuan akan menunggu verifikasi bendahara PUTRI.', 'Ya, Ajukan'))return;try{const j=await sppApiPost('spp_ajukan_pembayaran',{nis:sppPortalStudent.nis,tagihanIds:ids,metode:method,referensiBukti:proof});if(!j.ok)throw new Error(j.error||'Pengajuan pembayaran gagal.');toast(j.message||'Pembayaran berhasil diajukan.');$('#sppPortalProof').value='';$('#sppPortalProofBox').hidden=true;$('#sppPortalCashBox').hidden=true;await sppPortalLoadBills();await sppPortalLoadHistory();}catch(e){toast(e.message);}}
document.addEventListener('click',e=>{const id=e.target&&e.target.id;if(id==='sppPortalFind'){e.preventDefault();sppPortalFindStudent();}if(id==='sppPortalScan'){e.preventDefault();openQr('spp-portal');}if(id==='sppPortalOnline'){if(!sppPortalSelectedIds().length){toast('Pilih bulan tagihan terlebih dahulu.');return;}$('#sppPortalCashBox').hidden=true;$('#sppPortalProofBox').hidden=false;$('#sppPortalProofBox').scrollIntoView({behavior:'smooth',block:'nearest'});}if(id==='sppPortalCash'){if(!sppPortalSelectedIds().length){toast('Pilih bulan tagihan terlebih dahulu.');return;}$('#sppPortalProofBox').hidden=true;$('#sppPortalCashBox').hidden=false;$('#sppPortalCashBox').scrollIntoView({behavior:'smooth',block:'nearest'});}if(id==='sppPortalSubmitOnline'){e.preventDefault();sppPortalSubmit('transfer');}if(id==='sppPortalSubmitCash'){e.preventDefault();sppPortalSubmit('tunai');}if(id==='sppPortalReset'){sppPortalStudent=null;sppPortalBills=[];$('#sppPortalNis').value='';$('#sppPortalResult').hidden=true;$('#sppPortalNis').focus();window.scrollTo({top:0,behavior:'smooth'});}});
document.addEventListener('change',e=>{if(e.target&&e.target.classList.contains('spp-portal-check'))sppPortalUpdateTotal();});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='sppPortalNis'){e.preventDefault();sppPortalFindStudent();}});


/* Pengikat tombol portal SPP PUTRI secara langsung sebagai pengaman event delegation. */
(function(){
 function bindSppPortal(){
  const nis=document.getElementById('sppPortalNis');
  const find=document.getElementById('sppPortalFind');
  const scan=document.getElementById('sppPortalScan');
  const online=document.getElementById('sppPortalOnline');
  const cash=document.getElementById('sppPortalCash');
  const submitOnline=document.getElementById('sppPortalSubmitOnline');
  const submitCash=document.getElementById('sppPortalSubmitCash');
  const reset=document.getElementById('sppPortalReset');
  if(find)find.onclick=function(e){e.preventDefault();if(typeof sppPortalFindStudent==='function')sppPortalFindStudent(nis?nis.value:'');else alert('Fungsi pencarian belum termuat. Muat ulang halaman.');};
  if(nis)nis.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();if(typeof sppPortalFindStudent==='function')sppPortalFindStudent(nis.value);}};
  if(scan)scan.onclick=function(e){e.preventDefault();if(typeof openQr==='function')openQr('spp-portal');else alert('Pemindai QR belum siap. Muat ulang halaman.');};
  if(online)online.onclick=function(e){e.preventDefault();if(!sppPortalSelectedIds().length){toast('Pilih bulan tagihan terlebih dahulu.');return;}document.getElementById('sppPortalCashBox').hidden=true;document.getElementById('sppPortalProofBox').hidden=false;};
  if(cash)cash.onclick=function(e){e.preventDefault();if(!sppPortalSelectedIds().length){toast('Pilih bulan tagihan terlebih dahulu.');return;}document.getElementById('sppPortalProofBox').hidden=true;document.getElementById('sppPortalCashBox').hidden=false;};
  if(submitOnline)submitOnline.onclick=function(e){e.preventDefault();sppPortalSubmit('transfer');};
  if(submitCash)submitCash.onclick=function(e){e.preventDefault();sppPortalSubmit('tunai');};
  if(reset)reset.onclick=function(e){e.preventDefault();sppPortalStudent=null;sppPortalBills=[];nis.value='';document.getElementById('sppPortalResult').hidden=true;nis.focus();window.scrollTo({top:0,behavior:'smooth'});};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindSppPortal,{once:true});else bindSppPortal();
})();
