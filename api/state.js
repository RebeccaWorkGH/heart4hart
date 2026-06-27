async function kvGet(url, token, key) {
  const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await r.json();
  return json.result ? JSON.parse(json.result) : null;
}

async function kvSet(url, token, key, value) {
  const r = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value))
  });
  return r.ok;
}

async function kvKeys(url, token, pattern) {
  const r = await fetch(`${url}/keys/${encodeURIComponent(pattern)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await r.json();
  return json.result || [];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ error: 'Missing KV credentials' });
  }

  // GET /api/state?date=2024-06-02  — get a specific day
  // GET /api/state?dates=all         — get list of all days that have data
  if (req.method === 'GET') {
    const { date, dates } = req.query;

    if (dates === 'all') {
      try {
        const keys = await kvKeys(url, token, 'sloane-day-*');
        const dayList = keys
          .map(k => k.replace('sloane-day-', ''))
          .sort()
          .reverse();
        return res.status(200).json({ days: dayList });
      } catch (e) {
        return res.status(500).json({ error: 'Failed to list days' });
      }
    }

    const key = date ? `sloane-day-${date}` : `sloane-day-${todayKey()}`;
    try {
      const data = await kvGet(url, token, key);
      return res.status(200).json(data || { date: date || todayKey(), events: [], notes: [], totalPts: 0 });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to load' });
    }
  }

  // POST /api/state — save a day's data (date in body)
  if (req.method === 'POST') {
    try {
      const body = req.body;
      const date = body.date || todayKey();
      const key = `sloane-day-${date}`;
      await kvSet(url, token, key, body);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to save' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
