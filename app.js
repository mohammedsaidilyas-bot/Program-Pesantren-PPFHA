const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const API_URL='https://script.google.com/macros/s/AKfycbwgGOvBV8fKNBamDVYNBAgMeFS6-ld0nfjU2OCkbKFxTCEMSRZAf7nSW7Odj5OYxEWQ/exec';
const data={izin:[],peng:[],keg:[]};
const names={dashboard:'Dashboard',izin:'Izin Santri',pengumuman:'Pengumuman',kegiatan:'Kegiatan & Jadwal'};
let adminKey='';
function go(p){$$('.page').forEach(x=>x.classList.toggle('active',x.id===p));$$('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===p));$('#title').textContent=names[p]||'Dashboard';window.scrollTo(0,0);if(p==='izin')loadIzin()}
$$('.nav').forEach(x=>x.onclick=()=>go(x.dataset.page));$$('[data-go]').forEach(x=>x.onclick=()=>go(x.dataset.go));
let toastTimer;function toast(s){$('#toast').textContent=s;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',3500)}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmt(s){if(!s)return'—';const d=new Date(s);return isNaN(d)?String(s):d.toLocaleString('id-ID')}
function render(){
 $('#nIzin').textContent=data.izin.length;$('#nPeng').textContent=data.peng.length;$('#nKeg').textContent=data.keg.length;
 const q=($('#search').value||'').toLowerCase();
 const a=data.izin.filter(x=>(String(x.nama||'')+' '+String(x.nis||'')).toLowerCase().includes(q));
 $('#rows').innerHTML=a.length?a.slice().reverse().map(x=>'<tr><td><b>'+esc(x.nama)+'</b><br><small>NIS '+esc(x.nis)+'</small></td><td>'+esc(x.jenis)+'</td><td>'+esc(fmt(x.keluar))+'</td><td><span class="pill">'+esc(x.status||'Menunggu persetujuan')+'</span></td><td>'+esc(x.catatan||'—')+'</td></tr>').join(''):'<tr><td colspan="5" class="empty">Belum ada data izin.</td></tr>';
 $('#listPeng').innerHTML=data.peng.slice().reverse().map(x=>'<article class="item"><b>'+esc(x.judul)+'</b><p>'+esc(x.isi)+'</p><small>'+esc(x.kategori)+' · '+esc(x.tanggal)+' · '+esc(x.target)+'</small></article>').join('');
 $('#listKeg').innerHTML=data.keg.slice().reverse().map(x=>'<article class="item"><b>'+esc(x.judul)+'</b><p>'+esc(x.isi||'Belum ada keterangan')+'</p><small>'+esc(x.tanggal)+' '+esc(x.waktu)+' · '+esc(x.lokasi)+'</small></article>').join('');
}
async function loadIzin(){
 const body=$('#rows');if(body)body.innerHTML='<tr><td colspan="5" class="empty">Memuat data izin…</td></tr>';
 try{const r=await fetch(API_URL+'?action=izin',{cache:'no-store'});const j=await r.json();if(!j.ok)throw new Error(j.error||'Gagal membaca database');data.izin=Array.isArray(j.data)?j.data:[];render()}
 catch(err){if(body)body.innerHTML='<tr><td colspan="5" class="empty">Belum bisa mengambil data dari server. Periksa koneksi lalu muat ulang.</td></tr>';toast('Koneksi data izin gagal: '+err.message)}
}
$('#showIzin').onclick=()=>$('#formIzin').classList.remove('hidden');
$('#cancelIzin').onclick=()=>$('#formIzin').classList.add('hidden');
$('#search').oninput=render;
$('#formIzin').onsubmit=async e=>{
 e.preventDefault();const form=e.target;const d=Object.fromEntries(new FormData(form).entries());
 if(!adminKey){adminKey=prompt('Masukkan kunci API pengurus yang disimpan di Script Properties (ADMIN_API_KEY).');if(!adminKey){toast('Penyimpanan dibatalkan.');return}}
 const btn=form.querySelector('button.primary');const old=btn.textContent;btn.disabled=true;btn.textContent='Menyimpan…';
 try{
  const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'izin',apiKey:adminKey,data:d})});
  const j=await r.json();if(!j.ok)throw new Error(j.error||'Data gagal disimpan');
  form.reset();$('#formIzin').classList.add('hidden');await loadIzin();toast('Izin santri berhasil disimpan ke database.')
 }catch(err){toast('Belum dapat memastikan penyimpanan: '+err.message+'. Periksa akses server dan coba muat ulang data.');adminKey=''}
 finally{btn.disabled=false;btn.textContent=old}
};
$('#formPeng').onsubmit=e=>{e.preventDefault();toast('Bagian pengumuman akan dihubungkan setelah perizinan selesai.');};
$('#formKeg').onsubmit=e=>{e.preventDefault();toast('Bagian kegiatan akan dihubungkan setelah perizinan selesai.');};
render();loadIzin();
