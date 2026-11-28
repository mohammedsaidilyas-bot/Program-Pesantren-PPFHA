// Face enrollment proxy — configuration diagnosis and forwarding.
const ENV_NAME = ['GAS_FACE_ENDPOINT','GAS_FACE_URL','FACE_GAS_ENDPOINT'].find(n => String(process.env[n] || '').trim()) || '';
const GAS_FACE_ENDPOINT = ENV_NAME ? String(process.env[ENV_NAME]).trim().replace(/\\/+$/, '') : '';
function safeSnippet(value) { return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 240); }
function healthUrl(endpoint) { const u = new URL(endpoint); u.searchParams.set('action','health'); return u.toString(); }
async function readUpstream(url, body) {
 const options = body === undefined ? {method:'GET',redirect:'follow'} : {method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),redirect:'follow'};
 const upstream = await fetch(url, options); const raw = await upstream.text(); let data = null;
 try { data = JSON.parse(raw); } catch (_) {}
 return {upstream,data,raw};
}
function upstreamFailure(result){
 const status=result.upstream.status,ct=result.upstream.headers.get('content-type')||'';
 return {ok:false,stage:'gas-response',upstreamStatus:status,contentType:ct,finalUrl:result.upstream.url,responsePreview:safeSnippet(result.raw),
 error:status===404?'Google Apps Script HTTP 404. Periksa URL deployment Web App.':
 !result.data?'Apps Script tidak mengembalikan JSON. Periksa akses Web App/deployment.':'Respons upstream tidak sesuai.'};
}
function configDiagnostic(){return {endpointConfigured:!!GAS_FACE_ENDPOINT,envVariable:ENV_NAME||null,endpointFormatLooksValid:/^https:\\/\\/script\\.google\\.com\\/macros\\/s\\/[^/]+\\/exec(?:\\?.*)?$/.test(GAS_FACE_ENDPOINT)}}
export default async function handler(req,res) {
 if(req.method==='GET') {
  const diag=configDiagnostic();
  if(!GAS_FACE_ENDPOINT)return res.status(200).json({ok:false,stage:'configuration',...diag,error:'Variabel endpoint tidak terbaca oleh deployment Vercel. Periksa Environment scope dan deployment terbaru.'});
  try { const result=await readUpstream(healthUrl(GAS_FACE_ENDPOINT));
   if(!result.data||result.upstream.status>=400)return res.status(200).json({...upstreamFailure(result),...diag});
   return res.status(200).json({ok:!!result.data.ok,stage:'health',...diag,upstreamStatus:result.upstream.status,contentType:result.upstream.headers.get('content-type'),data:result.data});
  } catch(e) { return res.status(200).json({ok:false,stage:'health-proxy',...diag,error:String(e&&e.message||e)}); }
 }
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({ok:false,error:'Method tidak diizinkan'});}
 try {
  const diag=configDiagnostic();
  if(!GAS_FACE_ENDPOINT)return res.status(200).json({ok:false,stage:'configuration',...diag,error:'Variabel endpoint tidak terbaca oleh deployment Vercel. Periksa Environment scope dan deployment terbaru.'});
  let body=req.body;if(typeof body==='string'){try{body=JSON.parse(body)}catch(_){body={}}}if(!body||typeof body!=='object')body={};
  const action=String(body.action||'').trim().toLowerCase();
  if(!['facelist','faceenroll','facedelete'].includes(action))return res.status(200).json({ok:false,stage:'proxy-validation',error:'Action tidak dikenal: '+action});
  if(!body.apiKey)return res.status(200).json({ok:false,stage:'proxy-validation',error:'FACE_API_KEY dari pengurus wajib disertakan pada permintaan'});
  body.action=action;
  const result=await readUpstream(GAS_FACE_ENDPOINT,body);
  if(!result.data||result.upstream.status>=400)return res.status(200).json({...upstreamFailure(result),...diag});
  return res.status(200).json({ok:result.data.ok===true,stage:'gas-json',...diag,upstreamStatus:result.upstream.status,data:result.data,error:result.data.ok===true?undefined:(result.data.error||'Apps Script mengembalikan ok=false')});
 } catch(e) { return res.status(200).json({ok:false,stage:'proxy-exception',error:String(e&&e.message||e)}); }
}
