// Höhengitter + aktive U_NFZ: im aktiven Flugverbot darf der Hover keine Flughöhe nennen,
// das Raster malt die Zelle rot. Fail-visible: ohne NFZ-Daten steht ein Hinweis am Höhenwert.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = readFileSync(fileURLToPath(new URL('../skycheck.html', import.meta.url)), 'utf8');

function grab(name) {
  const m = html.match(new RegExp(`(async\\s+)?function ${name}\\(`));
  assert.ok(m, `Funktion ${name} nicht in skycheck.html gefunden`);
  const start = m.index;
  let depth = 0;
  for (let k = html.indexOf('{', html.indexOf(')', start)); k < html.length; k++) {
    if (html[k] === '{') depth++;
    else if (html[k] === '}' && --depth === 0) return html.slice(start, k + 1);
  }
  throw new Error(`Ende von ${name} nicht gefunden`);
}

const STR = {
  hgridZoneShort: 'Zone', hgridIndiv: 'indiv', hgridMax: 'Max. Flughöhe', msGroundMsl: 'Gelände',
  hgridNfz: 'Temporäres Flugverbot', hgridNfzUnchecked: 'Temporäre Flugverbote nicht prüfbar',
};
const SOON_MS = 24 * 3600 * 1000;
const src = `const SOON_MS = ${SOON_MS}; const _t = k => STR[k] ?? ('?' + k);
  ${['parseDipulTime', 'dipulWindowInactive', 'escapeHtml', 'computeCtrFlightInfo', 'pointInRings', 'pointInFeature',
    'nfzFromWfs', 'hgridNfzAt', '_hgridLabel', 'hgridHoverLabel'].map(grab).join('\n')}
  return { nfzFromWfs, hgridNfzAt, hgridHoverLabel, pointInFeature };`;
const api = new Function('STR', src)(STR);

const H = 3600 * 1000, NOW = Date.UTC(2026, 9, 31, 12);
const iso = ms => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
const square = (x0, y0, x1, y1) => [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]];
const wfs = (name, start, end, geom, type = 'U_NFZ') => ({ type: 'Feature', geometry: geom,
  properties: { name, start_time: start, end_time: end, type_code: type } });
const bboxOf = (x0, y0, x1, y1) => [x0, y0, x1, y1];
// CTR-Zone 4 um (8.655, 50.008) herum, Gelände 400 m, Untergrenze 487 m MSL -> 87 m AGL
const ctr = { zoneNum: 4, lowerMslM: 487, polys: [square(8.5, 49.9, 8.8, 50.1)], bbox: bboxOf(8.5, 49.9, 8.8, 50.1) };
const nfzPoly = { type: 'Polygon', coordinates: square(8.64, 50.0, 8.67, 50.02) };
const model = (nfzFeatures, nfzOk = true) => ({ feats: [ctr], sampleTerrain: () => 400,
  nfz: api.nfzFromWfs({ features: nfzFeatures }), nfzOk });

test('baseline: ohne NFZ nennt der Hover die Höhe', () => {
  const l = api.hgridHoverLabel(model([]), 50.008, 8.655, NOW);
  assert.match(l, /Max\. Flughöhe: 87 m AGL/);
  assert.doesNotMatch(l, /nicht prüfbar/);
});

test('aktive U_NFZ (laufend): Flugverbot + Name, KEINE Höhenzahl', () => {
  const m = model([wfs('Polizeieinsatz', iso(NOW - H), iso(NOW + H), nfzPoly)]);
  const l = api.hgridHoverLabel(m, 50.008, 8.655, NOW);
  assert.equal(l, 'Temporäres Flugverbot · Polizeieinsatz');
  assert.doesNotMatch(l, /AGL|\d+ m/);
});

test('Name wird HTML-escaped (Tooltip setzt innerHTML)', () => {
  const m = model([wfs('<img src=x onerror=alert(1)>', iso(NOW - H), iso(NOW + H), nfzPoly)]);
  const l = api.hgridHoverLabel(m, 50.008, 8.655, NOW);
  assert.ok(!l.includes('<img'));
  assert.match(l, /&lt;img/);
});

test('MultiPolygon wird erkannt', () => {
  const g = { type: 'MultiPolygon', coordinates: [square(0, 0, 1, 1), square(8.64, 50.0, 8.67, 50.02)] };
  const m = model([wfs('MP', iso(NOW - H), iso(NOW + H), g)]);
  assert.match(api.hgridHoverLabel(m, 50.008, 8.655, NOW), /^Temporäres Flugverbot/);
});

test('außerhalb des NFZ-Polygons: normale Höhe', () => {
  const m = model([wfs('X', iso(NOW - H), iso(NOW + H), nfzPoly)]);
  assert.match(api.hgridHoverLabel(m, 50.05, 8.7, NOW), /87 m AGL/);
});

test('inaktive U_NFZ (abgelaufen / Start > 24 h): keine Wirkung', () => {
  for (const [s, e] of [[iso(NOW - 30 * H), iso(NOW - H)], [iso(NOW + 25 * H), iso(NOW + 30 * H)]]) {
    const m = model([wfs('Alt', s, e, nfzPoly)]);
    assert.match(api.hgridHoverLabel(m, 50.008, 8.655, NOW), /87 m AGL/);
    assert.equal(api.hgridNfzAt(8.655, 50.008, m.nfz, NOW), null);
  }
});

test('Start binnen 24 h und unlesbare Zeiten: aktiv (fail-safe)', () => {
  assert.ok(api.hgridNfzAt(8.655, 50.008, model([wfs('B', iso(NOW + 23 * H), iso(NOW + 30 * H), nfzPoly)]).nfz, NOW));
  assert.ok(api.hgridNfzAt(8.655, 50.008, model([wfs('C', 'müll', null, nfzPoly)]).nfz, NOW));
});

test('Fenster wird zum Aufrufzeitpunkt bewertet (lange offenes Gitter)', () => {
  const m = model([wfs('Fenster', iso(NOW + 30 * H), iso(NOW + 40 * H), nfzPoly)]);
  assert.match(api.hgridHoverLabel(m, 50.008, 8.655, NOW), /87 m AGL/);                 // noch inaktiv
  assert.match(api.hgridHoverLabel(m, 50.008, 8.655, NOW + 10 * H), /^Temporäres Flugverbot/); // Start jetzt < 24 h
  assert.match(api.hgridHoverLabel(m, 50.008, 8.655, NOW + 45 * H), /87 m AGL/);         // vorbei
});

test('NFZ gewinnt gegen CTR Zone 1', () => {
  const m = model([wfs('Z', iso(NOW - H), iso(NOW + H), nfzPoly)]);
  m.feats = [{ ...ctr, zoneNum: 1 }];
  assert.match(api.hgridHoverLabel(m, 50.008, 8.655, NOW), /^Temporäres Flugverbot · Z$/);
});

test('NFZ-Abruf fehlgeschlagen: Höhe bleibt, Hinweis-Suffix steht dabei', () => {
  const l = api.hgridHoverLabel(model([], false), 50.008, 8.655, NOW);
  assert.match(l, /87 m AGL/);
  assert.match(l, / · Temporäre Flugverbote nicht prüfbar$/);
});

test('nfzFromWfs: nur U_NFZ / leerer Typ, Name-Fallback, kaputte Geometrie übersprungen', () => {
  const l = api.nfzFromWfs({ features: [
    wfs('ok', 'a', 'b', nfzPoly),
    wfs('anderer Typ', 'a', 'b', nfzPoly, 'U_SONST'),
    { properties: { generated_name_de: 'Fallback', type_code: 'U_NFZ' }, geometry: nfzPoly },
    wfs('ohne Geometrie', 'a', 'b', null),
    wfs('Punkt', 'a', 'b', { type: 'Point', coordinates: [1, 2] }),
  ] });
  assert.deepEqual(l.map(n => n.name), ['ok', 'Fallback']);
  assert.deepEqual(api.nfzFromWfs({}), []);
  assert.deepEqual(l[0].bbox, [8.64, 50.0, 8.67, 50.02]);
});

test('Raster: Zelle in aktiver NFZ wird mit der Zone-1-Farbe gemalt (Quelltext-Vertrag)', () => {
  const body = grab('buildHeightGrid');
  assert.match(body, /hgridNfzAt\(cx, cy, nfz/);
  assert.match(body, /HGRID_STOPS\[0\]\[1\]/);
});
