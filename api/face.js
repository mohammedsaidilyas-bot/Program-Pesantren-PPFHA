// Same-origin proxy for central Google Apps Script face enrollment.
const GAS_FACE_ENDPOINT = (process.env.GAS_FACE_ENDPOINT || '').trim();
function safeSnippet(value) { return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 240); }
async function readUpstream(url, body) {
 const options = body === undefined ? {method:'GET',redirect:'follow'} : {method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),redirect:'follow'};
 const upstream = await fetch(url, options); const raw = await upstream.text(); let data = null;
 try { data = JSON.parse(raw); } catch (_) {}
 return {upstream,data,raw};
}
function upstreamFailure(result){
 const status=result.upstream.status,ct=result.upstream.headers.get('content-type')||'';
 return {ok:false,stage:'gas-response',upstreamStatus:status,contentType:ct,finalUrl:result.upstream.url,responsePreview:safeSnippet(result.raw),
 error:status===404?'Google Apps Script HTTP 404. Pastikan GAS_FACE_ENDPOINT memakai URL deployment aktif yang berakhiran /exec.':
 !result.data?'Apps Script tidak mengembalikan JSON. Jika respons berupa halaman Google login/HTML, periksa deployment: akses Web App harus dapat diakses oleh pengguna portal.':'Respons upstream tidak sesuai.'};
}
export default async function handler(req,res) {
 if(req.method==='GET') {
  if(!GAS_FACE_ENDPOINT)return res.status(200).json({ok:false,stage:'configuration',error:'GAS_FACE_ENDPOINT belum diatur di konfigurasi Vercel.'});
  try { const result=await readUpstream(GAS_FACE_ENDPOINT+'?action=health');
   if(!result.data||result.upstream.status>=400)return res.status(200).json(upstreamFailure(result));
   return res.status(200).json({ok:!!result.data.ok,stage:'health',endpointConfigured:true,upstreamStatus:result.upstream.status,contentType:result.upstream.headers.get('content-type'),finalUrl:result.upstream.url,data:result.data});
  } catch(e) { return res.status(200).json({ok:false,stage:'health-proxy',error:String(e&&e.message||e)}); }
 }
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,error:'Method tidak diizinkan'});}
 try {
  if(!GAS_FACE_ENDPOINT)return res.status(200).json({ok:false,stage:'configuration',error:'GAS_FACE_ENDPOINT belum diatur di konfigurasi Vercel.'});
  let body=req.body;if(typeof body==='string'){try{body=JSON.parse(body)}catch(_){body={}}}if(!body||typeof body!=='object')body={};
  const action=String(body.action||'').trim().toLowerCase();
  if(!['facelist','faceenroll','facedelete'].includes(action))return res.status(200).json({ok:false,stage:'proxy-validation',error:'Action tidak dikenal: '+action});
  if(!body.apiKey)return res.status(200).json({ok:false,stage:'proxy-validation',error:'FACE_API_KEY dari pengurus wajib disertakan pada permintaan'});
  body.action=action;
  const result=await readUpstream(GAS_FACE_ENDPOINT,body);
  if(!result.data||result.upstream.status>=400)return res.status(200).json(upstreamFailure(result));
  return res.status(200).json({ok:result.data.ok===true,stage:'gas-json',upstreamStatus:result.upstream.status,data:result.data,error:result.data.ok===true?undefined:(result.data.error||'Apps Script mengembalikan ok=false')});
 } catch(e) { return res.status(200).json({ok:false,stage:'proxy-exception',error:String(e&&e.message||e)}); }
}
