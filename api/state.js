const STATE_KEY = 'sloane-journey-state';

async function kvGet(url, token, key) {
  const r = await fetch(`${url}/get/${key}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await r.json();
  return json.result ? JSON.parse(json.result) : null;
}

async function kvSet(url, token, key, value) {
  await fetch(`${url}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value))
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (req.method === 'GET') {
    try {
      const state = await kvGet(url, token, STATE_KEY);
      return res.status(200).json(state || { counts: {}, feed: [], totalPts: 0 });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to load state' });
    }
  }

  if (req.method === 'POST') {
    try {
      await kvSet(url, token, STATE_KEY, req.body);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to save state' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
