#!/usr/bin/env node
// ============================================================================
// SkyCheck — Generator für die informativen Länder-Zusatzebenen (Kontext-Overlays)
// ----------------------------------------------------------------------------
// Erzeugt pro Land vier vorab vereinfachte, statische GeoJSON-Snapshots aus
// OpenStreetMap (ODbL) via Overpass:
//   <cc>-protected.json   Schutzgebiete (NP, Natura 2000, NSG, LSG, Naturparke,
//                         Biosphären, geschützte Landschaftsteile, Naturdenkmäler)
//   <cc>-motorways.json   Autobahnen/Schnellstraßen (highway=motorway|trunk)
//   <cc>-powerlines.json  Hochspannungsleitungen (power=line, ≥110 kV)
//   <cc>-rail.json        Bahn-Hauptstrecken (railway=rail, usage=main)
//
// Diese Ebenen sind rein INFORMATIVER Kontext (Abstandsregeln) und fließen NICHT
// in die Go/No-Go-Bewertung ein — verbindlich bleibt die jeweilige nationale
// Geozonen-Quelle. Deutschland ist ausgenommen (DiPUL liefert das bereits).
//
// NUTZUNG (für neue Länder-Versionen):
//   node scripts/gen-context.mjs <ISO2>            # z. B. ch, es, dk, ie, fr
//   node scripts/gen-context.mjs <ISO2> --lines-eps 0.0002 --poly-eps 0.0003
// Ausgabe landet in data/<cc>-*.json. Danach im Client zu CONTEXT_COUNTRIES
// hinzufügen (skycheck.html), sofern noch nicht enthalten.
//
// Hinweis: Overpass-Server sind oft ausgelastet → das Skript probiert mehrere
// Mirrors mit Wiederholung. Große Länder (ES/FR) brauchen ggf. höhere eps-Werte.
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

const args = process.argv.slice(2);
const CC = (args[0] || '').toLowerCase();
if (!/^[a-z]{2}$/.test(CC)) { console.error('Usage: node gen-context.mjs <ISO2> [--lines-eps N] [--poly-eps N] [--only layer]'); process.exit(1); }
const ISO = CC.toUpperCase();
const getOpt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const LINE_EPS = +getOpt('--lines-eps', 0.00015);   // ~15 m
const POLY_EPS = +getOpt('--poly-eps', 0.0002);     // ~20 m
const ONLY = getOpt('--only', null);                // optional: nur eine Ebene
const P = 5;                                        // Dezimalstellen (~1 m)

const MIRRORS = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.osm.jp/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function overpass(query) {
  for (let attempt = 0; attempt < 16; attempt++) {
    const ep = MIRRORS[attempt % MIRRORS.length];
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 290000);
      const r = await fetch(ep + '?data=' + encodeURIComponent(query), { signal: ctrl.signal });
      clearTimeout(to);
      const txt = await r.text();
      if (txt.trimStart().startsWith('{')) return JSON.parse(txt);
      console.error(`  [${ep}] busy/err (${txt.length}b), backoff…`);
    } catch (e) { console.error(`  [${ep}] ${e.message}, backoff…`); }
    await sleep(12000 + attempt * 3000);   // wachsendes Backoff gegen Rate-Limit
  }
  throw new Error('Overpass: alle Mirrors fehlgeschlagen');
}

// ---- Geometrie-Helfer ------------------------------------------------------
const rnd = v => +v.toFixed(P);
const kkey = (lon, lat) => rnd(lon) + ',' + rnd(lat);

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
  if (dmax > eps) return rdp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps));
  return [pts[0], pts[pts.length - 1]];
}
const cleanLine = coords => {
  let pts = coords.map(([lon, lat]) => [rnd(lon), rnd(lat)]).filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
  if (pts.length >= 3) pts = rdp(pts, LINE_EPS);
  return pts;
};
const geomCoords = g => (g || []).map(n => [n.lon, n.lat]);
const closed = r => r.length > 3 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1];
const roundRing = r => r.map(([lon, lat]) => [rnd(lon), rnd(lat)]);

function rdpRing(pts, eps) {
  if (pts.length < 5) return pts;
  const rec = (s, e) => {
    let dmax = 0, idx = -1;
    const [ax, ay] = pts[s], [bx, by] = pts[e];
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1e-12;
    for (let i = s + 1; i < e; i++) { const [px, py] = pts[i];
      const t = ((px - ax) * dx + (py - ay) * dy) / len2, cx = ax + t * dx, cy = ay + t * dy, d = Math.hypot(px - cx, py - cy);
      if (d > dmax) { dmax = d; idx = i; } }
    if (dmax > eps && idx > 0) return [...rec(s, idx).slice(0, -1), ...rec(idx, e)];
    return [pts[s], pts[e]];
  };
  const out = rec(0, pts.length - 1);
  return out.length < 4 ? pts.slice(0, 4) : out;
}
function stitch(ways) {
  const segs = ways.map(w => w.map(n => [n.lon, n.lat])).filter(s => s.length >= 2);
  const used = new Array(segs.length).fill(false), rings = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    let ring = segs[i].slice(); used[i] = true; let ext = true;
    while (ext && !(kkey(...ring[0]) === kkey(...ring[ring.length - 1]) && ring.length > 3)) {
      ext = false; const tail = kkey(...ring[ring.length - 1]);
      for (let j = 0; j < segs.length; j++) {
        if (used[j]) continue; const s = segs[j];
        if (kkey(...s[0]) === tail) { ring = ring.concat(s.slice(1)); used[j] = true; ext = true; break; }
        if (kkey(...s[s.length - 1]) === tail) { ring = ring.concat(s.slice().reverse().slice(1)); used[j] = true; ext = true; break; }
      }
    }
    if (ring.length >= 4) { let r = roundRing(ring); if (!closed(r)) r.push(r[0]); r = rdpRing(r, POLY_EPS); if (!closed(r)) r.push(r[0]); if (r.length >= 4) rings.push(r); }
  }
  return rings;
}

// ---- Verarbeitung je Ebene -------------------------------------------------
// Offene Segmente an gemeinsamen Endpunkten zu langen Polylinien verketten (greedy).
// Wichtig, damit die anschließende RDP-Vereinfachung über lange Linien statt kurzer
// OSM-Einzelsegmente wirkt — das reduziert die Größe großer Netze (ES/FR) drastisch.
function stitchLines(segs) {
  const byPt = new Map();   // Endpunkt-Key → Liste [segIdx, endeWelches]
  segs.forEach((s, i) => {
    for (const end of [0, s.length - 1]) {
      const k = kkey(...s[end]); if (!byPt.has(k)) byPt.set(k, []); byPt.get(k).push([i, end]);
    }
  });
  const used = new Array(segs.length).fill(false);
  const lines = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    let line = segs[i].slice();
    // an beiden Enden verlängern
    for (const dir of [1, 0]) {
      let ext = true;
      while (ext) {
        ext = false;
        const endPt = dir ? line[line.length - 1] : line[0];
        const cand = byPt.get(kkey(...endPt)) || [];
        for (const [j] of cand) {
          if (used[j]) continue;
          const s = segs[j], a = kkey(...s[0]), b = kkey(...s[s.length - 1]), e = kkey(...endPt);
          let add = null;
          if (a === e) add = s.slice(1); else if (b === e) add = s.slice().reverse().slice(1);
          if (!add) continue;
          used[j] = true;
          if (dir) line = line.concat(add); else line = add.slice().reverse().concat(line);
          ext = true; break;
        }
      }
    }
    lines.push(line);
  }
  return lines;
}

function linesToFC(elements, keepProps, groupKey) {
  const groups = new Map();
  for (const el of elements) {
    if (el.type !== 'way' || !el.geometry) continue;
    let pts = geomCoords(el.geometry).map(([lon, lat]) => [rnd(lon), rnd(lat)])
      .filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
    if (pts.length < 2) continue;
    const props = {}; for (const k of keepProps || []) { const v = el.tags?.[k]; if (v != null) props[k] = v; }
    const key = groupKey ? String(groupKey(el.tags || {})) : '_';
    if (!groups.has(key)) groups.set(key, { props, segs: [] });
    groups.get(key).segs.push(pts);
  }
  const features = [];
  for (const g of groups.values()) {
    const parts = stitchLines(g.segs).map(line => line.length >= 3 ? rdp(line, LINE_EPS) : line).filter(p => p.length >= 2);
    features.push({ type: 'Feature', properties: g.props, geometry: { type: 'MultiLineString', coordinates: parts } });
  }
  return { type: 'FeatureCollection', features };
}

const CAT_LABEL = { NP: 'Nationalpark', N2000: 'Natura 2000', NSG: 'Naturschutzgebiet', LSG: 'Landschaftsschutzgebiet', NAP: 'Naturpark', BP: 'Biosphärenpark', GLT: 'Geschützter Landschaftsteil', ND: 'Naturdenkmal' };
function category(t) {
  const s = (t.protection_title || '') + ' ' + (t.boundary || '');
  const pc = String(t.protect_class || '');
  if (t.boundary === 'national_park' || /Nationalpark|National Park/i.test(s) || pc === '2') return 'NP';
  if (/Natura\s?2000|Fauna.?Flora|Vogelschutz|Europaschutz|Europa-?Fauna|\bFFH\b|Special Protection|Special Area of Conservation|Zona.*Especial|réseau Natura/i.test(s)) return 'N2000';
  if (/Naturschutzgebiet|Nature Reserve|Réserve naturelle|Reserva natural|Naturreservat/i.test(s) || pc === '1' || pc === '4') return 'NSG';
  if (/Biosph/i.test(s)) return 'BP';
  if (/Naturpark|Nature Park|Parc naturel|Parque natural/i.test(s)) return 'NAP';
  if (/Landschaftsschutzgebiet|Protected Landscape|Paysage protégé|Paisaje protegido/i.test(s) || pc === '5') return 'LSG';
  if (/Geschützter Landschaftsteil/i.test(s)) return 'GLT';
  if (/Naturdenkmal|Natural Monument|Monument naturel|Monumento natural/i.test(s)) return 'ND';
  return null;
}
function protectedToFC(elements) {
  const buckets = {};
  for (const el of elements) {
    const cat = category(el.tags || {}); if (!cat) continue;
    let rings = [];
    if (el.type === 'way' && el.geometry) {
      const r0 = roundRing(geomCoords(el.geometry)); if (r0.length >= 4) { let r = rdpRing(closed(r0) ? r0 : [...r0, r0[0]], POLY_EPS); if (!closed(r)) r.push(r[0]); if (r.length >= 4) rings = [r]; }
    } else if (el.type === 'relation' && el.members) {
      rings = stitch(el.members.filter(m => m.type === 'way' && (m.role === 'outer' || m.role === '') && m.geometry).map(m => m.geometry));
    }
    if (!rings.length) continue;
    (buckets[cat] ||= []).push(...rings.map(r => [r]));
  }
  return { type: 'FeatureCollection', features: Object.entries(buckets).map(([cat, polys]) => ({ type: 'Feature', properties: { cat, label: CAT_LABEL[cat] || cat }, geometry: { type: 'MultiPolygon', coordinates: polys } })) };
}

// ---- Overpass-Queries ------------------------------------------------------
const AREA = `area["ISO3166-1"="${ISO}"][admin_level=2]->.a;`;
const Q = {
  motorways:  `[out:json][timeout:280];${AREA}way["highway"~"^(motorway|trunk)$"](area.a);out geom;`,
  powerlines: `[out:json][timeout:280];${AREA}way["power"="line"]["voltage"](area.a);out geom;`,
  rail:       `[out:json][timeout:280];${AREA}way["railway"="rail"]["usage"="main"](area.a);out geom;`,
  protected:  `[out:json][timeout:280];${AREA}(relation["boundary"="protected_area"](area.a);relation["boundary"="national_park"](area.a);relation["leisure"="nature_reserve"](area.a);way["boundary"="protected_area"](area.a);way["boundary"="national_park"](area.a);way["leisure"="nature_reserve"](area.a););out geom;`,
};

function build(layer, raw) {
  const els = raw.elements || [];
  if (layer === 'motorways') return linesToFC(els, ['ref'], t => t.ref || '?');
  if (layer === 'rail') return linesToFC(els, [], null);
  if (layer === 'powerlines') {
    const f = els.filter(e => { const v = e.tags?.voltage; return v && String(v).split(';').some(x => +x >= 110000); });
    return linesToFC(f, ['voltage'], t => (Math.max(...String(t.voltage || '0').split(';').map(Number)) >= 220000 ? 'hv' : 'mv'));
  }
  if (layer === 'protected') return protectedToFC(els);
}

const RAW = getOpt('--raw', null);   // vorab per curl geladene Rohdatei verarbeiten (kein Fetch)
const layers = ONLY ? [ONLY] : ['protected', 'motorways', 'powerlines', 'rail'];
for (const layer of layers) {
  let raw;
  if (RAW) { raw = JSON.parse(fs.readFileSync(RAW, 'utf8')); process.stderr.write(`[${CC}] ${layer}: raw ${(raw.elements || []).length} Elemente → `); }
  else { process.stderr.write(`[${CC}] ${layer}: Overpass… `); raw = await overpass(Q[layer]); process.stderr.write(`${(raw.elements || []).length} Elemente → `); }
  const fc = build(layer, raw);
  const out = JSON.stringify(fc);
  const file = path.join(DATA_DIR, `${CC}-${layer}.json`);
  fs.writeFileSync(file, out);
  console.error(`${fc.features.length} Features, ${(out.length / 1e6).toFixed(2)} MB → ${path.relative(path.join(__dirname, '..'), file)}`);
}
console.error(`[${CC}] fertig.`);
