// OSM Schutzgebiete (Overpass out geom) → kompaktes Polygon-GeoJSON, nach Kategorie gebündelt.
// Ways = geschlossene Ringe; Relationen = outer-Member zu Ringen zusammengesetzt (Löcher ignoriert,
// da reines Kontext-Overlay). Rundung 5 Dezimalstellen + RDP-Vereinfachung.
import fs from 'fs';

const P = 5, EPS = 0.0002;   // ~20 m — Flächen dürfen gröber sein
const rnd = v => +v.toFixed(P);
const key = (lon, lat) => rnd(lon) + ',' + rnd(lat);

function rdpRing(pts, eps) {
  if (pts.length < 4) return pts;
  const rec = (s, e) => {
    let dmax = 0, idx = -1;
    const [ax, ay] = pts[s], [bx, by] = pts[e];
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1e-12;
    for (let i = s + 1; i < e; i++) {
      const [px, py] = pts[i];
      const t = ((px - ax) * dx + (py - ay) * dy) / len2;
      const cx = ax + t * dx, cy = ay + t * dy;
      const d = Math.hypot(px - cx, py - cy);
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax > eps && idx > 0) return [...rec(s, idx).slice(0, -1), ...rec(idx, e)];
    return [pts[s], pts[e]];
  };
  const out = rec(0, pts.length - 1);
  if (out.length < 4) return pts.slice(0, 4);   // Mindest-Ring
  return out;
}

const round = ring => ring.map(([lon, lat]) => [rnd(lon), rnd(lat)]);
const closed = r => r.length > 3 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1];

// outer-Member-Ways zu geschlossenen Ringen zusammensetzen
function stitch(ways) {
  const segs = ways.map(w => w.map(n => [n.lon, n.lat])).filter(s => s.length >= 2);
  const rings = [];
  const used = new Array(segs.length).fill(false);
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    let ring = segs[i].slice(); used[i] = true;
    let extended = true;
    while (extended && !(key(...ring[0]) === key(...ring[ring.length - 1]) && ring.length > 3)) {
      extended = false;
      const tail = key(...ring[ring.length - 1]);
      for (let j = 0; j < segs.length; j++) {
        if (used[j]) continue;
        const s = segs[j], a = key(...s[0]), b = key(...s[s.length - 1]);
        if (a === tail) { ring = ring.concat(s.slice(1)); used[j] = true; extended = true; break; }
        if (b === tail) { ring = ring.concat(s.slice().reverse().slice(1)); used[j] = true; extended = true; break; }
      }
    }
    if (ring.length >= 4) {
      let r = round(ring);
      if (!closed(r)) r.push(r[0]);
      r = rdpRing(r, EPS);
      if (!closed(r)) r.push(r[0]);
      if (r.length >= 4) rings.push(r);
    }
  }
  return rings;
}

// Kategorie-Bucket aus OSM-Tags. Nur drohnenrelevante Naturschutz-Kategorien; Jagd-/Zugangszonen raus.
function category(t) {
  const s = (t.protection_title || '') + ' ' + (t.boundary || '') + ' ' + (t.protect_title || '');
  const pc = String(t.protect_class || '');
  if (t.boundary === 'national_park' || /Nationalpark/i.test(s) || pc === '2') return 'NP';
  if (/Natura\s?2000|Fauna.?Flora|Vogelschutz|Europaschutz|Europa-?Fauna|FFH/i.test(s)) return 'N2000';
  if (/Naturschutzgebiet/i.test(s) || pc === '1' || pc === '4') return 'NSG';
  if (/Nationalpark/i.test(s)) return 'NP';
  if (/Biosph/i.test(s)) return 'BP';
  if (/Naturpark/i.test(s)) return 'NAP';
  if (/Landschaftsschutzgebiet/i.test(s) || pc === '5') return 'LSG';
  if (/Geschützter Landschaftsteil|geschützter landschaftsteil/i.test(s)) return 'GLT';
  if (/Naturdenkmal/i.test(s)) return 'ND';
  return null;   // uninteressant (Wildruhe, Wegegebot, Bergwelt Tirol, Schongebiet, Quellschutz …)
}

const raw = JSON.parse(fs.readFileSync('/tmp/at_prot_raw.json', 'utf8'));
const buckets = {};   // cat → { name→polygons }  (MultiPolygon je Kategorie)
let kept = 0, skipped = 0;

for (const el of raw.elements || []) {
  const cat = category(el.tags || {});
  if (!cat) { skipped++; continue; }
  let rings = [];
  if (el.type === 'way' && el.geometry) {
    const r0 = round(el.geometry.map(n => [n.lon, n.lat]));
    if (r0.length >= 4) { let r = rdpRing(closed(r0) ? r0 : [...r0, r0[0]], EPS); if (!closed(r)) r.push(r[0]); if (r.length >= 4) rings = [r]; }
  } else if (el.type === 'relation' && el.members) {
    const outer = el.members.filter(m => m.type === 'way' && (m.role === 'outer' || m.role === '') && m.geometry).map(m => m.geometry);
    rings = stitch(outer);
  }
  if (!rings.length) { skipped++; continue; }
  (buckets[cat] ||= []).push(...rings.map(r => [r]));   // je Ring ein Polygon (ohne Löcher)
  kept++;
}

const CAT_LABEL = { NP: 'Nationalpark', N2000: 'Natura 2000', NSG: 'Naturschutzgebiet', LSG: 'Landschaftsschutzgebiet', NAP: 'Naturpark', BP: 'Biosphärenpark', GLT: 'Geschützter Landschaftsteil', ND: 'Naturdenkmal' };
const features = Object.entries(buckets).map(([cat, polys]) => ({
  type: 'Feature', properties: { cat, label: CAT_LABEL[cat] || cat },
  geometry: { type: 'MultiPolygon', coordinates: polys },
}));
const fc = { type: 'FeatureCollection', features };
const out = JSON.stringify(fc);
fs.writeFileSync('at-protected.json', out);
console.error(`at-protected.json: ${features.length} Kategorien, kept=${kept} skipped=${skipped}, ${(out.length/1e6).toFixed(2)} MB`);
features.forEach(f => console.error(`  ${f.properties.cat} (${f.properties.label}): ${f.geometry.coordinates.length} Polygone`));
