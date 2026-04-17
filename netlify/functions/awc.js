exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const endpoint = qs.endpoint;
  const allowed = ['metar', 'taf'];
  if (!allowed.includes(endpoint)) return { statusCode: 400, body: 'Invalid endpoint' };
  const params = Object.keys(qs).filter(k => k !== 'endpoint').map(k => `${encodeURIComponent(k)}=${encodeURIComponent(qs[k])}`).join('&');
  const url = `https://aviationweather.gov/api/data/${endpoint}?${params}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return { statusCode: r.status, body: 'AWC error: ' + r.status };
    const body = await r.text();
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=90' }, body };
  } catch(e) { return { statusCode: 502, body: JSON.stringify({ error: e.message }) }; }
};
