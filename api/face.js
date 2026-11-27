// Vercel same-origin proxy for Apps Script FaceDescriptors endpoint.
// This avoids browser CORS failures caused by Apps Script ContentService redirects.
const GAS_FACE_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwgGOvBV8fKNBamDVYNBAgMeFS6-ld0nfjU2OCkbFFxTCEMSRZAf7nSW7Odj5OYxEWQ/exec';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method tidak diizinkan.' });
  }
  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    if (!body || typeof body !== 'object') body = {};
    const action = String(body.action || '').toLowerCase();
    if (!['faceenroll', 'facelist', 'facedelete'].includes(action)) {
      return res.status(400).json({ ok: false, error: 'Action wajah tidak dikenal.' });
    }
    if (!body.apiKey || typeof body.apiKey !== 'string') {
      return res.status(400).json({ ok: false, error: 'Kunci pengurus wajib diisi.' });
    }
    const upstream = await fetch(GAS_FACE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow'
    });
    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); }
    catch (_) { return res.status(502).json({ ok: false, error: 'Server Google tidak mengirim JSON yang valid.' }); }
    return res.status(upstream.ok ? 200 : upstream.status).json(data);
  } catch (error) {
    return res.status(502).json({ ok: false, error: 'Proxy gagal menghubungi Google: ' + String(error && error.message || error) });
  }
}
