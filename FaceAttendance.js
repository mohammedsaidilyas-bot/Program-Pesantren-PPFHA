/* FaceAttendance.js — direct central Google Sheets enrollment. */
(function(){
'use strict';
const API='/api/face';
const MODEL='https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/';
let stream=null,video=null,loopTimer=null,modal=null,busy=false,enrollPauseUntil=0,descriptors=[];
function close(){if(loopTimer)clearTimeout(loopTimer);loopTimer=null;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;if(modal)modal.remove();modal=null;video=null;busy=false}
function request(action,data,key){
 return fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,apiKey:key,data})})
 .then(async r=>{const j=await r.json().catch(()=>null);if(!r.ok)throw new Error((j&&j.error)||('HTTP '+r.status));return j;});
}
function open(){
 if(!window.currentAttendanceActivity){alert('Buka portal kegiatan absensi terlebih dahulu.');return}
 if(!window.faceapi){alert('Library pengenalan wajah belum berhasil dimuat. Periksa internet lalu coba kembali.');return}
 modal=document.createElement('div');modal.style.cssText='position:fixed;inset:0;z-index:100000;background:#0b1720eF;display:flex;align-items:center;justify-content:center;padding:14px;color:white';
 modal.innerHTML='<div style="background:#13232e;border:1px solid #36515f;border-radius:20px;padding:18px;width:min(100%,560px);max-height:95vh;overflow:auto"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">Absensi Wajah</h2><button id="faceClose" style="font-size:24px">×</button></div><p style="color:#c4d6df">Arahkan wajah ke kamera. Masukkan NIS untuk pendaftaran.</p><video id="faceVideo" autoplay muted playsinline style="width:100%;border-radius:14px;background:#000;margin-top:10px"></video><div style="display:flex;gap:8px;margin-top:12px"><input id="faceNis" inputmode="numeric" placeholder="NIS santri" style="min-width:0;flex:1;padding:12px;border-radius:10px"><button id="faceEnroll" style="padding:12px;border-radius:10px">Daftarkan wajah</button></div><label style="display:flex;gap:9px;align-items:flex-start;margin-top:12px;font-size:13px;color:#d4e3e8"><input id="faceConsent" type="checkbox" style="margin-top:3px">Saya menyatakan santri telah diberi penjelasan dan menyetujui pendaftaran biometrik secara sukarela. Absensi KTS tetap tersedia sebagai alternatif.</label><div id="faceMsg" style="padding:12px;color:#b9e3cf">Memuat kamera dan database wajah Google…</div><div style="font-size:12px;color:#a9bdc9">Pendaftaran wajah disimpan langsung ke Google Sheets database pusat. Absensi KTS tetap tersedia sebagai alternatif.</div></div>';
 document.body.appendChild(modal);video=modal.querySelector('#faceVideo');modal.querySelector('#faceClose').onclick=close;modal.querySelector('#faceEnroll').onclick=enroll;start();
}
async function start(){
 const msg=modal.querySelector('#faceMsg');
 try{
 await Promise.all([window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL),window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL),window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL)]);
 stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});video.srcObject=stream;await new Promise(resolve=>video.onloadedmetadata=resolve);await video.play();
 msg.textContent='Kamera aktif. Membaca database wajah Google…';
 // Kamera/model tidak bergantung pada isi database. Database kosong adalah kondisi normal.
 const key=prompt('Masukkan kunci pengurus untuk memuat data pendaftaran wajah (tidak disimpan):');
 if(!key){descriptors=[];msg.textContent='Kamera aktif. Database belum dimuat; pendaftaran baru tetap dapat dilakukan. Untuk pengenalan, muat daftar wajah dengan membuka ulang portal.';return}
 try {
   const res=await request('faceList',{},key);
   if(!res||res.ok!==true)throw new Error((res&&res.error)||'Server tidak mengonfirmasi daftar wajah.');
   descriptors=Array.isArray(res.data)?res.data:[];
   msg.textContent='Kamera aktif. '+descriptors.length+' wajah terdaftar. '+(descriptors.length===0?'Database kosong—silakan daftarkan santri pertama.':'Arahkan wajah dengan pencahayaan cukup.');
   recognitionLoop();
 } catch(listErr) {
   descriptors=[];
   msg.textContent='Kamera aktif, tetapi daftar wajah gagal dimuat ('+listErr.message+'). Pendaftaran baru tetap bisa dicoba; absensi pengenalan belum aktif.';
 }
 }catch(e){const detail=String(e&&e.message||e);msg.textContent='Gagal memuat model pengenalan wajah atau mengaktifkan kamera: '+detail+'. Kamera yang tampil berarti izin kamera sudah aktif; periksa koneksi model/API, bukan izin kamera.';}
}
async function detect(){return window.faceapi.detectSingleFace(video,new window.faceapi.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:.5})).withFaceLandmarks().withFaceDescriptor()}
async function enroll(){
 if(busy)return;busy=true;const msg=modal.querySelector('#faceMsg');
 try{
 const nis=modal.querySelector('#faceNis').value.trim().replace(/\D/g,'');if(!nis){msg.textContent='Masukkan NIS terlebih dahulu.';return}
 if(!modal.querySelector('#faceConsent').checked){msg.textContent='Centang persetujuan terlebih dahulu.';return}
 const result=await detect();if(!result){msg.textContent='Wajah belum terdeteksi. Posisikan wajah dengan pencahayaan baik.';return}
 const key=prompt('Masukkan kunci pengurus untuk menyimpan pendaftaran wajah:');if(!key){msg.textContent='Pendaftaran dibatalkan.';return}
 msg.textContent='Memverifikasi dan menyimpan descriptor…';
 const payload={nis,descriptor:Array.from(result.descriptor),consent:true,consentAt:new Date().toISOString()};
 const res=await request('faceEnroll',payload,key);
 if(!res||res.ok!==true)throw new Error((res&&res.error)||'Server tidak mengonfirmasi penyimpanan.');
 // Read back from central sheet before declaring success.
 const verify=await request('faceList',{},key);
 if(!verify||verify.ok!==true||!Array.isArray(verify.data)||!verify.data.some(x=>String(x.nis)===nis&&Array.isArray(x.descriptor)&&x.descriptor.length===128))
   throw new Error('Pendaftaran terkirim, tetapi verifikasi baca ulang dari Google Sheet gagal. Jangan daftar ulang; periksa server.');
 descriptors=verify.data;
 enrollPauseUntil=Date.now()+15000;
 msg.textContent='✓ TERKONFIRMASI: NIS '+nis+' tersimpan dan terbaca dari Google Sheet FaceDescriptors. Tunggu 15 detik sebelum pengenalan.';
 }catch(e){msg.textContent='Pendaftaran gagal: '+e.message}finally{busy=false}
}
async function recognitionLoop(){
 if(!modal||busy)return;if(Date.now()<enrollPauseUntil){loopTimer=setTimeout(recognitionLoop,900);return}
 try{const result=await detect();if(result&&descriptors.length){
 let best={nis:null,distance:1};descriptors.forEach(({nis,descriptor})=>{const distance=window.faceapi.euclideanDistance(result.descriptor,new Float32Array(descriptor));if(distance<best.distance)best={nis,distance}});
 if(best.distance<.42){busy=true;const nis=best.nis;const activity=window.currentAttendanceActivity;const msg=modal.querySelector('#faceMsg');msg.textContent='Wajah dikenali — mencatat NIS '+nis+'…';if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}video.srcObject=null;try{if(typeof window.recordAttendanceScan==='function'){await window.recordAttendanceScan(nis,activity,new Date().toISOString());msg.textContent='✓ ABSENSI TERCATAT — NIS '+nis+' / '+activity;}else{msg.textContent='Wajah cocok NIS '+nis+', tetapi fungsi absensi tidak tersedia.';}}catch(err){msg.textContent='Wajah cocok NIS '+nis+' — pencatatan gagal: '+String(err.message||err);}await new Promise(resolve=>setTimeout(resolve,1800));if(!modal){busy=false;return;}try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});video.srcObject=stream;await video.play();msg.textContent='Kamera aktif kembali. Silakan santri berikutnya.';}catch(err){msg.textContent='Kamera gagal aktif kembali: '+String(err.message||err);}busy=false;loopTimer=setTimeout(recognitionLoop,900);return}
 if(modal)modal.querySelector('#faceMsg').textContent='Wajah belum cocok. Coba pencahayaan atau gunakan KTS.';
 }}catch(e){if(modal)modal.querySelector('#faceMsg').textContent='Pengenalan gagal: '+e.message}
 loopTimer=setTimeout(recognitionLoop,900)
}
document.addEventListener('click',e=>{if(e.target.closest('#startFaceAttendance')){e.preventDefault();open()}});
window.FaceAttendance={open,close,listRegistered:function(){return descriptors.map(x=>String(x.nis))}};
})();
