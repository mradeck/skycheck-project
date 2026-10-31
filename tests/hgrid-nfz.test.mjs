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


// ---------------------------------------------------------------------------------------------
// Vektor-Layer, Union-BBox-Abfrage, Refresh pro Check, Legenden-Hinweis
// ---------------------------------------------------------------------------------------------
const vecSrc = `const HGRID_STOPS = [[0, [215, 25, 28]]]; let safeFetchImpl;
  const safeFetch = (...a) => safeFetchImpl(...a);
  const DIPUL_WFS_URL = 'https://x/wfs';
  ${['parseDipulTime', 'dipulWindowInactive', 'pointInRings', 'pointInFeature', 'nfzFromWfs', 'hgridNfzAt',
    'hgridUnionBBox', 'nfzBboxParam', 'fetchNfzPolygons', 'hgridActiveNfz', 'drawHgridNfz', 'setHgridNfzWarning', 'refreshHgridNfz'].map(grab).join('\n')}
  return { hgridUnionBBox, nfzBboxParam, fetchNfzPolygons, hgridActiveNfz, drawHgridNfz, setHgridNfzWarning, refreshHgridNfz,
           setFetch: f => { safeFetchImpl = f; } };`;
function harness() {
  const warnEl = { hidden: true };
  const drawn = [];
  const group = { items: [], clearLayers() { this.items = []; }, addLayer(l) { this.items.push(l); } };
  const L = { polygon: (latlngs, o) => { const l = { latlngs, o }; drawn.push(l); return l; } };
  const panes = {};
  const S = { map: { getPane: n => panes[n], createPane: n => (panes[n] = { style: {} }) }, _hgridModel: null, _hgridNfzSeq: 0 };
  const document = { getElementById: id => (id === 'hgl-nfzwarn' ? warnEl : null) };
  const mod = new Function('SOON_MS', 'S', 'L', 'document', 'console', vecSrc)(SOON_MS, S, L, document, { warn() {} });
  return { S, mod, warnEl, drawn, group, panes };
}
const resp = feats => ({ ok: true, json: async () => ({ features: feats }) });
const Z = (n, start, end) => wfs(n, iso(start), iso(end), nfzPoly);
const mkModel = (nfz, nfzOk = true, group) => ({ feats: [ctr], nfz, nfzOk, nfzLayer: group, bbox: { minLon: 8.5, minLat: 49.9, maxLon: 8.8, maxLat: 50.1 } });

test('Union-BBox und lat,lon-Reihenfolge der Abfrage (wie fetchCtrSubzones)', () => {
  const h = harness();
  const b = h.mod.hgridUnionBBox([ctr, { bbox: [8.4, 49.95, 8.7, 50.2] }]);
  assert.deepEqual(b, { minLon: 8.4, minLat: 49.9, maxLon: 8.8, maxLat: 50.2 });
  assert.equal(h.mod.nfzBboxParam(b), '49.9000,8.4000,50.2000,8.8000');   // minLat,minLon,maxLat,maxLon
});

test('NFZ-Abfrage nutzt die CTR-Union-BBox, nicht den Pin: Zone bei 50.0071,8.6554 trotz Pin bei 50.47,8.65', async () => {
  const h = harness(); let url = '';
  h.mod.setFetch(async u => { url = u; return resp([wfs('DFS', iso(NOW - H), iso(NOW + H), { type: 'Polygon', coordinates: square(8.6549, 50.0067, 8.6559, 50.0075) })]); });
  const list = await h.mod.fetchNfzPolygons(h.mod.hgridUnionBBox([ctr]));
  assert.match(url, /typeNames=dipul:temporaere_betriebseinschraenkungen/);
  const [a, b, c, d] = decodeURIComponent(/bbox=([^&]+)/.exec(url)[1]).split(',').map(Number);
  assert.ok(50.0071 >= a && 50.0071 <= c && 8.6554 >= b && 8.6554 <= d);
  assert.ok(!(50.47 >= a && 50.47 <= c), 'Pin 50.47 liegt außerhalb der CTR-BBox');
  assert.equal(list.length, 1);
});

test('NFZ-Abfrage wirft bei HTTP-Fehler', async () => {
  const h = harness(); h.mod.setFetch(async () => ({ ok: false, status: 503 }));
  await assert.rejects(h.mod.fetchNfzPolygons({ minLon: 1, minLat: 1, maxLon: 2, maxLat: 2 }));
});

test('Vektor-Layer: nur aktive Zonen, nicht interaktiv, eigene Pane, Zone-1-Rot, [lat,lon]', () => {
  const h = harness(); const m = mkModel(api.nfzFromWfs({ features: [Z('aktiv', NOW - H, NOW + H), Z('alt', NOW - 30 * H, NOW - H)] }), true, h.group);
  h.S._hgridModel = m;
  h.mod.drawHgridNfz(m, NOW);
  assert.equal(h.group.items.length, 1);
  const { latlngs, o } = h.drawn[0];
  assert.equal(o.interactive, false);
  assert.equal(o.pane, 'hgridNfz');
  assert.ok(h.panes.hgridNfz, 'Pane wird angelegt');
  assert.match(o.fillColor + o.color, /215,\s*25,\s*28|#d7191c|rgb\(215/i);
  assert.deepEqual(latlngs[0][0][0], [50.0, 8.64]);                  // [lat, lon]
});

test('Vektor-Layer wird bei erneutem Zeichnen neu berechnet (Fenster läuft während des Refresh ab)', () => {
  const h = harness(); const m = mkModel(api.nfzFromWfs({ features: [Z('x', NOW - H, NOW + H)] }), true, h.group);
  h.mod.drawHgridNfz(m, NOW); assert.equal(h.group.items.length, 1);
  h.mod.drawHgridNfz(m, NOW + 2 * H); assert.equal(h.group.items.length, 0);
});

test('Refresh: aktualisiert m.nfz ohne Neuaufbau, zeichnet neu, versteckt Warnung', async () => {
  const h = harness(); const m = mkModel([], false, h.group); h.S._hgridModel = m; h.warnEl.hidden = false;
  h.mod.setFetch(async () => resp([Z('neu', Date.now() - H, Date.now() + H)]));
  await h.mod.refreshHgridNfz();
  assert.equal(m.nfz.length, 1); assert.equal(m.nfzOk, true);
  assert.equal(h.group.items.length, 1); assert.equal(h.warnEl.hidden, true);
  assert.equal(h.S._hgridModel, m);
});

test('Refresh fehlgeschlagen: nfzOk=false, letzte Zonen bleiben sichtbar, Warnung sichtbar', async () => {
  const h = harness(); const known = api.nfzFromWfs({ features: [Z('bekannt', Date.now() - H, Date.now() + H)] });
  const m = mkModel(known, true, h.group); h.S._hgridModel = m;
  h.mod.setFetch(async () => { throw new Error('netz'); });
  await h.mod.refreshHgridNfz();
  assert.equal(m.nfzOk, false); assert.equal(m.nfz, known);
  assert.equal(h.group.items.length, 1); assert.equal(h.warnEl.hidden, false);
});

test('Refresh Stale-Guard: späte alte Antwort überschreibt keine neuere; entferntes/neues Gitter bleibt unberührt', async () => {
  const h = harness(); const m = mkModel([], true, h.group); h.S._hgridModel = m;
  let release1; const first = new Promise(r => { release1 = r; });
  let call = 0;
  h.mod.setFetch(async () => { call++; if (call === 1) { await first; return resp([Z('alt', Date.now() - H, Date.now() + H)]); } return resp([Z('neu1', Date.now() - H, Date.now() + H), Z('neu2', Date.now() - H, Date.now() + H)]); });
  const p1 = h.mod.refreshHgridNfz(); const p2 = h.mod.refreshHgridNfz();
  await p2; release1(); await p1;
  assert.deepEqual(m.nfz.map(n => n.name), ['neu1', 'neu2']);
  // Gitter wurde währenddessen entfernt/ersetzt
  const m2 = mkModel([], true, h.group); h.S._hgridModel = m2;
  let rel; const gate = new Promise(r => { rel = r; });
  h.mod.setFetch(async () => { await gate; return resp([Z('spät', Date.now() - H, Date.now() + H)]); });
  const p3 = h.mod.refreshHgridNfz(); h.S._hgridModel = null; rel(); await p3;
  assert.equal(m2.nfz.length, 0);
});

test('Legendenzeile: id, i18n-Key in allen 5 Sprachen, einheitliche Großschreibung, in Legende', () => {
  assert.match(html, /id="hgl-nfzwarn"[^>]*data-i18n="hgridNfzUnchecked"|data-i18n="hgridNfzUnchecked"[^>]*id="hgl-nfzwarn"/);
  const vals = [...html.matchAll(/hgridNfzUnchecked: '([^']+)'/g)].map(m => m[1]);
  assert.equal(vals.length, 5);
  vals.forEach(v => assert.match(v, /^[A-ZÀ-ŻŁ]/, v));
});

test('build: NFZ-Abfrage erst nach feats, mit Union-BBox; keine Zellmalerei mehr; Update pro Check ohne Rebuild', () => {
  const b = grab('buildHeightGrid');
  assert.ok(b.indexOf('hgridUnionBBox(feats)') < b.indexOf('fetchNfzPolygons('));
  assert.ok(b.indexOf('fetchCtrSubzones(') < b.indexOf('fetchNfzPolygons('));
  assert.doesNotMatch(b, /inNfz|hgridNfzAt/);
  const u = grab('updateHeightGridControl');
  assert.match(u, /refreshHgridNfz\(\)/);
});

test('Kommentar behauptet nicht mehr, Inaktive beeinflussten das Gitter nicht', () => {
  assert.doesNotMatch(html, /inaktive Zonen beeinflussen das Höhengitter ohnehin nicht/);
  assert.match(html, /Bekannte Grenze/);
});
