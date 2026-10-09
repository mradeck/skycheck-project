// SkyCheck — Live-Proxy für belgische befristete Gebiete (BCAA / skeyes Droneguide).
// Der Upstream sendet keinen CORS-Header, daher dieser Proxy. Er wird nur auf Nutzerklick
// aufgerufen. Ein WFS-Abruf mit cql_filter auf genau die beiden Live-Typen — jede Abfrage MUSS
// einen Filter tragen, weil der ungefilterte Layer 149 MB Welt-Zeitzonen enthält. Zonen, die
// über 120 m AGL beginnen, entfallen (wie die Standardansicht der amtlichen Karte).
// Antwort in der SkyCheck-Zonenform mit notam:true. Quelle: BCAA / skeyes (Droneguide).

const CQL = "type_code IN ('NOTAM','TEMPORARY-NO-FLY-ZONE')";
const UPSTREAM = 'https://map.droneguide.be/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=geo_zone_fast'
  + `&srsName=EPSG:4326&outputFormat=application/json&cql_filter=${encodeURIComponent(CQL)}`;
const SITE_URL = 'https://map.droneguide.be/';
const DEFAULT_TIMEOUT_MS = 12000;
const MAX_LOWER_M = 120;
const COLORS = { PROHIBITED: '#ef4444', REQ_AUTHORISATION: '#f59e0b', CONDITIONAL: '#f97316' };
const LANGS = ['en', 'nl', 'fr'];

let timeoutOverride = null;

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

// Feld ist ein JSON-String {"en":…,"nl":…} oder Klartext: en → nl → fr → erster Wert → Klartext.
function bestText(v) {
  if (v === undefined || v === null) return '';
  const s = String(v);
  if (s.trim().startsWith('{')) {
    try {
      const o = JSON.parse(s);
      if (o && typeof o === 'object' && !Array.isArray(o)) {
        const first = Object.values(o).find(t => typeof t === 'string' && t);
        return LANGS.map(l => o[l]).find(t => typeof t === 'string' && t) || first || '';
      }
    } catch (_) { /* kein JSON → Klartext */ }
  }
  return s;
}

// Zahl oder numerischer String → Zahl, sonst NaN.
const num = v => (typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN));

function toZone(feature) {
  const p = (feature && feature.properties) || {};
  const geometry = polygonsOf(feature && feature.geometry);
  if (!geometry.length) return null;
  const lowRaw = num(p.lower_limit_altitude_meter_agl);
  const lowerM = Number.isFinite(lowRaw) ? Math.max(0, lowRaw) : 0;
  const upperM = num(p.upper_limit_altitude_meter_agl);
  if (lowerM > MAX_LOWER_M) return null;
  const type = Object.prototype.hasOwnProperty.call(COLORS, p.restriction) ? p.restriction : 'PROHIBITED';
  return {
    name: bestText(p.name) || String(p.code || p.unique_identifier || 'NOTAM'),
    type,
    lower: Math.round(lowerM) === 0 ? 'GND' : `${Math.round(lowerM)} m AGL`,
    upper: Number.isFinite(upperM) ? `${Math.round(upperM)} m AGL` : '—',
    legal: 'BCAA / skeyes (Droneguide)',
    legalUrl: SITE_URL,
    desc: bestText(p.description),
    color: COLORS[type],
    geometry,
    notam: true,
  };
}

exports.handler = async () => {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, timeoutOverride === null ? DEFAULT_TIMEOUT_MS : timeoutOverride);
  try {
    const res = await fetch(UPSTREAM, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'SkyCheck-NOTAM-Proxy/1.0 (+https://github.com/mradeck/skycheck-project)' },
    });
    if (!res.ok) return json(502, { error: `Upstream HTTP ${res.status}` });
    let body;
    try { body = await res.text(); }
    catch (e) { if (ctrl.signal.aborted) throw e; return json(502, { error: 'Upstream body unreadable' }); }
    let data;
    try { data = JSON.parse(body); }
    catch (_) { return json(502, { error: 'Upstream returned invalid JSON' }); }
    if (!data || !Array.isArray(data.features)) return json(502, { error: 'Upstream returned no feature list' });
    const zones = data.features.map(toZone).filter(Boolean);
    return json(200, { country: 'BE', fetchedAt: new Date().toISOString(), zones }, 300);
  } catch (e) {
    return json(502, { error: timedOut || (e && e.name === 'AbortError') ? 'Upstream timeout' : 'Upstream unreachable' });
  } finally {
    clearTimeout(timer);
  }
};

exports._test = {
  setTimeoutMs: ms => { timeoutOverride = ms; },
};
