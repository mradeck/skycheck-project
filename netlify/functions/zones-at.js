// SkyCheck — Austria UAS zones provider (Austro Control ED-269 JSON)
// Reads data/uas-zones-at.json once per warm instance, filters by bbox, returns
// normalized { name, type, lower, upper, legal, legalUrl, color, desc, geometry }.
// Datenquelle: Austro Control dronespace.at (ED-269). Datei ist ein reines Array von
// Zonen (kein { features }-Wrapper wie FR). Auto-Update via GitHub Actions.

const fs = require('fs');
const path = require('path');

let cachedZones = null;

function findDataFile() {
  const candidates = [
    path.join(__dirname, '..', '..', 'data', 'uas-zones-at.json'),
    path.join(__dirname, 'data', 'uas-zones-at.json'),
    path.join(process.cwd(), 'data', 'uas-zones-at.json'),
  ];
  for (const p of candidates) {
    try { fs.statSync(p); return p; } catch (_) {}
  }
  throw new Error('uas-zones-at.json not found in any expected location');
}

function loadZones() {
  if (cachedZones) return cachedZones;
  const filePath = findDataFile();
  let raw = fs.readFileSync(filePath, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // strip BOM
  const data = JSON.parse(raw);
  // ED-269 kann als Array, { features }, { UASZoneVersion } oder { zones } kommen.
  const feats = Array.isArray(data)
    ? data
    : (data.features || data.UASZoneVersion || data.zones || []);
  cachedZones = feats.map(f => ({ f, bbox: featureBBox(f) })).filter(x => x.bbox);
  return cachedZones;
}

function featureBBox(f) {
  const geoms = f.geometry || [];
  if (!geoms.length) return null;
  let minLat = +Infinity, maxLat = -Infinity, minLon = +Infinity, maxLon = -Infinity;
  for (const g of geoms) {
    const hp = g.horizontalProjection;
    if (!hp) continue;
    if (hp.type === 'Polygon') {
      for (const ring of hp.coordinates) {
        for (const [lon, lat] of ring) {
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
        }
      }
    } else if (hp.type === 'Circle' && Array.isArray(hp.center)) {
      const [lon, lat] = hp.center;
      const r = (hp.radius || 0) / 111320; // meters → degrees (approx, lat)
      if (typeof lat === 'number' && typeof lon === 'number') {
        if (lat - r < minLat) minLat = lat - r;
        if (lat + r > maxLat) maxLat = lat + r;
        if (lon - r < minLon) minLon = lon - r;
        if (lon + r > maxLon) maxLon = lon + r;
      }
    }
  }
  if (!isFinite(minLat)) return null;
  return { minLat, maxLat, minLon, maxLon };
}

function bboxOverlap(a, b) {
  return a.minLat <= b.maxLat && a.maxLat >= b.minLat
      && a.minLon <= b.maxLon && a.maxLon >= b.minLon;
}

function zoneColor(restriction) {
  switch (restriction) {
    case 'PROHIBITED':         return '#ef4444';
    case 'REQ_AUTHORISATION':  return '#f59e0b';
    case 'CONDITIONAL':        return '#f97316';
    case 'NO_RESTRICTION':     return '#22c55e';
    default:                   return '#64748b';
  }
}

function formatAlt(value, ref, uom) {
  if (value === undefined || value === null || value === '') return '—';
  if (value === 0 && (ref === 'AGL' || ref === 'SFC')) return 'GND';
  const unit = (uom === 'FT') ? 'ft' : 'm';
  return `${Math.round(value)} ${unit} ${ref || ''}`.trim();
}

// Lokalisierte Detailbeschreibung in gewünschter Sprache (Fallback: en → erste vorhandene).
function localizedMessage(f, lang) {
  const ext = f.extendedProperties || {};
  const msgs = ext.localizedMessages || [];
  const want = (lang === 'de') ? 'de-AT' : lang;
  const pick = (code) => {
    const m = msgs.find(x => (x.language || '').toLowerCase() === code.toLowerCase());
    return m && m.message ? m.message : null;
  };
  return pick(want) || pick('en') || pick('de-AT') || (msgs[0] && msgs[0].message) || f.message || '';
}

function normalize(f, lang) {
  const restriction = f.restriction || '';
  const ext = f.extendedProperties || {};
  const g0 = (f.geometry && f.geometry[0]) || {};
  const lower = formatAlt(g0.lowerLimit, g0.lowerVerticalReference, g0.uomDimensions);
  const upper = formatAlt(g0.upperLimit, g0.upperVerticalReference, g0.uomDimensions);

  // Kurzer, menschenlesbarer Zonenname; ICAO-Code als Fallback.
  const name = f.message || f.name || f.identifier || '—';
  const legal = ext.legalBasis || '—';
  const legalUrl = ext.legalBasisURL || '';
  const desc = localizedMessage(f, lang);

  const geometry = (f.geometry || []).map(g => {
    const hp = g.horizontalProjection;
    if (!hp) return null;
    if (hp.type === 'Polygon') return { type: 'Polygon', coordinates: hp.coordinates };
    if (hp.type === 'Circle' && Array.isArray(hp.center)) return { type: 'Circle', center: hp.center, radius: hp.radius || 0 };
    return null;
  }).filter(Boolean);

  return {
    name,
    type: restriction || 'UAS_ZONE',
    lower,
    upper,
    legal,
    legalUrl,
    desc,
    color: zoneColor(restriction),
    geometry,
  };
}

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const lat = parseFloat(qs.lat);
  const lon = parseFloat(qs.lon);
  const radiusM = parseFloat(qs.radius) || 100;
  const lang = /^[a-z]{2}$/i.test(qs.lang || '') ? qs.lang.toLowerCase() : 'en';
  if (!isFinite(lat) || !isFinite(lon)) {
    return { statusCode: 400, body: 'Missing lat/lon' };
  }

  let zones;
  try {
    zones = loadZones();
  } catch (e) {
    return { statusCode: 500, body: 'Data file unavailable' };
  }

  const δ = Math.max(0.001, radiusM / 111320);
  const queryBox = { minLat: lat - δ, maxLat: lat + δ, minLon: lon - δ, maxLon: lon + δ };

  const hits = [];
  for (const z of zones) {
    if (bboxOverlap(z.bbox, queryBox)) {
      hits.push(normalize(z.f, lang));
      if (hits.length >= 50) break; // safety cap
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
    body: JSON.stringify({ country: 'AT', zones: hits }),
  };
};
