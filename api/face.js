// Diagnostic and same-origin proxy for face actions to Google Apps Script.
const GAS_FACE_ENDPOINT='https://script.google.com/macros/s/AKfycbwgGOvBV8fKNBamDVYNBAgMeFS6-ld0nfjU2OCkbFFxTCEMSRZAf7nSW7Odj5OYxEWQ/exec';
function safeSnippet(s){return String(s||'').replace(/<script[\\s\\S]*?<\\/script>/gi,'').replace(/<[^>]*>/g,' ').replace(/\\s+/g,' ').trim().slice(0,240)}
export default async function handler(req,res){
 if(req.method==='GET'){
  try{
   const upstream=await fetch(GAS_FACE_ENDPOINT+'?action=health',{method:'GET',redirect:'follow'});
   const raw=await upstream.text();let data;try{data=JSON.parse(raw)}catch(_){return res.status(502).json({ok:false,stage:'gas-health',status:upstream.status,finalUrl:upstream.url,contentType:upstream.headers.get('content-type'),responsePreview:safeSnippet(raw),error:'Web App Google tidak mengembalikan JSON. Kemungkinan deployment/akses Web App salah.'});}
   return res.status(upstream.ok?200:upstream.status).json({ok:upstream.ok,stage:'gas-health',status:upstream.status,data});
  }catch(e){return res.status(502).json({ok:false,stage:'gas-health',error:String(e&&e.message||e)});}
 }
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,error:'Method tidak diizinkan.'});}
 try{
  let body=req.body;if(typeof body==='string')body=JSON.parse(body||'{}');if(!body||typeof body!=='object')body={};
  const action=String(body.action||'').toLowerCase();if(!['faceenroll','facelist','facedelete'].includes(action))return res.status(400).json({ok:false,error:'Action wajah tidak dikenal.'});
  if(!body.apiKey||typeof body.apiKey!=='string')return res.status(400).json({ok:false,error:'Kunci pengurus wajib diisi.'});
  const upstream=await fetch(GAS_FACE_ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),redirect:'follow'});
  const raw=await upstream.text();let data;try{data=JSON.parse(raw)}catch(_){return res.status(502).json({ok:false,stage:'gas-post',status:upstream.status,finalUrl:upstream.url,contentType:upstream.headers.get('content-type'),responsePreview:safeSnippet(raw),error:'Google Apps Script tidak mengirim JSON valid. Preview respons ditampilkan untuk diagnosis.'});}
  return res.status(upstream.ok?200:upstream.status).json(data);
 }catch(e){return res.status(502).json({ok:false,stage:'proxy',error:'Proxy gagal menghubungi Google: '+String(e&&e.message||e)});}
}
