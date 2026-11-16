// Live-Luftverkehr (ADS-B) als CORS-Proxy.
// airplanes.live hat die öffentliche API geschlossen (HTTP 403). Ersatzquellen liefern dasselbe
// readsb-JSON ({ ac: [...] }), senden aber keine CORS-Header → Abruf nur serverseitig.
// Reihenfolge: adsb.lol (primär), adsb.fi (Fallback).
const UA = 'SkyCheck (+https://skycheck-de.netlify.app)';
const TIMEOUT_MS = 6000;
// Nur die Felder, die der Client tatsächlich liest (fetchAircraft, avUpdateMarkers, avCheckProx).
const FIELDS = ['hex', 'flight', 'lat', 'lon', 'alt_baro', 'alt_geom', 'gs', 'track', 'category'];

const SOURCES = [
  { source: 'adsb.lol', url: (lat, lon, d) => `https://api.adsb.lol/v2/point/${lat}/${lon}/${d}` },
  { source: 'adsb.fi', url: (lat, lon, d) => `https://opendata.adsb.fi/api/v3/lat/${lat}/lon/${lon}/dist/${d}` },
];

const num = v => (typeof v === 'string' && v.trim() === '') ? NaN : Number(v);
const json = (statusCode, body, cache) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': cache },
  body: JSON.stringify(body),
});

async function tryOne(src, lat, lon, dist) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(src.url(lat, lon, dist), { signal: ctrl.signal, headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
    if (!r.ok) return { fail: 'HTTP ' + r.status };
    let data;
    try { data = await r.json(); } catch { return { fail: 'invalid_json' }; }
    if (!data || !Array.isArray(data.ac)) return { fail: 'no_ac_array' };
    return { data };
  } catch (e) {
    return { fail: ctrl.signal.aborted ? 'timeout' : (e && e.message) || 'network_error' };
  } finally { clearTimeout(t); }
}

function reduce(a) {
  if (!a || typeof a !== 'object' || typeof a.lat !== 'number' || typeof a.lon !== 'number'
      || !Number.isFinite(a.lat) || !Number.isFinite(a.lon)) return null;
  const o = {};
  for (const k of FIELDS) if (a[k] !== undefined) o[k] = a[k];
  return o;
}

exports.handler = async (event) => {
  const qs = (event && event.queryStringParameters) || {};
  const lat = num(qs.lat), lon = num(qs.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return json(400, { error: 'invalid_lat_lon' }, 'no-store');
  }
  let dist = qs.dist === undefined ? 108 : num(qs.dist);
  if (!Number.isFinite(dist)) dist = 108;
  dist = Math.min(250, Math.max(1, Math.round(dist)));
  const latS = +lat.toFixed(4), lonS = +lon.toFixed(4);

  const tried = [];
  for (const src of SOURCES) {
    const res = await tryOne(src, latS, lonS, dist);
    if (res.data) {
      const ac = res.data.ac.map(reduce).filter(Boolean);
      const now = Number.isFinite(res.data.now) ? res.data.now : Date.now();
      return json(200, { source: src.source, now, ac }, 'public, max-age=3');
    }
    tried.push({ source: src.source, reason: res.fail });
  }
  return json(502, { error: 'upstream_unavailable', tried }, 'no-store');
};
