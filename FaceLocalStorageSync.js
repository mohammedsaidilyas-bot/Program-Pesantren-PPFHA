/* FaceLocalStorageSync.js — safe migration from browser storage to central Sheet.
 * Diagnostic-first; does not erase browser records.
 */
(function(){
'use strict';
const API='https://script.google.com/macros/s/AKfycbwgGOvBV8fKNBamDVYNBAgMeFS6-ld0nfjU2OCkbFFxTCEMSRZAf7nSW7Odj5OYxEWQ/exec';
function normalizeNis(v){return String(v==null?'':v).trim().replace(/\\D/g,'');}
function isDescriptor(v){return Array.isArray(v)&&v.length===128&&v.every(x=>x!==null&&x!==''&&isFinite(Number(x)));}
function findRecords(){
 const found=new Map(),diagnostics=[];
 function walk(value,depth,inheritedNis,keyHint){
  if(depth>10||value==null)return;
  if(Array.isArray(value)){value.forEach((v,i)=>walk(v,depth+1,inheritedNis,keyHint+'['+i+']'));return;}
  if(typeof value!=='object')return;
  const candidateNis=normalizeNis(value.nis||value.NIS||value.idSantri||value.studentId||value.nomorInduk||inheritedNis);
  const keys=Object.keys(value);
  for(const k of keys){
   const v=value[k];
   if(isDescriptor(v)&&candidateNis&&!found.has(candidateNis)){found.set(candidateNis,{nis:candidateNis,descriptor:v.map(Number)});}
   else if(isDescriptor(v)&&!candidateNis){diagnostics.push('Descriptor ditemukan tanpa NIS pada '+keyHint+'.'+k);}
   else walk(v,depth+1,candidateNis,keyHint+'.'+k);
  }
  const d=value.descriptor||value.faceDescriptor||value.embedding||value.vector;
  if(isDescriptor(d)&&candidateNis&&!found.has(candidateNis))found.set(candidateNis,{nis:candidateNis,descriptor:d.map(Number)});
  if(Array.isArray(value.descriptors)&&value.descriptors.length===128&&candidateNis&&isDescriptor(value.descriptors)&&!found.has(candidateNis))found.set(candidateNis,{nis:candidateNis,descriptor:value.descriptors.map(Number)});
 }
 for(let i=0;i<localStorage.length;i++){
  const k=localStorage.key(i),raw=localStorage.getItem(k);
  try{
   const parsed=JSON.parse(raw);
   const keyNis=normalizeNis((k.match(/\\d{5,}/)||[])[0]||'');
   walk(parsed,0,keyNis,k);
   if(parsed&&Array.isArray(parsed)&&isDescriptor(parsed)&&keyNis&&!found.has(keyNis))found.set(keyNis,{nis:keyNis,descriptor:parsed.map(Number)});
  }catch(_){}
 }
 return {records:Array.from(found.values()),diagnostics,keys:Array.from({length:localStorage.length},(_,i)=>localStorage.key(i))};
}
async function send(rec,key){
 const payload={action:'faceEnroll',apiKey:key,data:{nis:rec.nis,descriptor:rec.descriptor,consent:true,consentAt:new Date().toISOString()}};
 const response=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});
 return response.json();
}
function open(){
 const scan=findRecords(),records=scan.records;
 const box=document.createElement('div');box.style.cssText='position:fixed;inset:0;z-index:999999;background:#06121deE;color:white;display:flex;align-items:center;justify-content:center;padding:12px';
 box.innerHTML='<div style="background:#142533;padding:20px;border-radius:16px;width:min(600px,100%);max-height:90vh;overflow:auto"><h2>Sinkronisasi data wajah lama</h2><p id="fsInfo"></p><p id="fsList" style="max-height:35vh;overflow:auto;white-space:pre-wrap"></p><label style="display:block;margin:12px 0"><input type="checkbox" id="fsConsent"> Saya memastikan data yang akan disinkronkan telah dikumpulkan dengan persetujuan yang sah.</label><button id="fsExport" style="padding:12px">Ekspor data wajah (JSON)</button> <button id="fsGo" style="padding:12px">Kirim ke database pusat</button> <button id="fsClose" style="padding:12px">Tutup</button><p id="fsStatus"></p></div>';
 document.body.appendChild(box);const info=box.querySelector('#fsInfo'),list=box.querySelector('#fsList'),status=box.querySelector('#fsStatus');
 info.textContent='Ditemukan '+records.length+' NIS dengan descriptor wajah pada penyimpanan browser.';
 list.textContent=records.length?records.map(x=>x.nis).join(', '):'Belum ditemukan descriptor yang terhubung ke NIS. Diagnostik: '+scan.diagnostics.slice(0,8).join(' | ')+'\nKunci storage: '+scan.keys.join(', ');
 box.querySelector('#fsExport').onclick=function(){
  if(!records.length){status.textContent='Belum ada descriptor yang terdeteksi untuk diekspor.';return;}
  const payload={exportedAt:new Date().toISOString(),source:'browser-local-face-storage',records:records};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='face-descriptors-export.json';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  status.textContent='File JSON ekspor dibuat. Simpan file ini; data lokal tidak dihapus.';
 };
 box.querySelector('#fsClose').onclick=()=>box.remove();
 box.querySelector('#fsGo').onclick=async()=>{
  if(!records.length){status.textContent='Data belum ditemukan. Kirim screenshot panel ini untuk menyesuaikan pembacaan storage.';return}
  if(!box.querySelector('#fsConsent').checked){status.textContent='Konfirmasi persetujuan wajib dicentang.';return}
  const key=prompt('Masukkan kunci API wajah (FACE_API_KEY):');if(!key)return;
  const btn=box.querySelector('#fsGo');btn.disabled=true;let ok=0,fail=[];
  for(const rec of records){try{const r=await send(rec,key);if(r&&r.ok)ok++;else fail.push(rec.nis+': '+(r.error||'respons gagal'));}catch(e){fail.push(rec.nis+': '+e.message);}}
  status.textContent='Selesai: '+ok+' tersinkron, '+fail.length+' gagal. '+(fail.length?fail.join(' | '):'')+' Data lokal tidak dihapus.';
  btn.disabled=false;
 };
}
window.FaceLocalStorageSync={open,findRecords:function(){return findRecords().records;}};
})();