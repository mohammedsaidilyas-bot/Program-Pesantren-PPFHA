/* FaceLocalStorageSync.js
 * Manual migration helper: browser-local face descriptors -> central FaceDescriptors API.
 * Does NOT delete local records. Requires operator confirmation that records were collected with consent.
 * Add this file to the face enrollment page and invoke FaceLocalStorageSync.open().
 */
(function(){
'use strict';
const API='https://script.google.com/macros/s/AKfycbwgGOvBV8fKNBamDVYNBAgMeFS6-ld0nfjU2OCkbFFxTCEMSRZAf7nSW7Odj5OYxEWQ/exec';
function normalizeNis(v){return String(v==null?'':v).trim().replace(/\\D/g,'');}
function findRecords(){
 const found=[],seen=new Set();
 function walk(value,depth){
  if(depth>7||!value)return;
  if(Array.isArray(value)){
   if(value.length===128&&value.every(x=>typeof x==='number'||!isNaN(Number(x))))return;
   value.forEach(v=>walk(v,depth+1));return;
  }
  if(typeof value!=='object')return;
  const nis=normalizeNis(value.nis||value.NIS||value.idSantri||value.studentId);
  let d=value.descriptor||value.faceDescriptor||value.descriptors||value.embedding||value.vector;
  if(Array.isArray(d)&&d.length===128&&nis&&!seen.has(nis)){
   seen.add(nis);found.push({nis,descriptor:d.map(Number)});return;
  }
  Object.values(value).forEach(v=>walk(v,depth+1));
 }
 for(let i=0;i<localStorage.length;i++){
  const k=localStorage.key(i);try{walk(JSON.parse(localStorage.getItem(k)),0);}catch(_){}
 }
 return found;
}
async function send(rec,key){
 const payload={action:'faceEnroll',apiKey:key,data:{nis:rec.nis,descriptor:rec.descriptor,consent:true,consentAt:new Date().toISOString()}};
 const response=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});
 return response.json();
}
function open(){
 const records=findRecords();
 const box=document.createElement('div');box.style.cssText='position:fixed;inset:0;z-index:999999;background:#06121deE;color:white;display:flex;align-items:center;justify-content:center;padding:12px';
 box.innerHTML='<div style="background:#142533;padding:20px;border-radius:16px;width:min(600px,100%);max-height:90vh;overflow:auto"><h2>Sinkronisasi data wajah lama</h2><p id="fsInfo"></p><p id="fsList" style="max-height:35vh;overflow:auto"></p><label style="display:block;margin:12px 0"><input type="checkbox" id="fsConsent"> Saya memastikan data yang akan disinkronkan telah dikumpulkan dengan persetujuan yang sah.</label><button id="fsGo" style="padding:12px">Kirim ke database pusat</button> <button id="fsClose" style="padding:12px">Tutup</button><p id="fsStatus"></p></div>';
 document.body.appendChild(box);const info=box.querySelector('#fsInfo'),list=box.querySelector('#fsList'),status=box.querySelector('#fsStatus');
 info.textContent='Ditemukan '+records.length+' NIS dengan descriptor 128 angka pada penyimpanan browser.';
 list.textContent=records.length?records.map(x=>x.nis).join(', '):'Tidak ditemukan data descriptor yang dikenali. Format penyimpanan mungkin berbeda.';
 box.querySelector('#fsClose').onclick=()=>box.remove();
 box.querySelector('#fsGo').onclick=async()=>{
  if(!records.length){status.textContent='Tidak ada data yang ditemukan.';return}
  if(!box.querySelector('#fsConsent').checked){status.textContent='Konfirmasi persetujuan wajib dicentang.';return}
  const key=prompt('Masukkan kunci API pengurus:');if(!key)return;
  box.querySelector('#fsGo').disabled=true;let ok=0,fail=0;
  for(const rec of records){try{const r=await send(rec,key);if(r&&r.ok)ok++;else fail++;}catch(e){fail++;}}
  status.textContent='Selesai: '+ok+' tersinkron, '+fail+' gagal. Data lokal tidak dihapus.';
  box.querySelector('#fsGo').disabled=false;
 };
}
window.FaceLocalStorageSync={open,findRecords};
})();