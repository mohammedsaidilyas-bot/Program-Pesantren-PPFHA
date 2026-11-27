/* FaceAttendance.js — modul mandiri opsional absensi wajah.
 * Descriptor wajah tersimpan lokal pada perangkat/browser ini; bukan server.
 * Fallback NIS/QR tetap tersedia. Untuk produksi perlu server enrollment aman & liveness.
 */
(function(){
'use strict';
const STORE='ppfha_face_descriptors_v1',MODEL='https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/';
let stream=null,video=null,canvas=null,mode='recognize',busy=false,loopTimer=null,modal=null;
function getDB(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch(e){return {}}}
function setDB(db){localStorage.setItem(STORE,JSON.stringify(db))}
function close(){if(loopTimer)clearTimeout(loopTimer);loopTimer=null;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;if(modal)modal.remove();modal=null;video=null;canvas=null;busy=false}
function open(){
 if(!window.currentAttendanceActivity){alert('Buka portal kegiatan absensi terlebih dahulu.');return}
 if(!window.faceapi){alert('Library pengenalan wajah belum berhasil dimuat. Periksa internet lalu coba kembali.');return}
 modal=document.createElement('div');modal.style.cssText='position:fixed;inset:0;z-index:100000;background:#0b1720eF;display:flex;align-items:center;justify-content:center;padding:14px;color:white';
 modal.innerHTML='<div style="background:#13232e;border:1px solid #36515f;border-radius:20px;padding:18px;width:min(100%,560px);max-height:95vh;overflow:auto"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">Absensi Wajah</h2><button id="faceClose" style="font-size:24px">×</button></div><p style="color:#c4d6df">Arahkan wajah ke kamera. Untuk mendaftarkan wajah, masukkan NIS lalu tekan Daftarkan.</p><video id="faceVideo" autoplay muted playsinline style="width:100%;border-radius:14px;background:#000;margin-top:10px"></video><canvas id="faceCanvas" style="display:none"></canvas><div style="display:flex;gap:8px;margin-top:12px"><input id="faceNis" inputmode="numeric" placeholder="NIS santri (pendaftaran)" style="min-width:0;flex:1;padding:12px;border-radius:10px"><button id="faceEnroll" style="padding:12px;border-radius:10px">Daftarkan wajah</button></div><div id="faceMsg" style="padding:12px;color:#b9e3cf">Memuat model…</div><div style="font-size:12px;color:#a9bdc9">Pendaftaran menyimpan descriptor wajah di browser/perangkat ini. Ini belum sinkron antarperangkat dan belum dilengkapi liveness detection.</div></div>';
 document.body.appendChild(modal);video=modal.querySelector('#faceVideo');canvas=modal.querySelector('#faceCanvas');
 modal.querySelector('#faceClose').onclick=close;modal.querySelector('#faceEnroll').onclick=enroll;
 start();
}
async function start(){
 const msg=modal.querySelector('#faceMsg');
 try{
 await Promise.all([window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL),window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL),window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL)]);
 stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});video.srcObject=stream;
 await new Promise(resolve=>video.onloadedmetadata=resolve);
 msg.textContent='Kamera aktif. Menunggu wajah…';recognitionLoop();
 }catch(e){msg.textContent='Kamera/model gagal: '+e.message+' (pastikan izin kamera dan internet aktif).'}
}
async function detect(){return window.faceapi.detectSingleFace(video,new window.faceapi.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:.5})).withFaceLandmarks().withFaceDescriptor()}
async function enroll(){
 if(busy)return;busy=true;const msg=modal.querySelector('#faceMsg');
 try{const nis=modal.querySelector('#faceNis').value.trim();if(!nis){msg.textContent='Masukkan NIS terlebih dahulu.';return}
 const result=await detect();if(!result){msg.textContent='Wajah belum terdeteksi. Posisikan wajah dengan pencahayaan baik.';return}
 const db=getDB();db[nis]=Array.from(result.descriptor);setDB(db);msg.textContent='Descriptor wajah NIS '+nis+' tersimpan pada perangkat ini.'; 
 }catch(e){msg.textContent='Pendaftaran gagal: '+e.message}finally{busy=false}
}
async function recognitionLoop(){
 if(!modal||busy)return;try{
 const result=await detect();if(result){
 const db=getDB(),entries=Object.entries(db);if(entries.length){
 let best={nis:null,distance:1};entries.forEach(([nis,descriptor])=>{const distance=window.faceapi.euclideanDistance(result.descriptor,new Float32Array(descriptor));if(distance<best.distance)best={nis,distance}});
 if(best.distance<.48){busy=true;const msg=modal.querySelector('#faceMsg');msg.textContent='Wajah cocok: NIS '+best.nis+' — mencatat kehadiran…';close();if(typeof window.recordAttendanceScan==='function')await window.recordAttendanceScan(best.nis,window.currentAttendanceActivity,new Date().toISOString());else alert('Fungsi pencatat absensi belum tersedia.');busy=false;return}
 modal.querySelector('#faceMsg').textContent='Wajah belum cocok. Jarak terbaik '+best.distance.toFixed(2)+'; coba lagi atau scan KTS.';
 }else modal.querySelector('#faceMsg').textContent='Belum ada wajah terdaftar di perangkat ini. Masukkan NIS dan daftarkan wajah.'}
 }catch(e){if(modal)modal.querySelector('#faceMsg').textContent='Pengenalan gagal: '+e.message}
 loopTimer=setTimeout(recognitionLoop,900)
}
document.addEventListener('click',e=>{if(e.target.closest('#startFaceAttendance')){e.preventDefault();open()}});
window.FaceAttendance={open,close,listRegistered:function(){return Object.keys(getDB())},clearEnrollment:function(nis){const db=getDB();delete db[String(nis)];setDB(db)}};
})();
