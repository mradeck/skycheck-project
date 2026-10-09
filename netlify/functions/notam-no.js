// SkyCheck — Live-Proxy für norwegische NOTAM-Sperrgebiete (dronesoner.no).
// Der Upstream sendet keinen CORS-Header, daher dieser Proxy. Er wird nur auf Nutzerklick
// aufgerufen (Knopf „NOTAM laden" in skycheck-no). Antwort in der SkyCheck-Zonenform,
// zusätzlich mit notam:true. Quelle: Luftfartstilsynet / dronesoner.no (NLOD 2.0).

const UPSTREAM = 'https://dronesoner.no/data/forbud_notam.geojson';
const TIMEOUT_MS = 8000;
const RED = '#ef4444';

const json = (statusCode, body, maxAge) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
  },
  body: JSON.stringify(body),
});

function polygonsOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
    return [{ type: 'Polygon', coordinates: geometry.coordinates }];
  }
  if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.filter(Array.isArray).map(coordinates => ({ type: 'Polygon', coordinates }));
  }
  return [];
}

function toZone(feature) {
  const p = (feature && feature.properties) || {};
  const geometry = polygonsOf(feature && feature.geometry);
  if (!geometry.length) return null;
  return {
    name: String(p.navn || p.name || p.id || 'NOTAM'),
    type: 'PROHIBITED',
    lower: p.lower_limit ? String(p.lower_limit) : '—',
    upper: p.upper_limit ? String(p.upper_limit) : '—',
    legal: 'NOTAM',
    legalUrl: 'https://dronesoner.no/',
    desc: p.remarks ? String(p.remarks) : '',
    color: RED,
    geometry,
    notam: true,
  };
}

exports.handler = async () => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(UPSTREAM, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'SkyCheck-NOTAM-Proxy/1.0 (+https://github.com/mradeck/skycheck-project)' },
    });
    if (!res.ok) return json(502, { error: `Upstream HTTP ${res.status}` });
    let data;
    try { data = JSON.parse(await res.text()); }
    catch (_) { return json(502, { error: 'Upstream returned invalid JSON' }); }
    if (!data || !Array.isArray(data.features)) return json(502, { error: 'Upstream returned no feature list' });
    const zones = data.features.map(toZone).filter(Boolean);
    return json(200, { country: 'NO', fetchedAt: new Date().toISOString(), zones }, 300);
  } catch (e) {
    return json(502, { error: e && e.name === 'AbortError' ? 'Upstream timeout' : 'Upstream unreachable' });
  } finally {
    clearTimeout(timer);
  }
};
