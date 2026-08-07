// Overpass-JSON (out geom) → kompaktes GeoJSON. Rundung auf 5 Dezimalstellen (~1 m),
// Douglas-Peucker-Vereinfachung, Entfernen aufeinanderfolgender Duplikate.
import fs from 'fs';

const P = 5;                 // Dezimalstellen
const EPS = +(process.env.EPS || 0.00015);   // Toleranz für Douglas-Peucker (~0.00015 ≈ 15 m)

const rnd = v => +v.toFixed(P);

// Perpendicular-distance Douglas-Peucker auf [ [lon,lat], ... ]
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let dmax = 0, idx = 0;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1e-12;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    const t = ((px - ax) * dx + (py - ay) * dy) / len2;
    const cx = ax + t * dx, cy = ay + t * dy;
    const d = Math.hypot(px - cx, py - cy);
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax > eps) {
    const left = rdp(pts.slice(0, idx + 1), eps);
    const right = rdp(pts.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }
  return [pts[0], pts[pts.length - 1]];
}

function cleanLine(coords) {
  let pts = coords.map(([lon, lat]) => [rnd(lon), rnd(lat)]);
  // aufeinanderfolgende Duplikate entfernen
  pts = pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
  if (pts.length >= 3) pts = rdp(pts, EPS);
  return pts;
}

// Overpass "geometry" [{lat,lon}] → [[lon,lat]]
const geomToCoords = g => (g || []).map(n => [n.lon, n.lat]);

// Segmente zu MultiLineStrings gruppieren (nach Property-Signatur) → wenige Leaflet-Objekte
// statt Tausender Einzel-Polylines. groupKey bestimmt die Gruppierung.
export function waysToLineFC(elements, keepProps, groupKey) {
  const groups = new Map();
  for (const el of elements) {
    if (el.type !== 'way' || !el.geometry) continue;
    const coords = cleanLine(geomToCoords(el.geometry));
    if (coords.length < 2) continue;
    const props = {};
    if (keepProps) for (const k of keepProps) { const v = el.tags?.[k]; if (v != null) props[k] = v; }
    const key = groupKey ? String(groupKey(el.tags || {})) : '_';
    if (!groups.has(key)) groups.set(key, { props, parts: [] });
    groups.get(key).parts.push(coords);
  }
  const features = [];
  for (const { props, parts } of groups.values()) {
    features.push({ type: 'Feature', properties: props, geometry: { type: 'MultiLineString', coordinates: parts } });
  }
  return { type: 'FeatureCollection', features };
}

// CLI: node process.mjs <in.json> <out.json> line <prop1,prop2> [voltageMin]
const [, , inF, outF, kind, propStr, extra] = process.argv;
const raw = JSON.parse(fs.readFileSync(inF, 'utf8'));
let els = raw.elements || [];
const props = propStr ? propStr.split(',').filter(Boolean) : [];

if (extra && kind === 'line') {  // voltage-Filter für Stromleitungen
  const vmin = +extra;
  els = els.filter(e => {
    const v = e.tags?.voltage; if (!v) return false;
    return String(v).split(';').some(x => +x >= vmin);
  });
}

// Gruppierung: motorways nach ref (A1, A2, …) / S-refs; powerlines nach Spannungsklasse; rail alles zusammen
let groupKey = null;
if (kind === 'line' && propStr === 'ref') groupKey = t => t.ref || '?';
else if (kind === 'line' && extra) groupKey = t => {   // powerlines: Spannungsklasse
  const v = Math.max(...String(t.voltage || '0').split(';').map(Number));
  return v >= 220000 ? 'hv' : 'mv';   // ≥220 kV vs 110 kV
};
const fc = waysToLineFC(els, props, groupKey);
const out = JSON.stringify(fc);
fs.writeFileSync(outF, out);
console.error(`${outF}: ${fc.features.length} features, ${out.length} bytes (${(out.length/1e6).toFixed(2)} MB)`);
