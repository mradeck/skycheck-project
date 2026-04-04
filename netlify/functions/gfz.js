exports.handler = async (event) => {
  const { start, end, index } = event.queryStringParameters || {};
  if (!start || !end || !index) return { statusCode: 400, body: 'Missing params' };
  const allowed = ['Kp', 'Hp30', 'Hp60'];
  if (!allowed.includes(index)) return { statusCode: 400, body: 'Invalid index' };
  const url = `https://kp.gfz.de/app/json/?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&index=${index}&status=nowcast`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return { statusCode: r.status, body: 'GFZ error: ' + r.status };
    const data = await r.json();
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=120' }, body: JSON.stringify(data) };
  } catch(e) { return { statusCode: 502, body: JSON.stringify({ error: e.message }) }; }
};
