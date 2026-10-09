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
const SOON_MS = 24 * 60 * 60 * 1000;                    // beginnt es binnen 24 h, gilt es schon als aktiv
const INACTIVE_COLOR = '#64748b';
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

// Zeitstempel als "YYYY-MM-DD HH:mm" (UTC); null bei unlesbarem Wert.
const stamp = v => {
  const ms = Date.parse(v);
  return isFinite(ms) ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ') : null;
};

// "Valid <von> – <bis> UTC." (jede lesbare Grenze), dazu " Schedule: <Zeitplan>.", dann der Beschreibungstext.
function describeValidity(from, to, schedule, body) {
  const a = stamp(from), b = stamp(to);
  const parts = [];
  if (a && b) parts.push(`Valid ${a} – ${b} UTC.`);
  else if (a) parts.push(`Valid from ${a} UTC.`);
  else if (b) parts.push(`Valid until ${b} UTC.`);
  if (text(schedule)) parts.push(`Schedule: ${text(schedule)}.`);
  if (text(body)) parts.push(text(body));
  return parts.join(' ');
}

// Einstufung nach Code: RD und W… bedingt; jedes andere R… (RP, RR, RT, RA, RM, RO, …) gesperrt.
const notamType = code => {
  const c = text(code).toUpperCase();
  if (c === 'RD' || c.startsWith('W')) return 'CONDITIONAL';
  return c.startsWith('R') ? 'PROHIBITED' : 'CONDITIONAL';
};

function notamZone(feature) {
  const p = (feature && feature.properties) || {};
  if (p.LOWER === null || p.LOWER === undefined || text(p.LOWER) === '' || Number(p.LOWER) !== 0) return null;  // nur Gebiete ab Boden (0 oder "0")
  const geometry = polygonsOf(feature && feature.geometry);
  if (!geometry.length) return null;
  const t = now();
  const start = Date.parse(p.STARTVALIDITY), end = Date.parse(p.ENDVALIDITY);
  if (isFinite(end) && end < t) return null;            // abgelaufen
  const notYet = isFinite(start) && start > t + SOON_MS;
  let type = notamType(p.CODE23), color = COLORS[type], desc = describeValidity(p.STARTVALIDITY, p.ENDVALIDITY, p.ITEM_D, p.ITEM_E);
  if (notYet) {
    type = 'TEMPORARY_INACTIVE';
    color = INACTIVE_COLOR;
    desc = `Not yet active — starts ${stamp(p.STARTVALIDITY)} UTC. ${desc}`;
  }
  const z = {
    name: `NOTAM ${text(p.SERIES)}${text(p.NO)}/${text(p.YEAR)}`,
    type,
    lower: text(p.ITEM_F) || 'GND',
    upper: text(p.ITEM_G) || '—',
    legal: 'NOTAM',
    legalUrl: CHART_URL,
    desc,
    color,
    geometry,
    notam: true,
  };
  if (notYet) z.inactive = true;
  return z;
}

// Gültig, solange keine lesbare Grenze verletzt ist; unlesbare Daten blenden die Zone nicht aus.
function supIsValid(p) {
  const from = Date.parse(p.FROM), to = Date.parse(p.TO);
  const t = now();
  if (isFinite(from) && from > t) return false;
  if (isFinite(to) && to < t) return false;
  return true;
}

// Untergrenze: Boden (GND/SFC/0) oder höchstens 120 m (≤ 400 ft) über Grund bleibt; Flugfläche
// oder höher entfällt (wie Belgiens 120-m-Regel); nicht Lesbares bleibt.
function supLowerOk(lower, uom) {
  const s = `${text(lower)} ${text(uom)}`.trim();
  if (/^FL\s*\d/i.test(s)) return false;
  if (/^(GND|SFC)\b/i.test(s)) return true;
  const m = /^(\d+(?:[.,]\d+)?)\s*(ft|m)?\b(.*)$/i.exec(s);
  if (!m) return true;
  const value = Number(m[1].replace(',', '.'));
  if (value === 0) return true;
  const unit = (m[2] || (/\b(ft|m)\b/i.exec(m[3]) || [])[1] || '').toLowerCase();
  if (unit === 'ft') return value <= 400;
  if (unit === 'm') return value <= 120;
  return true;
}

const withUnit = (value, uom) => {
  const v = text(value);
  if (!v) return '—';
  return text(uom) ? `${v} ${text(uom)}` : v;
};

// Der Client schreibt legalUrl mit encodeURI; die Rohwerte enthalten schon %20 → einmal dekodieren,
// damit encodeURI wieder das Original ergibt. Nur http(s); sonst Karten-URL.
function supLegalUrl(raw) {
  const u = text(raw);
  if (!/^https?:\/\//i.test(u)) return CHART_URL;
  try { return decodeURI(u); } catch (_) { return CHART_URL; }
}

function supZone(feature) {
  const p = (feature && feature.properties) || {};
  if (!supIsValid(p)) return null;
  if (!supLowerOk(p.LOWER, p.LOW_UOM)) return null;
  const geometry = polygonsOf(feature && feature.geometry);
  if (!geometry.length) return null;
  return {
    name: [text(p.DESIG), text(p.NAME)].filter(Boolean).join(' ') || 'SUP',
    type: 'PROHIBITED',
    lower: withUnit(p.LOWER, p.LOW_UOM),
    upper: withUnit(p.UPPER, p.UP_UOM),
    legal: 'AIP SUP',
    legalUrl: supLegalUrl(p.URL),
    desc: describeValidity(p.FROM, p.TO, p.SCHEDULE, text(p.COM_EN) || text(p.COM_SE)),
    color: COLORS.PROHIBITED,
    geometry,
    notam: true,
  };
}

class UpstreamError extends Error {}

async function fetchFeatures(url, signal) {
  const res = await fetch(url, {
    signal,
    headers: { 'User-Agent': 'SkyCheck-NOTAM-Proxy/1.0 (+https://github.com/mradeck/skycheck-project)' },
  });
  if (!res.ok) throw new UpstreamError(`Upstream HTTP ${res.status}`);
  let body;
  try { body = await res.text(); }
  catch (e) { throw signal.aborted ? e : new UpstreamError('Upstream body unreadable'); }
  let data;
  try { data = JSON.parse(body); }
  catch (_) { throw new UpstreamError('Upstream returned invalid JSON'); }
  if (!data || !Array.isArray(data.features)) throw new UpstreamError('Upstream returned no feature list');
  return data.features;
}

exports.handler = async () => {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, timeoutOverride === null ? DEFAULT_TIMEOUT_MS : timeoutOverride);
  try {
    const [notams, sups] = await Promise.all([fetchFeatures(NOTAM_URL, ctrl.signal), fetchFeatures(SUP_URL, ctrl.signal)]);
    const zones = [...notams.map(notamZone), ...sups.map(supZone)].filter(Boolean);
    return json(200, { country: 'SE', fetchedAt: new Date().toISOString(), zones }, 300);
  } catch (e) {
    ctrl.abort();                                       // den zweiten Abruf nicht weiterlaufen lassen
    if (e instanceof UpstreamError) return json(502, { error: e.message });
    return json(502, { error: timedOut || (e && e.name === 'AbortError') ? 'Upstream timeout' : 'Upstream unreachable' });
  } finally {
    clearTimeout(timer);
  }
};

exports._test = {
  setNow: ms => { nowOverride = ms; },
  setTimeoutMs: ms => { timeoutOverride = ms; },
};
