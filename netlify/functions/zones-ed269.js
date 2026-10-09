// SkyCheck — generischer ED-269-Zonenprovider für Luxemburg, Norwegen, Estland.
// Liest data/uas-zones-<cc>.json (reines Array, erzeugt von scripts/build-eu-zones.mjs)
// einmal pro warmer Instanz und liefert dieselbe Zonenform wie zones-at.js:
//   { name, type, lower, upper, legal, legalUrl, color, desc, geometry }
// Unterschiede zu zones-at.js: Name aus `name` (message ist hier ein Langtext), exakter
// Flächentest statt reinem Bounding-Box-Filter, `info: true` bei NO_RESTRICTION.
// Quellen: LU Direction de l'Aviation Civile (CC0) · NO Luftfartstilsynet/dronesoner.no
// (NLOD 2.0) · EE EANS. Auto-Update: .github/workflows/update-eu-zones.yml

const fs = require('fs');
const path = require('path');

const COUNTRIES = { lu: 'LU', no: 'NO', ee: 'EE' };
const M_PER_DEG = 111320;
const cache = {};
const INACTIVE_COLOR = '#64748b';

// "Jetzt" läuft über eine Stelle, damit Tests die Uhr setzen können.
let nowOverride = null;
const now = () => (nowOverride === null ? Date.now() : nowOverride);

function findDataFile(cc) {
  const name = `uas-zones-${cc}.json`;
  const candidates = [
    process.env.SKYCHECK_DATA_DIR && path.join(process.env.SKYCHECK_DATA_DIR, name),
    path.join(__dirname, '..', '..', 'data', name),
    path.join(__dirname, 'data', name),
    path.join(process.cwd(), 'data', name),
  ].filter(Boolean);
  for (const p of candidates) {
    try { fs.statSync(p); return p; } catch (_) {}
  }
  throw new Error(`${name} not found in any expected location`);
}

function volumeBBox(g) {
  const hp = g.horizontalProjection;
  if (!hp) return null;
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  if (hp.type === 'Polygon') {
    for (const [lon, lat] of (hp.coordinates && hp.coordinates[0]) || []) {
      if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon;
    }
  } else if (hp.type === 'Circle' && Array.isArray(hp.center)) {
    const [lon, lat] = hp.center;
    const dLat = (hp.radius || 0) / M_PER_DEG;
    const dLon = dLat / Math.max(0.01, Math.cos(lat * Math.PI / 180));
    minLat = lat - dLat; maxLat = lat + dLat; minLon = lon - dLon; maxLon = lon + dLon;
  }
  return isFinite(minLat) ? { minLat, maxLat, minLon, maxLon } : null;
}

function loadZones(cc) {
  if (cache[cc]) return cache[cc];
  let raw = fs.readFileSync(findDataFile(cc), 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  const data = JSON.parse(raw);
  const feats = Array.isArray(data) ? data : (data.features || []);
  cache[cc] = feats.map(f => {
    const boxes = (f.geometry || []).map(volumeBBox).filter(Boolean);
    if (!boxes.length) return null;
    return {
      f,
      bbox: {
        minLat: Math.min(...boxes.map(b => b.minLat)), maxLat: Math.max(...boxes.map(b => b.maxLat)),
        minLon: Math.min(...boxes.map(b => b.minLon)), maxLon: Math.max(...boxes.map(b => b.maxLon)),
      },
    };
  }).filter(Boolean);
  return cache[cc];
}

// ── Exakter Flächentest ────────────────────────────────────────────────────
function pointInRing(lat, lon, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Kleinster Abstand (Meter) vom Punkt zu den Kanten eines Rings; lokale Ebene um den Punkt.
function distToRingM(lat, lon, ring) {
  const kx = Math.cos(lat * Math.PI / 180) * M_PER_DEG;
  let best = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const ax = (ring[i][0] - lon) * kx, ay = (ring[i][1] - lat) * M_PER_DEG;
    const bx = (ring[i + 1][0] - lon) * kx, by = (ring[i + 1][1] - lat) * M_PER_DEG;
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best) best = d;
  }
  return best;
}

// Trifft die Geometrie {type:'Polygon'|'Circle',…} den Punkt oder liegt sie im Suchradius?
function hitsPoint(geom, lat, lon, radiusM) {
  if (geom.type === 'Polygon') {
    const rings = geom.coordinates || [];
    if (!rings[0]) return false;
    const inside = pointInRing(lat, lon, rings[0]) && !rings.slice(1).some(h => pointInRing(lat, lon, h));
    return inside || rings.some(r => distToRingM(lat, lon, r) <= radiusM);
  }
  if (geom.type === 'Circle' && Array.isArray(geom.center)) {
    const kx = Math.cos(lat * Math.PI / 180) * M_PER_DEG;
    const d = Math.hypot((geom.center[0] - lon) * kx, (geom.center[1] - lat) * M_PER_DEG);
    return d <= (geom.radius || 0) + radiusM;
  }
  return false;
}

// ── Normalisierung ─────────────────────────────────────────────────────────
function zoneColor(restriction) {
  switch (restriction) {
    case 'PROHIBITED':        return '#ef4444';
    case 'REQ_AUTHORISATION': return '#f59e0b';
    case 'CONDITIONAL':       return '#f97316';
    case 'NO_RESTRICTION':    return '#22c55e';
    default:                  return '#64748b';
  }
}

function formatAlt(value, ref, uom) {
  if (value === undefined || value === null || value === '') return '—';
  if (Number(value) === 0 && (ref === 'AGL' || ref === 'SFC')) return 'GND';
  return `${Math.round(Number(value))} ${uom === 'FT' ? 'ft' : 'm'} ${ref || ''}`.trim();
}

function geometryOf(f) {
  return (f.geometry || []).map(g => {
    const hp = g.horizontalProjection;
    if (!hp) return null;
    if (hp.type === 'Polygon') return { type: 'Polygon', coordinates: hp.coordinates };
    if (hp.type === 'Circle' && Array.isArray(hp.center)) return { type: 'Circle', center: hp.center, radius: hp.radius || 0 };
    return null;
  }).filter(Boolean);
}

function localizedMessage(f, lang) {
  const msgs = (f.extendedProperties && f.extendedProperties.localizedMessages) || [];
  const pick = code => {
    const m = msgs.find(x => String(x.language || '').toLowerCase().startsWith(code));
    return m && m.message ? m.message : null;
  };
  return pick(lang) || pick('en') || f.message || '';
}

// Befristete Zonen, deren Aktivierungsfenster alle vorbei sind, bleiben sichtbar, gelten aber
// nicht als aktuell gesperrt. Liefert das späteste Fensterende (ms) oder null, wenn die Zone
// nicht inaktiv ist (keine Fenster, ein Fenster ohne lesbares Ende, oder ein Ende in der Zukunft).
function inactiveSince(f) {
  const windows = f.applicability;
  if (!Array.isArray(windows) || !windows.length) return null;
  let latest = -Infinity;
  for (const w of windows) {
    const end = Date.parse(w && w.endDateTime);
    if (!isFinite(end) || end >= now()) return null;
    if (end > latest) latest = end;
  }
  return latest;
}

function normalizeLight(f) {
  const restriction = f.restriction || '';
  const z = {
    name: f.name || f.identifier || '—',
    type: restriction || 'UAS_ZONE',
    color: zoneColor(restriction),
    geometry: geometryOf(f),
  };
  const endedAt = inactiveSince(f);
  if (endedAt !== null) {
    z.inactive = true;
    z.type = 'TEMPORARY_INACTIVE';
    z.color = INACTIVE_COLOR;
  } else if (restriction === 'NO_RESTRICTION') z.info = true;
  return z;
}

function describe(f, light, lang) {
  const text = localizedMessage(f, lang);
  if (!light.inactive) return text;
  const ended = new Date(inactiveSince(f)).toISOString().slice(0, 10);
  const note = `Activation window ended ${ended}. May be reactivated — check the official source.`;
  return text ? `${note} ${text}` : note;
}

function normalize(f, lang) {
  const light = normalizeLight(f);
  const g0 = (f.geometry && f.geometry[0]) || {};
  const auth = (Array.isArray(f.zoneAuthority) && f.zoneAuthority[0]) || {};
  const z = {
    name: light.name,
    type: light.type,
    lower: formatAlt(g0.lowerLimit, g0.lowerVerticalReference, g0.uomDimensions),
    upper: formatAlt(g0.upperLimit, g0.upperVerticalReference, g0.uomDimensions),
    legal: auth.name || '—',
    legalUrl: /^https?:\/\//i.test(auth.siteURL || '') ? auth.siteURL : '',
    desc: describe(f, light, lang),
    color: light.color,
    geometry: light.geometry,
  };
  if (light.info) z.info = true;
  if (light.inactive) z.inactive = true;
  return z;
}

const json = (statusCode, body, maxAge) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': `public, max-age=${maxAge}`,
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const cc = String(qs.country || '').toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(COUNTRIES, cc)) return { statusCode: 400, body: 'Unknown country' };

  let zones;
  try { zones = loadZones(cc); }
  catch (e) { return { statusCode: 500, body: 'Data file unavailable' }; }

  if (qs.all === '1' || qs.all === 'true') {
    return json(200, { country: COUNTRIES[cc], all: true, zones: zones.map(z => normalizeLight(z.f)) }, 3600);
  }

  const lat = parseFloat(qs.lat), lon = parseFloat(qs.lon);
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return { statusCode: 400, body: 'Missing or invalid lat/lon' };
  }
  const radiusM = Math.min(5000, Math.max(1, parseFloat(qs.radius) || 100));
  const lang = /^[a-z]{2}$/i.test(qs.lang || '') ? qs.lang.toLowerCase() : 'en';

  const dLat = radiusM / M_PER_DEG;
  const dLon = dLat / Math.max(0.01, Math.cos(lat * Math.PI / 180));
  const hits = [];
  for (const z of zones) {
    const b = z.bbox;
    if (b.minLat > lat + dLat || b.maxLat < lat - dLat || b.minLon > lon + dLon || b.maxLon < lon - dLon) continue;
    const n = normalize(z.f, lang);
    if (n.geometry.some(g => hitsPoint(g, lat, lon, radiusM))) hits.push(n);
  }
  // einschränkende Zonen zuerst, dann inaktive, dann reine Info-Zonen (stabil innerhalb der Gruppe)
  const rank = z => (z.info ? 2 : z.inactive ? 1 : 0);
  hits.sort((a, b) => rank(a) - rank(b));
  return json(200, { country: COUNTRIES[cc], zones: hits.slice(0, 50) }, 300);
};

exports._test = {
  hitsPoint,
  setNow: ms => { nowOverride = ms; },
  resetCache: () => { for (const k of Object.keys(cache)) delete cache[k]; },
};
