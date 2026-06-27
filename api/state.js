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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) return res.status(500).json({ error: 'Missing KV credentials' });

  if (req.method === 'GET') {
    const { date, dates } = req.query;

    // Return list of all days
    if (dates === 'all') {
      try {
        const index = await kvGet(url, token, 'sloane-days-index') || [];
        return res.status(200).json({ days: index });
      } catch (e) {
        return res.status(500).json({ error: 'Failed to list days' });
      }
    }

    // Return a specific day's data
    const key = `sloane-day-${date || todayKey()}`;
    try {
      const data = await kvGet(url, token, key);
      return res.status(200).json(data || {
        date: date || todayKey(),
        events: [],
        notes: [],
        totalPts: 0
      });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to load' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      const date = body.date || todayKey();
      const key = `sloane-day-${date}`;

      // Save the day's data
      await kvSet(url, token, key, body);

      // Update the days index
      const index = await kvGet(url, token, 'sloane-days-index') || [];
      if (!index.includes(date)) {
        index.push(date);
        index.sort().reverse();
        await kvSet(url, token, 'sloane-days-index', index);
      }

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
