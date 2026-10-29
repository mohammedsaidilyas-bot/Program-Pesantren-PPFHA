const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const API_URL='https://script.google.com/macros/s/AKfycbwgGOvBV8fKNBamDVYNBAgMeFS6-ld0nfjU2OCkbKFxTCEMSRZAf7nSW7Odj5OYxEWQ/exec';
const data={izin:[],peng:[],keg:[]};const names={dashboard:'Dashboard',izin:'Izin Santri',pengumuman:'Pengumuman',kegiatan:'Kegiatan & Jadwal'};let adminKey='';
function go(p){$$('.page').forEach(x=>x.classList.toggle('active',x.id===p));$$('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===p));$('#title').textContent=names[p]||'Dashboard';window.scrollTo(0,0);if(p==='izin')loadIzin()}
$$('.nav').forEach(x=>x.onclick=()=>go(x.dataset.page));$$('[data-go]').forEach(x=>x.onclick=()=>go(x.dataset.go));
let toastTimer;function toast(s){$('#toast').textContent=s;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',4000)}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function dateOnly(s){if(!s)return'—';const d=new Date(s);return isNaN(d)?String(s):d.toLocaleDateString('id-ID')}
function dateTime(s){if(!s)return'—';const d=new Date(s);return isNaN(d)?String(s):d.toLocaleDateString('id-ID')+'<br><small>'+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+'</small>'}
let lastStudentLookup='';
async function lookupStudent(nis){nis=String(nis||'').trim().replace(/\D/g,'');if(!nis)return;const nameInput=$('#formIzin [name="nama"]');if(!nameInput)return;lastStudentLookup=nis;nameInput.value='';nameInput.placeholder='Mencari biodata santri…';try{const r=await fetch(API_URL+'?action=student&nis='+encodeURIComponent(nis),{cache:'no-store'});const j=await r.json();if(lastStudentLookup!==nis)return;if(!j.ok||!j.data)throw new Error(j.error||'Biodata tidak ditemukan');nameInput.value=j.data.nama||'';nameInput.placeholder='Nama lengkap santri';const old=$('#studentLookupInfo');if(old)old.remove();const info=document.createElement('small');info.id='studentLookupInfo';info.style.cssText='display:block;color:#18734f;margin-top:5px';info.textContent='✓ '+(j.data.nama||'Santri')+(j.data.kelas?' · '+j.data.kelas:'')+(j.data.asrama?' · '+j.data.asrama:'');nameInput.insertAdjacentElement('afterend',info);const wali=$('#formIzin [name="wali"]');if(wali&&!wali.value&&j.data.wali)wali.value=j.data.wali;toast('Biodata santri ditemukan.')}catch(err){nameInput.placeholder='Nama lengkap santri';toast(err.message||'Biodata santri belum dapat dibaca.')}}
function statusClass(s){s=String(s||'').toLowerCase();if(s.includes('kembali')||s.includes('selesai'))return'status-done';if(s.includes('tolak'))return'status-rejected';if(s.includes('tunggu'))return'status-pending';return'status-active'}
function renderIzin(){const q=($('#search').value||'').toLowerCase(),jenis=$('#filterJenis').value,status=$('#filterStatus').value;const a=data.izin.filter(x=>{const hay=[x.nama,x.nis,x.catatan,x.wali].join(' ').toLowerCase();return hay.includes(q)&&(!jenis||x.jenis===jenis)&&(!status||x.status===status)});$('#nIzin').textContent=data.izin.length;$('#rows').innerHTML=a.length?a.slice().reverse().map((x,i)=>'<tr><td>'+(i+1)+'</td><td>'+dateTime(x.keluar)+'</td><td><b>'+esc(x.nama)+'</b><br><small>NIS '+esc(x.nis)+'</small></td><td>'+esc(x.jenis)+'</td><td>'+dateOnly(x.keluar)+'<br><small>s/d '+dateOnly(x.rencanaKembali)+'</small></td><td>'+esc(x.wali||'—')+'</td><td>'+esc(x.catatan||'—')+'</td><td><span class="status-pill '+statusClass(x.status)+'">'+esc(x.status||'Menunggu persetujuan')+'</span></td></tr>').join(''):'<tr><td colspan="8" class="empty">Tidak ada data izin yang cocok.</td></tr>'}
function render(){renderIzin();$('#nPeng').textContent=data.peng.length;$('#nKeg').textContent=data.keg.length}
async function loadIzin(){const body=$('#rows');if(body)body.innerHTML='<tr><td colspan="8" class="empty">Memuat data izin dari database…</td></tr>';try{const r=await fetch(API_URL+'?action=izin',{cache:'no-store'});const j=await r.json();if(!j.ok)throw new Error(j.error||'Gagal membaca database');data.izin=Array.isArray(j.data)?j.data:[];render()}catch(err){if(body)body.innerHTML='<tr><td colspan="8" class="empty">Data belum berhasil dimuat. Periksa koneksi lalu tekan Muat ulang.</td></tr>';toast('Koneksi data izin gagal: '+err.message)}}
let qrScanner=null,qrTarget=null,qrStarting=false;
async function closeQr(){const scanner=qrScanner;qrScanner=null;$('#qrModal').classList.add('hidden');if(scanner){try{if(scanner.isScanning)await scanner.stop()}catch(e){}try{await scanner.clear()}catch(e){}}}
async function openQr(target){
 if(qrStarting)return;
 if(typeof Html5Qrcode==='undefined'){toast('Pemindai QR belum termuat. Muat ulang halaman dan pastikan internet aktif.');return}
 qrTarget=target;$('#qrMessage').textContent='Meminta akses kamera…';$('#qrModal').classList.remove('hidden');
 try{if(qrScanner){await closeQr();$('#qrModal').classList.remove('hidden')}qrStarting=true;qrScanner=new Html5Qrcode('qrReader');
 await qrScanner.start({facingMode:'environment'},{fps:10,qrbox:{width:230,height:230}},async decoded=>{
  const raw=String(decoded||'').trim();let nis=raw;try{const obj=JSON.parse(raw);nis=obj.nis||obj.NIS||obj.id||obj.value||raw}catch(e){}
  nis=String(nis).trim().replace(/\D/g,'');if(!nis){$('#qrMessage').textContent='QR tidak berisi NIS yang bisa dibaca.';return}
  $('#nisInput').value=nis;$('#formIzin').classList.remove('hidden');$('#formIzin').scrollIntoView({behavior:'smooth',block:'start'});await lookupStudent(nis);
  if(qrTarget==='search'){$('#search').value=nis;renderIzin()}
  $('#qrMessage').textContent='NIS '+nis+' terbaca. Form izin sudah dibuka.';await closeQr();
 },()=>{});$('#qrMessage').textContent='Kamera aktif. Arahkan QR kartu santri ke kotak pemindai.'
 }catch(err){$('#qrMessage').textContent='Kamera gagal dibuka. Izinkan akses kamera pada browser. '+String(err.message||err).slice(0,100);toast('Tidak bisa membuka kamera QR.')}
 finally{qrStarting=false}
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
 if(!freshKembali.value){const later=new Date(now);later.setHours(later.getHours()+(isKeluar?2:24));freshKembali.value=later.toISOString().slice(0,16);}
}
jenisSelect.addEventListener('change',applyJenisIzin);
$('#nisInput').addEventListener('change',()=>lookupStudent($('#nisInput').value));$('#nisInput').addEventListener('blur',()=>lookupStudent($('#nisInput').value));
$('#scanSearch').onclick=()=>openQr('search');$('#scanForm').onclick=()=>openQr('form');$('#closeQr').onclick=()=>closeQr();$('#qrModal').addEventListener('click',e=>{if(e.target===$('#qrModal'))closeQr()});
$('#showIzin').onclick=()=>{$('#formIzin').classList.remove('hidden');applyJenisIzin();$('#formIzin').scrollIntoView({behavior:'smooth',block:'start'})};$('#cancelIzin').onclick=()=>{$('#formIzin').classList.add('hidden');$('#formIzin').reset()};$('#search').oninput=renderIzin;$('#filterJenis').onchange=renderIzin;$('#filterStatus').onchange=renderIzin;$('#refreshIzin').onclick=loadIzin;
$('#formIzin').onsubmit=async e=>{e.preventDefault();const form=e.target,d=Object.fromEntries(new FormData(form).entries());if(d.jenis==='Izin Keluar (berbatas waktu)'&&!d.rencanaKembali){toast('Izin keluar wajib memiliki batas waktu kembali.');return}if(new Date(d.rencanaKembali)<new Date(d.keluar)){toast('Batas kembali tidak boleh lebih awal dari waktu keluar.');return}if(!adminKey){adminKey=prompt('Masukkan kunci API pengurus yang disetel di Script Properties (ADMIN_API_KEY). Jangan bagikan kunci ini kepada orang lain.');if(!adminKey){toast('Penyimpanan dibatalkan.');return}}const btn=form.querySelector('button[type="submit"]'),old=btn.textContent;btn.disabled=true;btn.textContent='Menyimpan…';try{const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'izin',apiKey:adminKey,data:d})});const j=await r.json();if(!j.ok)throw new Error(j.error||'Data gagal disimpan');form.reset();form.classList.add('hidden');await loadIzin();toast('Izin berhasil disimpan ke database.')}catch(err){adminKey='';toast('Penyimpanan belum terkonfirmasi: '+err.message+'. Pastikan ADMIN_API_KEY sudah disetel dan deployment terbaru aktif.')}finally{btn.disabled=false;btn.textContent=old}};
$('#formPeng').onsubmit=e=>{e.preventDefault();toast('Pengumuman akan disambungkan setelah menu perizinan selesai.')};$('#formKeg').onsubmit=e=>{e.preventDefault();toast('Kegiatan akan disambungkan setelah menu perizinan selesai.')};
render();loadIzin();