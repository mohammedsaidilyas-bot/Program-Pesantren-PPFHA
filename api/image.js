module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }
  let target;
  try { target = new URL(String(req.query.url || '')); }
  catch (_) { return res.status(400).end('Invalid image URL'); }
  const host = target.hostname.toLowerCase();
  const allowed = host === 'drive.google.com' ||
    host === 'drive.usercontent.google.com' ||
    host === 'lh3.googleusercontent.com' ||
    host === 'lh4.googleusercontent.com' ||
    host === 'lh5.googleusercontent.com' ||
    host === 'lh6.googleusercontent.com' ||
    host === 'docs.google.com';
  if (target.protocol !== 'https:' || !allowed) return res.status(400).end('Image host not allowed');
  try {
    const upstream = await fetch(target.toString(), { redirect: 'follow' });
    if (!upstream.ok) return res.status(502).end('Image source unavailable');
    const finalUrl = new URL(upstream.url);
    const finalHost = finalUrl.hostname.toLowerCase();
    if (!(finalHost === 'drive.google.com' || finalHost === 'drive.usercontent.google.com' || finalHost.endsWith('.googleusercontent.com') || finalHost === 'docs.google.com')) return res.status(502).end('Unexpected image host');
    const type = upstream.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return res.status(415).end('Source is not an image');
    const data = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(data);
  } catch (_) { return res.status(502).end('Could not load image'); }
};