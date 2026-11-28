// Same-origin diagnostic proxy for Google Apps Script face enrollment.
const GAS_FACE_ENDPOINT = (process.env.GAS_FACE_ENDPOINT || 'https://script.google.com/macros/s/AKfycbwgGOvBV8fKNBamDVYNBAgMeFS6-ld0nfjU2OCkbFFxTCEMSRZAf7nSW7Odj5OYxEWQ/exec').trim();
function safeSnippet(value) { return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240); }
async function readUpstream(url, body) {
 const options = body === undefined ? {method:'GET', redirect:'follow'} : {method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),redirect:'follow'};
 const upstream = await fetch(url, options); const raw = await upstream.text(); let data = null;
 try { data = JSON.parse(raw); } catch (_) {}
 return {upstream,data,raw};
}
export default async function handler(req,res) {
 if(req.method==='GET') {
  try { const result=await readUpstream(GAS_FACE_ENDPOINT+'?action=health');
   return res.status(200).json({ok:!!(result.data&&result.data.ok),stage:'health',endpointConfigured:!!GAS_FACE_ENDPOINT,upstreamStatus:result.upstream.status,contentType:result.upstream.headers.get('content-type'),finalUrl:result.upstream.url,data:result.data,responsePreview:result.data?undefined:safeSnippet(result.raw),error:result.upstream.status===404?'Deployment Google Apps Script tidak ditemukan. Periksa URL deployment /exec.':undefined});
  } catch(e) { return res.status(200).json({ok:false,stage:'health-proxy',error:String(e&&e.message||e)}); }
 }
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,error:'Method tidak diizinkan'});}
 try {
  let body=req.body;if(typeof body==='string'){try{body=JSON.parse(body)}catch(_){body={}}}if(!body||typeof body!=='object')body={};
  const action=String(body.action||'').toLowerCase();if(!['facelist','faceenroll','facedelete'].includes(action))return res.status(200).json({ok:false,stage:'proxy-validation',error:'Action tidak dikenal'});
  if(!body.apiKey)return res.status(200).json({ok:false,stage:'proxy-validation',error:'Kunci pengurus wajib diisi'});
  const result=await readUpstream(GAS_FACE_ENDPOINT,body);
  if(!result.data)return res.status(200).json({ok:false,stage:'gas-response',upstreamStatus:result.upstream.status,contentType:result.upstream.headers.get('content-type'),finalUrl:result.upstream.url,responsePreview:safeSnippet(result.raw),error:result.upstream.status===404?'Deployment Google Apps Script tidak ditemukan (HTTP 404). Perbarui GAS_FACE_ENDPOINT ke URL deployment /exec yang aktif.':'Google Apps Script tidak mengirim JSON valid'});
  return res.status(200).json({ok:result.data.ok===true,stage:'gas-json',upstreamStatus:result.upstream.status,data:result.data,error:result.data.ok===true?undefined:(result.data.error||'Apps Script mengembalikan ok=false')});
 } catch(e) { return res.status(200).json({ok:false,stage:'proxy-exception',error:String(e&&e.message||e)}); }
}
