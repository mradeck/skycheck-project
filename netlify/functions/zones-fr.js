// SkyCheck — France UAS zones provider (ED-269 JSON)
// Reads data/uas-zones-fr.json once per warm instance, filters by bbox, returns
// normalized { name, type, lower, upper, legal, color } shape.

const fs = require('fs');
const path = require('path');

let cachedZones = null;
let cachedTitle = null;

function findDataFile() {
  const candidates = [
    path.join(__dirname, '..', '..', 'data', 'uas-zones-fr.json'),
    path.join(__dirname, 'data', 'uas-zones-fr.json'),
    path.join(process.cwd(), 'data', 'uas-zones-fr.json'),
  ];
  for (const p of candidates) {
    try { fs.statSync(p); return p; } catch (_) {}
  }
  throw new Error('uas-zones-fr.json not found in any expected location');
}

function loadZones() {
  if (cachedZones) return cachedZones;
  const filePath = findDataFile();
  let raw = fs.readFileSync(filePath, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // strip BOM
  const data = JSON.parse(raw);
  cachedTitle = data.title || '';
  const feats = data.features || [];
  cachedZones = feats.map(f => {
    const bbox = featureBBox(f);
    return { f, bbox };
  }).filter(x => x.bbox);
  return cachedZones;
}

function featureBBox(f) {
  if (!f.geometry || f.geometry.length === 0) return null;
  let minLat = +Infinity, maxLat = -Infinity, minLon = +Infinity, maxLon = -Infinity;
  for (const g of f.geometry) {
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
    } else if (hp.type === 'Circle') {
      const [lon, lat] = hp.center || [];
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

const RESTRICTION_LABEL = {
  PROHIBITED: 'PROHIBITED',
  CONDITIONAL: 'CONDITIONAL',
  REQ_AUTHORISATION: 'REQ_AUTHORISATION',
};

function zoneColor(restriction) {
  switch (restriction) {
    case 'PROHIBITED':         return '#ef4444';
    case 'REQ_AUTHORISATION':  return '#f59e0b';
    case 'CONDITIONAL':        return '#f97316';
    default:                   return '#64748b';
  }
}

function formatAlt(value, ref, uom) {
  if (value === undefined || value === null || value === '') return '—';
  if (value === 0 && (ref === 'AGL' || ref === 'SFC')) return 'GND';
  const unit = (uom === 'FT') ? 'ft' : 'm';
  return `${Math.round(value)} ${unit} ${ref || ''}`.trim();
}

function normalize(f) {
  const restriction = f.restriction || '';
  const reason = Array.isArray(f.reason) ? f.reason.join(', ') : (f.reason || '');
  const country = f.country || '';
  const exempt = f.regulationExemption || '';
  const note = f.otherReasonInfo || '';

  const g0 = (f.geometry && f.geometry[0]) || {};
  const lower = formatAlt(g0.lowerLimit, g0.lowerVerticalReference, g0.uomDimensions);
  const upper = formatAlt(g0.upperLimit, g0.upperVerticalReference, g0.uomDimensions);

  const legalParts = [];
  if (reason) legalParts.push(reason);
  if (note) legalParts.push(note);
  if (exempt) legalParts.push(exempt);
  const legal = legalParts.length ? legalParts.join(' · ') : '—';

  const typeLabel = RESTRICTION_LABEL[restriction] || (restriction || 'UAS_ZONE');

  // Geometry für Map-Overlay (Leaflet-Renderer auf Client-Seite)
  // GeoJSON-Koordinaten bleiben [lon, lat]; Client konvertiert für L.polygon/L.circle.
  const geometry = (f.geometry || []).map(g => {
    const hp = g.horizontalProjection;
    if (!hp) return null;
    if (hp.type === 'Polygon') {
      return { type: 'Polygon', coordinates: hp.coordinates };
    }
    if (hp.type === 'Circle' && Array.isArray(hp.center)) {
      return { type: 'Circle', center: hp.center, radius: hp.radius || 0 };
    }
    return null;
  }).filter(Boolean);

  return {
    name: (f.name || f.identifier || '—') + (country ? ` [${country}]` : ''),
    type: typeLabel,
    lower,
    upper,
    legal,
    color: zoneColor(restriction),
    geometry,
  };
}

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const lat = parseFloat(qs.lat);
  const lon = parseFloat(qs.lon);
  const radiusM = parseFloat(qs.radius) || 100;
  if (!isFinite(lat) || !isFinite(lon)) {
    return { statusCode: 400, body: 'Missing lat/lon' };
  }

  let zones;
  try {
    zones = loadZones();
  } catch (e) {
    return { statusCode: 500, body: 'Data file unavailable: ' + e.message };
  }

  // Query bbox: ±(radius in degrees, latitude-aligned)
  const δ = Math.max(0.001, radiusM / 111320);
  const queryBox = {
    minLat: lat - δ,
    maxLat: lat + δ,
    minLon: lon - δ,
    maxLon: lon + δ,
  };

  const hits = [];
  for (const z of zones) {
    if (bboxOverlap(z.bbox, queryBox)) {
      hits.push(normalize(z.f));
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
    body: JSON.stringify({ title: cachedTitle, zones: hits }),
  };
};
