// SkyCheck — Live-Proxy für schwedische befristete Restriktionsgebiete (LFV / DAIM-WFS).
// Der Upstream sendet keinen CORS-Header, daher dieser Proxy. Er wird nur auf Nutzerklick
// aufgerufen. Zwei Abrufe: dynais:NOTAM (Filter der amtlichen Drönarkartan, zusätzlich nur
// Zonen ab Boden) und DAIM_TOPO:SUP (AIP SUP, nur aktuell gültige). Scheitert einer, gibt es
// 502 — kein Teilergebnis. Antwort in der SkyCheck-Zonenform mit notam:true.
// Quelle: LFV / Transportstyrelsen (CC BY 4.0).

const WFS = 'https://daim.lfv.se/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&outputFormat=application/json&srsname=EPSG:4326&typename=';
const NOTAM_FILTER = "(CODE23 ilike 'R%' OR CODE23 ilike 'W%') AND CODE45 <> 'TT'";
const NOTAM_URL = `${WFS}dynais:NOTAM&CQL_FILTER=${encodeURIComponent(NOTAM_FILTER)}`;
const SUP_URL = `${WFS}DAIM_TOPO:SUP`;
const CHART_URL = 'https://dronechart.lfv.se/';
const DEFAULT_TIMEOUT_MS = 12000;
const COLORS = { PROHIBITED: '#ef4444', REQ_AUTHORISATION: '#f59e0b', CONDITIONAL: '#f97316' };

// "Jetzt" und Zeitlimit laufen über eine Stelle, damit Tests sie setzen können.
let nowOverride = null, timeoutOverride = null;
const now = () => (nowOverride === null ? Date.now() : nowOverride);

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

const text = v => (v === undefined || v === null ? '' : String(v).trim());

function notamZone(feature) {
  const p = (feature && feature.properties) || {};
  if (p.LOWER !== 0) return null;                       // nur Gebiete ab Boden
  const geometry = polygonsOf(feature.geometry);
  if (!geometry.length) return null;
  const type = /^R/i.test(text(p.CODE23)) ? 'PROHIBITED' : 'CONDITIONAL';
  return {
    name: `NOTAM ${text(p.SERIES)}${text(p.NO)}/${text(p.YEAR)}`,
    type,
    lower: text(p.ITEM_F) || 'GND',
    upper: text(p.ITEM_G) || '—',
    legal: 'NOTAM',
    legalUrl: CHART_URL,
    desc: text(p.ITEM_E),
    color: COLORS[type],
    geometry,
    notam: true,
  };
}

// Gültig, solange keine lesbare Grenze verletzt ist; unlesbare Daten blenden die Zone nicht aus.
function supIsValid(p) {
  const from = Date.parse(p.FROM), to = Date.parse(p.TO);
  const t = now();
  if (isFinite(from) && from > t) return false;
  if (isFinite(to) && to < t) return false;
  return true;
}

const withUnit = (value, uom) => {
  const v = text(value);
  if (!v) return '—';
  return text(uom) ? `${v} ${text(uom)}` : v;
};

function supZone(feature) {
  const p = (feature && feature.properties) || {};
  if (!supIsValid(p)) return null;
  const geometry = polygonsOf(feature.geometry);
  if (!geometry.length) return null;
  const com = text(p.COM_EN) || text(p.COM_SE);
  const schedule = text(p.SCHEDULE);
  return {
    name: [text(p.DESIG), text(p.NAME)].filter(Boolean).join(' ') || 'SUP',
    type: 'PROHIBITED',
    lower: withUnit(p.LOWER, p.LOW_UOM),
    upper: withUnit(p.UPPER, p.UP_UOM),
    legal: 'AIP SUP',
    legalUrl: /^https?:\/\//i.test(text(p.URL)) ? text(p.URL) : CHART_URL,
    desc: [com, schedule && `Schedule: ${schedule}`].filter(Boolean).join(' '),
    color: COLORS.PROHIBITED,
    geometry,
    notam: true,
  };
}

async function fetchFeatures(url, signal) {
  const res = await fetch(url, {
    signal,
    headers: { 'User-Agent': 'SkyCheck-NOTAM-Proxy/1.0 (+https://github.com/mradeck/skycheck-project)' },
  });
  if (!res.ok) throw new UpstreamError(`Upstream HTTP ${res.status}`);
  let data;
  try { data = JSON.parse(await res.text()); }
  catch (_) { throw new UpstreamError('Upstream returned invalid JSON'); }
  if (!data || !Array.isArray(data.features)) throw new UpstreamError('Upstream returned no feature list');
  return data.features;
}

class UpstreamError extends Error {}

exports.handler = async () => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutOverride === null ? DEFAULT_TIMEOUT_MS : timeoutOverride);
  try {
    const [notams, sups] = await Promise.all([fetchFeatures(NOTAM_URL, ctrl.signal), fetchFeatures(SUP_URL, ctrl.signal)]);
    const zones = [...notams.map(notamZone), ...sups.map(supZone)].filter(Boolean);
    return json(200, { country: 'SE', fetchedAt: new Date().toISOString(), zones }, 300);
  } catch (e) {
    ctrl.abort();                                       // den zweiten Abruf nicht weiterlaufen lassen
    if (e instanceof UpstreamError) return json(502, { error: e.message });
    return json(502, { error: e && e.name === 'AbortError' ? 'Upstream timeout' : 'Upstream unreachable' });
  } finally {
    clearTimeout(timer);
  }
};

exports._test = {
  setNow: ms => { nowOverride = ms; },
  setTimeoutMs: ms => { timeoutOverride = ms; },
};
