const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const API_URL='https://script.google.com/macros/s/AKfycbwgGOvBV8fKNBamDVYNBAgMeFS6-ld0nfjU2OCkbKFxTCEMSRZAf7nSW7Odj5OYxEWQ/exec';
const data={izin:[],peng:[],keg:[]};const names={dashboard:'Dashboard',izin:'Izin Santri',pengumuman:'Pengumuman',kegiatan:'Kegiatan & Jadwal',kehadiran:'Kegiatan & Kehadiran',pendidikan:'Pendidikan Santri'};let adminKey=sessionStorage.getItem('ppfha_admin_key')||'';
function go(p){$$('.page').forEach(x=>x.classList.toggle('active',x.id===p));$$('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===p));$('#title').textContent=names[p]||'Dashboard';window.scrollTo(0,0);if(p==='izin')loadIzin();if(p==='kehadiran')loadAttendanceConfig()}
$$('.nav').forEach(x=>x.onclick=()=>go(x.dataset.page));
function openEducationModule(module){
 const menu=$('#educationMenu');if(menu)menu.classList.add('hidden');
 $$('.education-detail').forEach(x=>x.classList.add('hidden'));
 const target=module==='raport'?'#educationRaportPage':module==='albab'?'#educationAlbabPage':'';
 if(target&&$(target))$(target).classList.remove('hidden');
 const title=module==='raport'?'Nilai Raport Madrasah':'Nilai Ujian Kitab Metode Albab';
 $('#title').textContent=title;window.scrollTo(0,0);
}
function showEducationMenu(){
 $('#educationMenu').classList.remove('hidden');
 $$('.education-detail').forEach(x=>x.classList.add('hidden'));
 $('#title').textContent='Pendidikan Santri';window.scrollTo(0,0);
}
$$('[data-education-open]').forEach(btn=>btn.addEventListener('click',()=>openEducationModule(btn.dataset.educationOpen)));
$$('.education-back').forEach(btn=>btn.addEventListener('click',showEducationMenu));
$$('[data-go]').forEach(x=>x.onclick=()=>go(x.dataset.go));
function requestAdminKey(title){return new Promise(resolve=>{const modal=$('#adminKeyModal'),form=$('#adminKeyForm'),input=$('#adminKeyInput'),desc=$('#adminKeyDescription'),cancel=$('#cancelAdminKey');if(!modal||!form||!input){resolve('');return}desc.textContent=title+' — masukkan kunci pengurus untuk melanjutkan.';input.value='';modal.classList.remove('hidden');setTimeout(()=>input.focus(),80);let settled=false;const finish=value=>{if(settled)return;settled=true;modal.classList.add('hidden');form.removeEventListener('submit',submit);cancel.removeEventListener('click',cancelClick);modal.removeEventListener('click',outside);resolve(value)};const submit=e=>{e.preventDefault();const value=input.value.trim();if(!value){input.focus();return}adminKey=value;sessionStorage.setItem('ppfha_admin_key',value);finish(value)};const cancelClick=()=>finish('');const outside=e=>{if(e.target===modal)finish('')};form.addEventListener('submit',submit);cancel.addEventListener('click',cancelClick);modal.addEventListener('click',outside)})}
let toastTimer;function toast(s){$('#toast').textContent=s;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',4000)}
function askConfirmation(title,message,confirmLabel){return new Promise(resolve=>{const overlay=document.createElement('div');overlay.className='confirm-overlay';overlay.innerHTML='<section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmTitle"><div class="confirm-icon" aria-hidden="true">☾</div><h3 id="confirmTitle"></h3><p class="confirm-message"></p><div class="confirm-actions"><button type="button" class="secondary confirm-cancel">Batal</button><button type="button" class="primary confirm-accept"></button></div></section>';const heading=overlay.querySelector('#confirmTitle'),body=overlay.querySelector('.confirm-message'),cancel=overlay.querySelector('.confirm-cancel'),accept=overlay.querySelector('.confirm-accept');heading.textContent=title;body.textContent=message;accept.textContent=confirmLabel||'Ya, Lanjutkan';const finish=value=>{overlay.remove();document.removeEventListener('keydown',onKey);resolve(value)};const onKey=e=>{if(e.key==='Escape')finish(false)};cancel.onclick=()=>finish(false);accept.onclick=()=>finish(true);overlay.addEventListener('click',e=>{if(e.target===overlay)finish(false)});document.addEventListener('keydown',onKey);document.body.appendChild(overlay);cancel.focus()})}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function dateOnly(s){if(!s)return'—';const d=new Date(s);return isNaN(d)?String(s):d.toLocaleDateString('id-ID')}
function dateTime(s){if(!s)return'—';const d=new Date(s);return isNaN(d)?String(s):d.toLocaleDateString('id-ID')+'<br><small>'+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+'</small>'}
let lastStudentLookup='';
async function lookupStudent(nis){nis=String(nis||'').trim().replace(/\D/g,'');if(!nis)return;const nameInput=$('#formIzin [name="nama"]');if(!nameInput)return;lastStudentLookup=nis;nameInput.value='';nameInput.placeholder='Mencari biodata santri…';try{const r=await fetch(API_URL+'?action=student&nis='+encodeURIComponent(nis),{cache:'no-store'});const j=await r.json();if(lastStudentLookup!==nis)return;if(!j.ok||!j.data)throw new Error(j.error||'Biodata tidak ditemukan');nameInput.value=j.data.nama||'';nameInput.placeholder='Nama lengkap santri';const old=$('#studentLookupInfo');if(old)old.remove();const info=document.createElement('small');info.id='studentLookupInfo';info.style.cssText='display:block;color:#18734f;margin-top:5px';info.textContent='✓ '+(j.data.nama||'Santri')+(j.data.kelas?' · '+j.data.kelas:'')+(j.data.asrama?' · '+j.data.asrama:'');nameInput.insertAdjacentElement('afterend',info);const wali=$('#formIzin [name="wali"]');if(wali&&!wali.value&&j.data.wali)wali.value=j.data.wali;toast('Biodata santri ditemukan.')}catch(err){nameInput.placeholder='Nama lengkap santri';toast(err.message||'Biodata santri belum dapat dibaca.')}}
function chooseStatus(current){return new Promise(resolve=>{const modal=document.createElement('div');modal.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(10,25,20,.55);display:flex;align-items:center;justify-content:center;padding:20px';const panel=document.createElement('div');panel.style.cssText='width:min(100%,380px);background:#fff;border-radius:18px;padding:22px;box-shadow:0 18px 50px rgba(0,0,0,.22);color:#173c30';const title=document.createElement('h3');title.textContent='Pilih Status Izin';title.style.cssText='margin:0 0 8px;font-size:20px';const sub=document.createElement('p');sub.textContent='Sentuh status yang sesuai:';sub.style.cssText='margin:0 0 16px;color:#64756d;font-size:14px';const list=document.createElement('div');list.style.cssText='display:grid;gap:9px';['Diizinkan','Menunggu persetujuan','Ditolak','Sudah keluar','Sudah kembali'].forEach(status=>{const b=document.createElement('button');b.type='button';b.textContent=status;b.style.cssText='width:100%;padding:13px 14px;border-radius:10px;border:1px solid '+(status===current?'#18734f':'#dce6e0')+';background:'+(status===current?'#e8f5ee':'#fff')+';color:#173c30;text-align:left;font-size:15px;font-weight:600;cursor:pointer';b.onclick=()=>{modal.remove();resolve(status)};list.appendChild(b)});const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Batal';cancel.style.cssText='margin-top:14px;width:100%;padding:11px;border:0;border-radius:10px;background:#f1f4f2;color:#41564d;font-weight:600;cursor:pointer';cancel.onclick=()=>{modal.remove();resolve(null)};panel.append(title,sub,list,cancel);modal.appendChild(panel);modal.addEventListener('click',e=>{if(e.target===modal){modal.remove();resolve(null)}});document.body.appendChild(modal)})}
function statusClass(s){s=String(s||'').toLowerCase();if(s.includes('kembali')||s.includes('selesai'))return'status-done';if(s.includes('tolak'))return'status-rejected';if(s.includes('tunggu'))return'status-pending';return'status-active'}
function renderIzin(){const q=($('#search').value||'').toLowerCase(),jenis=$('#filterJenis').value,status=$('#filterStatus').value;const a=data.izin.filter(x=>{const hay=[x.nama,x.nis,x.catatan,x.wali].join(' ').toLowerCase();return hay.includes(q)&&(!jenis||x.jenis===jenis)&&(!status||x.status===status)});$('#nIzin').textContent=data.izin.length;$('#rows').innerHTML=a.length?a.slice().reverse().map((x,i)=>{const isExit=String(x.jenis||'').toLowerCase().includes('izin keluar'),deadline=x.rencanaKembali?new Date(x.rencanaKembali):null,actual=x.kembali?new Date(x.kembali):null,validDeadline=deadline&&!isNaN(deadline.getTime()),lateWhenReturned=isExit&&validDeadline&&actual&&!isNaN(actual.getTime())&&actual.getTime()>deadline.getTime(),lateNow=isExit&&validDeadline&&!actual&&deadline.getTime()<Date.now()&&['diizinkan','sudah keluar'].includes(String(x.status||'').toLowerCase()),late=lateWhenReturned||lateNow,lateMinutes=lateWhenReturned?Math.ceil((actual-deadline)/60000):lateNow?Math.ceil((Date.now()-deadline)/60000):0,shownStatus=lateNow?'Terlambat kembali':(x.status||'Menunggu persetujuan'),rawNote=String(x.catatan||'').replace(/\s*\|?\s*TERLAMBAT KEMBALI\s+\d+\s+menit(?:\s*\(batas\s+[^)]*\))?/ig,'').trim(),deadlineLabel=validDeadline?String(deadline.getHours()).padStart(2,'0')+'.'+String(deadline.getMinutes()).padStart(2,'0'):'',lateNote=late?'Terlambat '+lateMinutes+' menit'+(deadlineLabel?' (batas '+deadlineLabel+')':''):'',note=[rawNote&&rawNote!=='—'?rawNote:'',lateNote].filter(Boolean).join(' · ')||'—';return '<tr><td>'+(i+1)+'</td><td>'+dateTime(x.keluar)+'</td><td><b>'+esc(x.nama)+'</b><br><small>NIS '+esc(x.nis)+'</small></td><td>'+esc(x.jenis)+'</td><td>'+dateOnly(x.keluar)+'<br><small>s/d '+dateOnly(x.rencanaKembali)+'</small></td><td>'+esc(x.wali||'—')+'</td><td>'+esc(note)+''+'</td><td><span class="status-pill '+statusClass(shownStatus)+'">'+esc(shownStatus)+'</span></td><td>'+((!['sudah kembali','ditolak'].includes(String(x.status||'').trim().toLowerCase())&&x.id)?'<button type="button" class="primary return-now" data-id="'+esc(x.id)+'" style="margin-bottom:6px;padding:9px 10px;font-size:12px;white-space:nowrap">✓ Sudah kembali</button><br>':'')+'<button type="button" class="secondary edit-status" data-id="'+esc(x.id||'')+'" data-status="'+esc(x.status||'Menunggu persetujuan')+'" '+(!x.id?'disabled title="Data lama belum memiliki ID"':'')+'>Ubah Status</button></td></tr>';}).join(''):'<tr><td colspan="9" class="empty">Tidak ada data izin yang cocok.</td></tr>'}
function render(){renderIzin();const aktif=data.izin.filter(x=>!['sudah kembali','ditolak'].includes(String(x.status||'').trim().toLowerCase())).length;$('#nIzin').textContent=aktif;$('#nPeng').textContent=data.peng.length;$('#nKeg').textContent=data.keg.length}
async function loadIzin(){const body=$('#rows');if(body)body.innerHTML='<tr><td colspan="8" class="empty">Memuat data izin dari database…</td></tr>';try{const r=await fetch(API_URL+'?action=izin',{cache:'no-store'});const j=await r.json();if(!j.ok)throw new Error(j.error||'Gagal membaca database');data.izin=Array.isArray(j.data)?j.data:[];render()}catch(err){if(body)body.innerHTML='<tr><td colspan="8" class="empty">Data belum berhasil dimuat. Periksa koneksi lalu tekan Muat ulang.</td></tr>';toast('Koneksi data izin gagal: '+err.message)}}
let qrScanner=null,qrTarget=null,qrStarting=false,qrLocked=false;
async function closeQr(){
 const scanner=qrScanner;qrScanner=null;qrLocked=false;
 $('#qrModal').classList.add('hidden');
 if(scanner){try{if(scanner.isScanning)await scanner.stop()}catch(e){}try{await scanner.clear()}catch(e){}}
 const reader=$('#qrReader');if(reader)reader.innerHTML='';
}
async function openQr(target){
 if(qrStarting)return;
 if(typeof Html5Qrcode==='undefined'){toast('Pemindai QR belum termuat. Periksa internet lalu muat ulang halaman.');return}
 qrTarget=target;qrLocked=false;$('#qrMessage').textContent='Menyiapkan kamera…';$('#qrModal').classList.remove('hidden');qrStarting=true;
 try{
  if(qrScanner)await closeQr();
  $('#qrModal').classList.remove('hidden');
  const reader=$('#qrReader');reader.innerHTML='';
  const config={fps:18,qrbox:(viewWidth,viewHeight)=>{const side=Math.max(180,Math.min(300,Math.floor(Math.min(viewWidth,viewHeight)*0.78)));return {width:side,height:side}},aspectRatio:1,disableFlip:false,videoConstraints:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}};
  const onDecoded=async decoded=>{
   if(qrLocked)return;
   const raw=String(decoded||'').trim();let nis=raw;
   try{const obj=JSON.parse(raw);nis=obj.nis||obj.NIS||obj.id||obj.value||raw}catch(e){}
   nis=String(nis).trim().replace(/\D/g,'');
   if(!nis){$('#qrMessage').textContent='QR terbaca, tetapi tidak berisi NIS. Gunakan QR yang berisi nomor induk santri.';return}
   qrLocked=true;$('#qrMessage').textContent='QR terbaca. Memproses barcode santri…';
   if(qrTarget==='attendance'){if(!currentAttendanceActivity){qrLocked=true;await closeQr();toast('Portal kegiatan belum dipilih.');return}await closeQr();await recordAttendanceScan(nis);return}
   if(qrTarget==='raport'){ $('#raportNis').value=nis; await closeQr(); await lookupRaportStudent(); return; }
   if(qrTarget==='albab'){ $('#albabNis').value=nis; await closeQr(); await lookupAlbabStudent(); return; }
   $('#nisInput').value=nis;$('#formIzin').classList.remove('hidden');
   if(qrTarget==='search'){$('#search').value=nis;renderIzin()}
   await closeQr();
   $('#formIzin').scrollIntoView({behavior:'smooth',block:'start'});
   await lookupStudent(nis);
  };
  qrScanner=new Html5Qrcode('qrReader',{formatsToSupport:[Html5QrcodeSupportedFormats.QR_CODE],verbose:false});
  try{
   await qrScanner.start({facingMode:'environment'},config,onDecoded,()=>{});
  }catch(firstError){
   // Some Android browsers reject facingMode; retry using the actual rear-camera device ID.
   try{
    const cameras=await Html5Qrcode.getCameras();
    if(!cameras||!cameras.length)throw firstError;
    const rear=cameras.find(c=>/back|rear|environment|belakang|utama/i.test(c.label||''))||cameras[cameras.length-1];
    await qrScanner.start(rear.id,config,onDecoded,()=>{});
   }catch(secondError){throw secondError||firstError}
  }
  $('#qrMessage').textContent='Kamera aktif. Dekatkan QR ke kotak pemindai dan tahan sebentar agar fokus.';
 }catch(err){
  const msg=String(err&&err.message||err||'');
  let help='Kamera tidak bisa dibuka.';
  if(/permission|denied|notallowed|not allowed/i.test(msg))help='Izin kamera ditolak. Buka setelan situs di browser, izinkan Kamera, lalu coba lagi.';
  else if(/notfound|no camera|device not found/i.test(msg))help='Kamera tidak ditemukan. Pastikan kamera tidak sedang dipakai aplikasi lain.';
  else if(/secure|https/i.test(msg))help='Kamera memerlukan situs HTTPS. Buka alamat aplikasi yang diawali https://.';
  else help+=' Tutup aplikasi lain yang memakai kamera, izinkan akses kamera, lalu coba lagi.';
  $('#qrMessage').textContent=help;toast(help);
  if(qrScanner){try{if(qrScanner.isScanning)await qrScanner.stop()}catch(e){}try{await qrScanner.clear()}catch(e){}qrScanner=null}
 }finally{qrStarting=false}
}
const jenisSelect=$('#formIzin [name="jenis"]');
const keluarInput=$('#formIzin [name="keluar"]');
const kembaliInput=$('#formIzin [name="rencanaKembali"]');
function applyJenisIzin(){
 const isKeluar=jenisSelect.value==='Izin Keluar (berbatas waktu)';
 const label=keluarInput.closest('label'); if(label)label.innerHTML=(isKeluar?'Waktu Keluar *':'Tanggal / Waktu Berangkat *')+'<input name="keluar" type="datetime-local" required>';
 const planLabel=kembaliInput.closest('label'); if(planLabel)planLabel.innerHTML=(isKeluar?'Batas Waktu Kembali *':'Rencana Kembali *')+'<input name="rencanaKembali" type="datetime-local" required>';
 const freshKeluar=$('#formIzin [name="keluar"]'),freshKembali=$('#formIzin [name="rencanaKembali"]');
 const now=new Date();now.setMinutes(now.getMinutes()-now.getTimezoneOffset());const local=now.toISOString().slice(0,16);
 if(!freshKeluar.value)freshKeluar.value=local;
 if(!freshKembali.value){const later=new Date(now);later.setHours(later.getHours()+(isKeluar?0:24));freshKembali.value=later.toISOString().slice(0,16);}if(isKeluar){freshKembali.removeAttribute('min');}
}
jenisSelect.addEventListener('change',applyJenisIzin);
$('#formIzin').addEventListener('change',e=>{if(e.target.name==='keluar'){applyJenisIzin();return}if(e.target.name==='rencanaKembali'&&jenisSelect.value==='Izin Keluar (berbatas waktu)'){const start=new Date($('#formIzin [name="keluar"]').value),end=new Date(e.target.value);if(end<start){e.target.value=$('#formIzin [name="keluar"]').value;toast('Batas kembali tidak boleh lebih awal dari waktu keluar.')}}});
$('#nisInput').addEventListener('change',()=>lookupStudent($('#nisInput').value));$('#nisInput').addEventListener('blur',()=>lookupStudent($('#nisInput').value));
$('#scanSearch').onclick=()=>openQr('search');$('#scanForm').onclick=()=>openQr('form');$('#closeQr').onclick=()=>closeQr();$('#qrModal').addEventListener('click',e=>{if(e.target===$('#qrModal'))closeQr()});
$('#showIzin').onclick=()=>{$('#formIzin').classList.remove('hidden');applyJenisIzin();$('#formIzin').scrollIntoView({behavior:'smooth',block:'start'})};$('#cancelIzin').onclick=()=>{$('#formIzin').classList.add('hidden');$('#formIzin').reset()};$('#search').oninput=renderIzin;$('#filterJenis').onchange=renderIzin;$('#filterStatus').onchange=renderIzin;$('#refreshIzin').onclick=loadIzin;
$('#rows').addEventListener('click',async e=>{const returnBtn=e.target.closest('.return-now');if(returnBtn){if(!confirm('Konfirmasi santri ini sudah kembali ke pesantren?'))return;if(!adminKey){adminKey=await requestAdminKey('Konfirmasi kepulangan santri');if(!adminKey)return;adminKey=adminKey.trim();if(!adminKey)return;sessionStorage.setItem('ppfha_admin_key',adminKey)}returnBtn.disabled=true;returnBtn.textContent='Menyimpan…';try{const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify((()=>{const row=data.izin.find(x=>String(x.id)===String(returnBtn.dataset.id));const now=new Date();const deadline=row&&row.rencanaKembali?new Date(row.rencanaKembali):null;const late=deadline&&!isNaN(deadline.getTime())&&now.getTime()>deadline.getTime();const minutes=late?Math.ceil((now.getTime()-deadline.getTime())/60000):0;const note=late?((row.catatan&&row.catatan!=='—'?row.catatan+' | ':'')+'TERLAMBAT KEMBALI '+minutes+' menit (batas '+deadline.toLocaleString('id-ID')+')'):(row&&row.catatan?row.catatan:'');return {action:'updateStatus',apiKey:adminKey,id:returnBtn.dataset.id,status:'Sudah kembali',kembaliAt:now.toISOString(),catatan:note}})())});const j=await r.json();if(!j.ok)throw new Error(j.error||'Gagal mencatat kepulangan');await loadIzin();toast('Santri ditandai sudah kembali ke pesantren.')}catch(err){toast('Belum berhasil: '+err.message)}finally{returnBtn.disabled=false;returnBtn.textContent='✓ Sudah kembali'}return}const btn=e.target.closest('.edit-status');if(!btn)return;const statuses=['Diizinkan','Menunggu persetujuan','Ditolak','Sudah keluar','Sudah kembali'];const current=btn.dataset.status;const next=await chooseStatus(current);if(next===null)return;if(next===current){toast('Status tidak berubah.');return}if(!adminKey){adminKey=await requestAdminKey('Ubah status izin santri');if(!adminKey)return;adminKey=adminKey.trim();if(!adminKey)return;sessionStorage.setItem('ppfha_admin_key',adminKey)}btn.disabled=true;btn.textContent='Menyimpan…';try{const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'updateStatus',apiKey:adminKey,id:btn.dataset.id,status:next,kembaliAt:next==='Sudah kembali'?new Date().toISOString():''})});const j=await r.json();if(!j.ok)throw new Error(j.error||'Gagal mengubah status');await loadIzin();toast('Status izin diperbarui menjadi '+next+'.')}catch(err){adminKey='';sessionStorage.removeItem('ppfha_admin_key');toast('Status belum berubah: '+err.message)}finally{btn.disabled=false;btn.textContent='Ubah Status'}});
$('#formIzin').onsubmit=async e=>{e.preventDefault();const form=e.target,d=Object.fromEntries(new FormData(form).entries());if(d.jenis==='Izin Keluar (berbatas waktu)'&&!d.rencanaKembali){toast('Izin keluar wajib memiliki batas waktu kembali.');return}if(new Date(d.rencanaKembali)<new Date(d.keluar)){toast('Batas kembali tidak boleh lebih awal dari waktu keluar.');return}if(!adminKey){adminKey=await requestAdminKey('Simpan izin santri');if(!adminKey){toast('Penyimpanan dibatalkan.');return}adminKey=adminKey.trim();if(!adminKey){adminKey='';toast('Kunci pengurus tidak boleh kosong.');return}sessionStorage.setItem('ppfha_admin_key',adminKey)}const btn=form.querySelector('button[type="submit"]'),old=btn.textContent;btn.disabled=true;btn.textContent='Menyimpan…';try{const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'izin',apiKey:adminKey,data:d})});const j=await r.json();if(!j.ok)throw new Error(j.error||'Data gagal disimpan');form.reset();form.classList.add('hidden');await loadIzin();toast('Izin berhasil disimpan ke database.')}catch(err){adminKey='';sessionStorage.removeItem('ppfha_admin_key');toast('Penyimpanan belum terkonfirmasi: '+err.message+'. Kunci sesi dihapus; coba lagi.')}finally{btn.disabled=false;btn.textContent=old}};
async function loadCollection(action,bodyId,kind){const body=$(bodyId);if(body)body.innerHTML='<tr><td colspan="7" class="empty">Memuat data…</td></tr>';try{const r=await fetch(API_URL+'?action='+action,{cache:'no-store'});const j=await r.json();if(!j.ok)throw new Error(j.error||'Gagal membaca data');data[kind]=Array.isArray(j.data)?j.data:[];renderCollections()}catch(err){if(body)body.innerHTML='<tr><td colspan="7" class="empty">Data gagal dimuat. Tekan Muat ulang.</td></tr>';toast('Gagal memuat '+action+': '+err.message)}}
function renderCollections(){const ps=(data.peng||[]).slice().reverse(),ks=(data.keg||[]).slice().reverse();$('#rowsPeng').innerHTML=ps.length?ps.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(x.tanggal||'—')+'</td><td><b>'+esc(x.judul||'—')+'</b></td><td>'+esc(x.kategori||'Umum')+'</td><td>'+esc(x.target||'Semua wali santri')+'</td><td>'+esc(x.isi||'—')+'</td><td>'+esc(x.status||'Terbit')+'</td></tr>').join(''):'<tr><td colspan="7" class="empty">Belum ada pengumuman.</td></tr>';$('#rowsKeg').innerHTML=ks.length?ks.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(x.tanggal||'—')+'</td><td><b>'+esc(x.judul||'—')+'</b></td><td>'+esc(x.lokasi||'—')+'</td><td>'+esc(x.waktu||'—')+'</td><td>'+esc(x.isi||'—')+'</td><td>'+esc(x.status||'Terbit')+'</td></tr>').join(''):'<tr><td colspan="7" class="empty">Belum ada kegiatan.</td></tr>';$('#nPeng').textContent=data.peng.length;$('#nKeg').textContent=data.keg.length}
function setupSaveForm(formId,action,afterSave){$(formId).onsubmit=async e=>{e.preventDefault();const form=e.target,d=Object.fromEntries(new FormData(form).entries());if(!adminKey){adminKey=await requestAdminKey('Simpan '+(action==='pengumuman'?'pengumuman':'kegiatan'));if(!adminKey)return;adminKey=adminKey.trim();if(!adminKey)return;sessionStorage.setItem('ppfha_admin_key',adminKey)}const btn=form.querySelector('button[type="submit"]'),old=btn.textContent;btn.disabled=true;btn.textContent='Menyimpan…';try{const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,apiKey:adminKey,data:d})});const j=await r.json();if(!j.ok)throw new Error(j.error||'Data gagal disimpan');form.reset();form.classList.add('hidden');await afterSave();toast((action==='pengumuman'?'Pengumuman':'Kegiatan')+' berhasil disimpan.')}catch(err){adminKey='';sessionStorage.removeItem('ppfha_admin_key');toast('Belum berhasil menyimpan: '+err.message)}finally{btn.disabled=false;btn.textContent=old}}}
$('#showPeng').onclick=()=>$('#formPeng').classList.remove('hidden');$('#cancelPeng').onclick=()=>{$('#formPeng').reset();$('#formPeng').classList.add('hidden')};$('#refreshPeng').onclick=()=>loadCollection('pengumuman','#rowsPeng','peng');$('#showKeg').onclick=()=>$('#formKeg').classList.remove('hidden');$('#cancelKeg').onclick=()=>{$('#formKeg').reset();$('#formKeg').classList.add('hidden')};$('#refreshKeg').onclick=()=>loadCollection('kegiatan','#rowsKeg','keg');setupSaveForm('#formPeng','pengumuman',()=>loadCollection('pengumuman','#rowsPeng','peng'));setupSaveForm('#formKeg','kegiatan',()=>loadCollection('kegiatan','#rowsKeg','keg'));$('#backDashboard').onclick=()=>go('dashboard');
render();loadIzin();loadCollection('pengumuman','#rowsPeng','peng');loadCollection('kegiatan','#rowsKeg','keg');
/* ATTENDANCE MODULE — uses the same KTS QR/NIS */
const ATTENDANCE_ACTIVITIES={jamaah:'Sholat Berjamaah','kitab-pagi':'Ngaji Kitab Pagi',albab:'Ngaji Kitab Metode Albab',alquran:"Ngaji Al-Qur'an",madrasiyah:'Madrasiyah'};
let currentAttendanceActivity='',attendanceScanBusy=false,attendanceConfig={};
function todayLocal(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
// HTML input[type=time] requires zero-padded HH:mm; Sheets may return H:mm.
function normalizeTimeInput(value){const m=String(value||'').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);return m?String(m[1]).padStart(2,'0')+':'+m[2]:''}
async function attendancePayload(action,extra={}){const send=key=>fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,apiKey:key,...extra})}).then(r=>r.json());let result=await send(adminKey);if(!result.ok&&/kunci pengurus tidak valid|akses ditolak/i.test(String(result.error||''))){adminKey='';sessionStorage.removeItem('ppfha_admin_key');const renewed=await requestAdminKey('Kunci pengurus tidak cocok. Masukkan kembali kunci yang tersimpan di Apps Script.');if(!renewed)return {ok:false,error:'Permintaan dibatalkan. Kunci pengurus belum dimasukkan.'};adminKey=String(renewed).trim();if(!adminKey)return {ok:false,error:'Kunci pengurus tidak boleh kosong.'};sessionStorage.setItem('ppfha_admin_key',adminKey);result=await send(adminKey);if(!result.ok&&/kunci pengurus tidak valid|akses ditolak/i.test(String(result.error||''))){adminKey='';sessionStorage.removeItem('ppfha_admin_key');}}return result}
function jakartaClock(){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const v={};p.forEach(x=>v[x.type]=x.value);return {day:({Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6})[v.weekday],time:v.hour+':'+v.minute};}
function findActiveAttendanceSchedule(){const now=jakartaClock(),all=[];Object.keys(attendanceConfig).forEach(activity=>{const cfg=attendanceConfig[activity]||{};if(activity==='jamaah'){Object.keys(cfg).forEach(session=>{const s=cfg[session];if(s&&s.startTime&&s.endTime)all.push({activity,session,...s})})}else if(cfg.startTime&&cfg.endTime)all.push({activity,session:'Utama',...cfg})});const valid=all.filter(s=>(s.days||[]).map(Number).includes(now.day)&&now.time>=s.startTime&&now.time<=s.endTime);valid.sort((a,b)=>a.endTime.localeCompare(b.endTime));if(valid.length)return valid[0];const next=all.filter(s=>(s.days||[]).map(Number).includes(now.day)&&s.startTime>now.time).sort((a,b)=>a.startTime.localeCompare(b.startTime));return next[0]||null;}
function findActiveAttendanceScheduleForActivity(activity){const now=jakartaClock(),cfg=attendanceConfig[activity]||{},all=[];if(activity==='jamaah'){Object.keys(cfg).forEach(session=>{const s=cfg[session];if(s&&s.startTime&&s.endTime)all.push({activity,session,...s})})}else if(cfg.startTime&&cfg.endTime)all.push({activity,session:'Utama',...cfg});const valid=all.filter(s=>(s.days||[]).map(Number).includes(now.day)&&now.time>=s.startTime&&now.time<=s.endTime).sort((a,b)=>a.endTime.localeCompare(b.endTime));if(valid.length)return valid[0];const next=all.filter(s=>(s.days||[]).map(Number).includes(now.day)&&s.startTime>now.time).sort((a,b)=>a.startTime.localeCompare(b.startTime));return next[0]||null;}
function findJamaahSessionForCurrentTime(){const now=jakartaClock(),cfg=attendanceConfig.jamaah||{},all=Object.keys(cfg).map(session=>({activity:'jamaah',session,...cfg[session]})).filter(s=>s.startTime&&s.endTime&&(s.days||[]).map(Number).includes(now.day));const active=all.filter(s=>now.time>=s.startTime&&now.time<=s.endTime).sort((a,b)=>a.endTime.localeCompare(b.endTime));if(active.length)return active[0];const upcoming=all.filter(s=>s.startTime>now.time).sort((a,b)=>a.startTime.localeCompare(b.startTime));return upcoming[0]||null;}
function getActiveScheduleForActivity(activity){const now=jakartaClock(),list=[];const cfg=attendanceConfig[activity]||{};if(activity==='jamaah'){Object.keys(cfg).forEach(session=>{const s=cfg[session];if(s&&s.startTime&&s.endTime)list.push({activity,session,...s})})}else if(cfg.startTime&&cfg.endTime)list.push({activity,session:'Utama',...cfg});return list.find(s=>(s.days||[]).map(Number).includes(now.day)&&now.time>=s.startTime&&now.time<=s.endTime)||null;}
function updateAttendancePortalSession(){if(!currentAttendanceActivity)return;const jamaah=currentAttendanceActivity==='jamaah',session=jamaah?$('#scheduleSession').value:'';const label=session?(session==='Jumat'?'Sholat Jumat':session):'Jadwal belum tersedia';$('#attendanceScannerTitle').textContent='Portal '+ATTENDANCE_ACTIVITIES[currentAttendanceActivity]+(jamaah?' · '+label:'');$('#attendanceScannerHint').textContent=jamaah?(session?'Sesi yang dicatat: '+label+'. Sesi dipilih otomatis berdasarkan jadwal WIB.':'Jadwal sholat belum tersedia untuk hari ini. Scan belum dapat dilakukan.'):'Scan QR KTS santri untuk '+ATTENDANCE_ACTIVITIES[currentAttendanceActivity]+'.';const msg=$('#attendanceSessionMessage');if(msg)msg.textContent='Data absensi '+todayLocal()+' · '+ATTENDANCE_ACTIVITIES[currentAttendanceActivity]+(jamaah?' · '+label:'')}
function refreshAttendanceScanGate(){const btn=$('#startAttendanceScan');if(!btn)return;const testMode=currentAttendanceActivity==='madrasiyah',now=jakartaClock();let active=null,next=null,latest=null;if(currentAttendanceActivity==='jamaah'){const list=Object.keys(attendanceConfig.jamaah||{}).map(session=>({activity:'jamaah',session,...attendanceConfig.jamaah[session]})).filter(s=>(s.days||[]).map(Number).includes(now.day)&&s.startTime&&s.endTime).sort((a,b)=>a.startTime.localeCompare(b.startTime));active=list.find(s=>now.time>=s.startTime&&now.time<=s.endTime)||null;next=list.find(s=>s.startTime>now.time)||null;latest=list.filter(s=>s.endTime<now.time).sort((a,b)=>b.endTime.localeCompare(a.endTime))[0]||null;if(active)$('#scheduleSession').value=active.session;else if(next)$('#scheduleSession').value=next.session;else if(latest)$('#scheduleSession').value=latest.session; if(active||next||latest)loadScheduleForm()}else{const cfg=attendanceConfig[currentAttendanceActivity]||{};if(cfg.startTime&&cfg.endTime&&(cfg.days||[]).map(Number).includes(now.day)){active=now.time>=cfg.startTime&&now.time<=cfg.endTime?{...cfg}:null;next=cfg.startTime>now.time?{...cfg}:null;latest=cfg.endTime<now.time?{...cfg}:null}}const inWindow=!!active,blocked=!testMode&&!inWindow;btn.disabled=blocked;btn.textContent=testMode?'Buka Kamera & Scan (Mode Uji Coba)':inWindow?'Buka Kamera & Scan':next?'Belum Waktunya Scan':'Jadwal Selesai Hari Ini';const hint=$('#attendanceScannerHint');if(hint&&currentAttendanceActivity){if(testMode)hint.textContent='Mode uji coba aktif. '+ATTENDANCE_ACTIVITIES[currentAttendanceActivity]+' dapat diuji scan QR KTS dan akan dicatat Hadir.';else if(inWindow)hint.textContent='Jadwal '+(active.session==='Jumat'?'Sholat Jumat':active.session||'kegiatan')+' sedang berlangsung ('+active.startTime+'–'+active.endTime+' WIB). Scan akan ditutup otomatis setelah batas akhir.';else if(next)hint.textContent='Jadwal '+(next.session==='Jumat'?'Sholat Jumat':next.session||'kegiatan')+' dimulai pukul '+next.startTime+' WIB. Tombol scan akan aktif otomatis saat waktunya tiba.';else hint.textContent='Jadwal '+ATTENDANCE_ACTIVITIES[currentAttendanceActivity]+' hari ini sudah selesai. Scan ditutup otomatis agar tidak salah mencatat kehadiran.';}}
function applyAutomaticAttendanceSelection(){const s=findActiveAttendanceSchedule();if(!s)return false;const activity=$('#scheduleActivity'),session=$('#scheduleSession');if(activity.value!==s.activity)activity.value=s.activity;if(session.value!==s.session)session.value=s.session;$('#scheduleStart').value=normalizeTimeInput(s.startTime);$('#scheduleOnTime').value=normalizeTimeInput(s.onTimeUntil);$('#scheduleEnd').value=normalizeTimeInput(s.endTime);const note=$('.calendar-auto-note');if(note){const now=jakartaClock();note.textContent='Otomatis WIB · '+(s.startTime<=now.time&&now.time<=s.endTime?'Sedang berlangsung: ':'Jadwal berikutnya: ')+ATTENDANCE_ACTIVITIES[s.activity]+' – '+(s.session==='Utama'?'Kegiatan utama':s.session)+' ('+s.startTime+'–'+s.endTime+').'}return true;}
async function loadAttendanceConfig(){
  const date=$('#attendanceDate');
  if(date&&!date.value)date.value=todayLocal();
  try{
    const sessions=['Subuh','Dzuhur','Ashar','Maghrib','Isya','Jumat'];
    const responses=await Promise.all(sessions.map(async session=>{
      const r=await fetch(API_URL+'?action=attendanceConfig&session='+encodeURIComponent(session),{cache:'no-store'});
      return r.json();
    }));
    const bad=responses.find(x=>!x||!x.ok);
    if(bad)throw new Error(bad.error||'Backend jadwal sholat belum tersedia');
    const jamaah={};
    let other={};
    responses.forEach(j=>{
      const d=j.data||{};
      if(d.jamaah&&d.jamaah.startTime)jamaah[d.jamaah.session||'Subuh']=d.jamaah;
      Object.keys(d).forEach(k=>{if(k!=='jamaah'&&d[k]&&d[k].startTime)other[k]=d[k]});
    });
    attendanceConfig={...other,jamaah};
    Object.keys(ATTENDANCE_ACTIVITIES).forEach(k=>{
      const el=$('#status-'+k);
      const list=k==='jamaah'?Object.values(jamaah):[attendanceConfig[k]||{}];
      if(el)el.textContent=list.some(x=>x.startTime)?'Jadwal '+list.filter(x=>x.startTime).map(x=>(x.session&&x.session!=='Utama'?x.session+': ':'')+x.startTime+'–'+x.endTime).join(' · '):'Jadwal belum diatur';
    });
    if(currentAttendanceActivity==='jamaah'){
      const now=jakartaClock();
      const all=Object.keys(jamaah).map(session=>({session,...jamaah[session]}))
        .filter(x=>x.startTime&&x.endTime&&(x.days||[]).map(Number).includes(now.day))
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
function loadScheduleForm(){const a=$('#scheduleActivity').value,session=$('#scheduleSession').value,cfg=attendanceConfig[a]||{},s=a==='jamaah'?(cfg[session]||{}):cfg;$('#scheduleStart').value=normalizeTimeInput(s.startTime);$('#scheduleOnTime').value=normalizeTimeInput(s.onTimeUntil);$('#scheduleEnd').value=normalizeTimeInput(s.endTime);['scheduleStart','scheduleOnTime','scheduleEnd'].forEach(id=>{$('#'+id).readOnly=true;$('#'+id).disabled=true;$('#'+id).setAttribute('aria-readonly','true')});$('#scheduleActivity').disabled=true;$('#scheduleSession').disabled=true;if(s.session&&a==='jamaah')$('#scheduleSession').value=s.session;else if(a!=='jamaah')$('#scheduleSession').value='Utama';const dayNames=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];const dayText=(s.days||[]).length===7?'Setiap hari':(s.days||[]).map(x=>dayNames[Number(x)]).join(', ');const note=$('.calendar-auto-note');const hasSchedule=!!(s.startTime&&s.onTimeUntil&&s.endTime);if(note)note.textContent=hasSchedule?'Jadwal otomatis WIB: '+(dayText||'belum ada hari aktif')+'. Jam dan batas status dikunci mengikuti jadwal yang tersimpan.':'Jadwal kegiatan ini belum tersimpan di database JadwalAbsensi. Jam akan tampil otomatis setelah jadwal resmi disimpan oleh pengurus.';const holidayBtn=$('#toggleAttendanceHoliday');if(holidayBtn){holidayBtn.disabled=!hasSchedule;holidayBtn.textContent=s.holidayToday?'Batalkan Libur Hari Ini':'Liburkan Kegiatan Hari Ini';holidayBtn.title=hasSchedule?'Berlaku hanya untuk tanggal hari ini':'Jadwal belum tersedia';}updateAttendancePortalSession()}
$('#scheduleActivity').addEventListener('change',()=>{$('#scheduleSession').value=$('#scheduleActivity').value==='jamaah'?'Subuh':'Utama';loadAttendanceConfig()});$('#scheduleSession').addEventListener('change',()=>{if($('#scheduleActivity').value==='jamaah'){loadScheduleForm();updateAttendancePortalSession()}});
$('#loadSchedule').onclick=loadAttendanceConfig;
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
async function recordAttendanceScan(nis){if(attendanceScanBusy)return;if(!currentAttendanceActivity){toast('Portal scan otomatis belum dibuka.');return}attendanceScanBusy=true;try{const j=await attendancePayload('attendanceScan',{data:{nis,activity:currentAttendanceActivity,testMode:isAttendanceTestMode(),scannedAt:new Date().toISOString()}});if(!j.ok)throw new Error(j.error||'Scan belum tercatat');const d=j.data||{};const activity=ATTENDANCE_ACTIVITIES[d.activity]||'Kegiatan';const session=d.session?(d.session==='Jumat'?'Sholat Jumat':d.session):'';const duplicate=!!j.duplicate;const title=duplicate?'Sudah tercatat sebelumnya':'Berhasil dicatat';const color=duplicate?'#a16207':'#176b50';$('#attendanceLastScan').innerHTML='<div class="last-scan-success"><b style="font-size:16px;color:'+color+'">'+title+'</b><br><b style="font-size:20px;color:#176b50">'+esc(d.nama||'Nama santri tidak terbaca')+'</b><br><span>NIS '+esc(d.nis||nis)+'</span><br><span>'+esc(activity)+(session?' · '+esc(session):'')+'</span><br><span>Waktu '+(duplicate?'tercatat':'scan')+': '+esc(d.time||new Date().toLocaleTimeString('id-ID'))+'</span><br><span class="status-pill '+(d.status==='Terlambat'?'status-pending':d.status==='Tidak Hadir'?'status-rejected':'status-done')+'">'+esc(d.status||'Hadir')+'</span></div>';const label=session?' · '+session:'';$('#attendanceScannerTitle').textContent='Portal '+activity+label;$('#attendanceSessionMessage').textContent='Data absensi '+todayLocal()+' · '+activity+label;toast(duplicate?(d.nama||'Santri')+' sudah tercatat pada sesi '+(session||'ini')+'.':(d.nama||'Santri')+' berhasil tercatat '+(d.status||'Hadir')+'.');const countId=d.status==='Terlambat'?'countTerlambat':d.status==='Tidak Hadir'?'countTidakHadir':'countHadir';const countEl=$('#'+countId);if(countEl&&!duplicate)countEl.textContent=String((Number(countEl.textContent)||0)+1);if(adminKey)loadAttendanceRecords()}catch(e){$('#attendanceLastScan').innerHTML='<div class="last-scan-error"><b style="color:#b45309">Scan belum tercatat</b><br>'+esc(e.message||'Periksa QR dan koneksi database.')+'</div>';toast('Absensi belum tersimpan: '+e.message)}finally{attendanceScanBusy=false}}
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
$('#raportNis').addEventListener('blur',lookupRaportStudent);
$('#refreshRaport').onclick=()=>{const n=$('#raportNis').value.trim();if(n)loadRaportHistory(n);else toast('Masukkan NIS santri terlebih dahulu.')};
$('#formRaport').addEventListener('reset',()=>setTimeout(()=>{ $('#raportNama').value='';$('#raportKelas').value='';updateRaportTotals();},0));
$('#formRaport').addEventListener('submit',async e=>{
 e.preventDefault();
 const form=e.currentTarget,nis=$('#raportNis').value.trim(),nama=$('#raportNama').value.trim(),kelas=$('#raportKelas').value.trim();
 if(!nis||!nama){toast('Masukkan NIS santri yang valid terlebih dahulu.');return}
 const tahunAjaran=form.elements.tahunAjaran.value.trim(),ustaz=form.elements.ustaz.value.trim();
 const records=[];
 raportSubjects.forEach((s,i)=>{
  if(s[1]==='group')return;
  const name=s[1]==='custom'?($('#raportSubjects [data-custom-name]').value.trim()):s[0];
  if(!name)return;
  [1,2].forEach(semester=>{
   const p=$('.raport-score[data-subject="'+i+'"][data-sem="'+semester+'"][data-kind="prestasi"]');
   const a=$('.raport-score[data-subject="'+i+'"][data-sem="'+semester+'"][data-kind="rataRataKelas"]');
   if((p&&p.value!=='')||(a&&a.value!==''))records.push({nis,nama,kelas,tahunAjaran,mataPelajaran:name,kelompok:s[1]==='lokal'?'Muatan Lokal':'Mata Pelajaran',semester,prestasi:p?p.value:'',rataRataKelas:a?a.value:'',ustaz});
  });
 });
 if(!records.length){toast('Isi minimal satu nilai sebelum menyimpan.');return}
 if(!adminKey){adminKey=await requestAdminKey('Simpan nilai raport madrasah');if(!adminKey)return;sessionStorage.setItem('ppfha_admin_key',adminKey)}
 const btn=form.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent='Menyimpan…';
 try{
  const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'saveeducationraport',apiKey:adminKey,records})});const j=await r.json();if(!j.ok)throw new Error(j.error||'Nilai gagal disimpan');
  toast('Nilai raport berhasil disimpan ('+j.saved+' entri).');await loadRaportHistory(nis);
 }catch(err){toast('Gagal menyimpan nilai raport: '+err.message)}
 finally{btn.disabled=false;btn.textContent='➤ Simpan Nilai Raport'}
});
renderRaportInputs();

/* UJIAN KITAB METODE ALBAB */
async function lookupAlbabStudent(){
 const nis=$('#albabNis').value.trim().replace(/\D/g,'');if(!nis)return;
 try{const r=await fetch(API_URL+'?action=student&nis='+encodeURIComponent(nis),{cache:'no-store'});const j=await r.json();if(!j.ok)throw new Error(j.error||'Santri tidak ditemukan');$('#albabNis').value=j.data.nis;$('#albabNama').value=j.data.nama;$('#albabKelas').value=j.data.kelas||'';await loadAlbabHistory(nis)}
 catch(err){$('#albabNama').value='';$('#albabKelas').value='';toast('Data santri: '+err.message)}
}
async function loadAlbabHistory(nis){
 const body=$('#albabHistory');if(!body)return;
 if(!adminKey){adminKey=await requestAdminKey('Lihat riwayat ujian Albab');if(!adminKey){body.innerHTML='<tr><td colspan="6" class="empty">Masukkan kunci pengurus untuk melihat riwayat.</td></tr>';return}adminKey=String(adminKey).trim();sessionStorage.setItem('ppfha_admin_key',adminKey)}
 body.innerHTML='<tr><td colspan="6" class="empty">Memuat riwayat ujian…</td></tr>';
 try{const r=await fetch(API_URL+'?action=educationrecords&type=albab&nis='+encodeURIComponent(nis)+'&key='+encodeURIComponent(adminKey),{cache:'no-store'});const j=await r.json();if(!j.ok)throw new Error(j.error||'Gagal membaca riwayat');
 const rows=j.data||[];body.innerHTML=rows.length?rows.map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(x.periodeUjian||'—')+'</td><td>'+esc(x.nilaiTulis||'—')+'</td><td>'+esc(x.nilaiBaca||'—')+'</td><td>'+esc(x.nilaiAkhir||'—')+'</td><td>'+esc(x.ustaz||'—')+'</td></tr>').join(''):'<tr><td colspan="6" class="empty">Belum ada nilai ujian Albab untuk NIS ini.</td></tr>';
 }catch(err){body.innerHTML='<tr><td colspan="6" class="empty">'+esc(err.message)+'</td></tr>'}
}
function updateAlbabFinal(){const t=$('#nilaiTulis').value,b=$('#nilaiBaca').value;$('#nilaiAkhir').value=t!==''&&b!==''?((Number(t)+Number(b))/2).toLocaleString('id-ID',{maximumFractionDigits:2}):'0'}
$('#scanAlbab').addEventListener('click',()=>openQr('albab'));
$('#findAlbab').addEventListener('click',lookupAlbabStudent);
$('#albabNis').addEventListener('change',lookupAlbabStudent);
$('#albabNis').addEventListener('blur',lookupAlbabStudent);
$('#nilaiTulis').addEventListener('input',updateAlbabFinal);
$('#nilaiBaca').addEventListener('input',updateAlbabFinal);
$('#formAlbab').addEventListener('reset',()=>setTimeout(()=>{$('#albabNama').value='';$('#albabKelas').value='';updateAlbabFinal()},0));
$('#formAlbab').addEventListener('submit',async e=>{
 e.preventDefault();const form=e.currentTarget,nis=$('#albabNis').value.trim(),nama=$('#albabNama').value.trim(),kelas=$('#albabKelas').value.trim();
 if(!nis||!nama){toast('Masukkan NIS santri yang valid terlebih dahulu.');return}
 const nilaiTulis=Number(form.elements.nilaiTulis.value),nilaiBaca=Number(form.elements.nilaiBaca.value);
 if(!Number.isFinite(nilaiTulis)||!Number.isFinite(nilaiBaca)||nilaiTulis<0||nilaiTulis>100||nilaiBaca<0||nilaiBaca>100){toast('Nilai ujian harus 0 sampai 100.');return}
 if(!adminKey){adminKey=await requestAdminKey('Simpan nilai ujian Albab');if(!adminKey)return;sessionStorage.setItem('ppfha_admin_key',adminKey)}
 const btn=form.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent='Menyimpan…';
 try{const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'saveeducationalbab',apiKey:adminKey,data:{nis,nama,kelas,periodeUjian:form.elements.periodeUjian.value.trim(),nilaiTulis,nilaiBaca,nilaiAkhir:(nilaiTulis+nilaiBaca)/2,catatan:form.elements.catatan.value.trim(),ustaz:form.elements.ustaz.value.trim()}})});const j=await r.json();if(!j.ok)throw new Error(j.error||'Nilai gagal disimpan');toast('Nilai ujian Albab berhasil disimpan.');await loadAlbabHistory(nis)}
 catch(err){toast('Gagal menyimpan nilai ujian Albab: '+err.message)}
 finally{btn.disabled=false;btn.textContent='➤ Simpan Nilai Ujian Albab'}
});


