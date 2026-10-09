import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { SE_NOTAM_RAW, SE_SUP_RAW } from './fixtures/live.mjs';

const require = createRequire(import.meta.url);
const fn = require('../netlify/functions/notam-se.js');
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; fn._test.setNow(null); fn._test.setTimeoutMs(null); });

const stub = (impl) => { globalThis.fetch = impl; };
const res = (text, status = 200) => ({ ok: status >= 200 && status < 300, status, text: async () => text });
// Antwort je nach Layer im URL
const byLayer = (notam, sup) => async (u) => (/typename=dynais:NOTAM/.test(u) ? notam : sup);
const run = async () => { const r = await fn.handler({}); return { status: r.statusCode, headers: r.headers, body: JSON.parse(r.body) }; };
const NOW = '2026-10-09T12:00:00Z';

test('zwei Abrufe: NOTAM mit CQL_FILTER der amtlichen Karte, SUP ohne Filter', async () => {
  const urls = [];
  stub(async (u) => { urls.push(u); return res(/dynais:NOTAM/.test(u) ? SE_NOTAM_RAW : SE_SUP_RAW); });
  fn._test.setNow(Date.parse(NOW));
  await run();
  assert.equal(urls.length, 2);
  const n = urls.find(u => /typename=dynais:NOTAM/.test(u));
  const s = urls.find(u => /typename=DAIM_TOPO:SUP/.test(u));
  assert.ok(n && s);
  assert.ok(n.startsWith('https://daim.lfv.se/geoserver/wfs?'));
  assert.match(n, /outputFormat=application\/json/);
  assert.match(n, /srsname=EPSG:4326/);
  assert.ok(n.includes('CQL_FILTER=' + encodeURIComponent("(CODE23 ilike 'R%' OR CODE23 ilike 'W%') AND CODE45 <> 'TT'")));
  assert.ok(!/CQL_FILTER/i.test(s));
});

test('NOTAM: nur LOWER === 0; Name, Höhen, Beschreibung, PROHIBITED (R) vs. CONDITIONAL (W)', async () => {
  stub(byLayer(res(SE_NOTAM_RAW), res(JSON.stringify({ features: [] }))));
  fn._test.setNow(Date.parse(NOW));
  const r = await run();
  assert.equal(r.status, 200);
  assert.equal(r.body.country, 'SE');
  assert.ok(!Number.isNaN(Date.parse(r.body.fetchedAt)));
  assert.deepEqual(r.body.zones.map(z => z.name), ['NOTAM A1079/26', 'NOTAM A1070/26']);
  const [rz, wz] = r.body.zones;
  assert.equal(rz.type, 'PROHIBITED');
  assert.equal(rz.color, '#ef4444');
  assert.equal(rz.lower, 'GND');
  assert.equal(rz.upper, '2000FT AMSL');
  assert.match(rz.desc, /^TEMPORARY RESTRICTED AREA ESR532/);
  assert.equal(rz.legal, 'NOTAM');
  assert.equal(rz.notam, true);
  assert.equal(rz.geometry[0].type, 'Polygon');
  assert.equal(wz.type, 'CONDITIONAL');
  assert.equal(wz.color, '#f97316');
  assert.equal(wz.upper, '2948FT AMSL');
  assert.ok(r.body.zones.every(z => z.notam === true));
  assert.match(r.headers['Cache-Control'], /max-age=300/);
  assert.equal(r.headers['Access-Control-Allow-Origin'], '*');
});

test('SUP: nur aktuell gültige; Name, Beschreibung mit Zeitplan, Höhen, MultiPolygon → mehrere Geometrien', async () => {
  stub(byLayer(res(JSON.stringify({ features: [] })), res(SE_SUP_RAW)));
  fn._test.setNow(Date.parse(NOW));
  const r = await run();
  assert.deepEqual(r.body.zones.map(z => z.name), ['ESR833 HJORTEN', 'ESR902 HIGH']);
  const [a, b] = r.body.zones;
  assert.equal(a.type, 'PROHIBITED');
  assert.equal(a.color, '#ef4444');
  assert.equal(a.lower, 'GND');
  assert.equal(a.upper, '2100 ft AMSL');
  assert.ok(a.desc.startsWith('Temporary restricted areas established'));
  assert.ok(a.desc.includes('10 NOV 2025'));
  assert.equal(a.geometry.length, 2);
  assert.ok(a.geometry.every(g => g.type === 'Polygon'));
  assert.equal(a.legalUrl, 'https://aro.lfv.se/content/eaip/eSUP/ES-SUP-en-GB.html#SUP');
  assert.equal(a.notam, true);
  assert.equal(b.lower, 'FL520');
  assert.equal(b.upper, 'FL660');
  assert.ok(b.desc.includes('Tillfälliga') || b.desc.includes('10 NOV 2025'));
  assert.equal(b.legalUrl, 'https://dronechart.lfv.se/');
});

test('SUP-Gültigkeit folgt der injizierten Uhr', async () => {
  stub(byLayer(res(JSON.stringify({ features: [] })), res(SE_SUP_RAW)));
  fn._test.setNow(Date.parse('2027-06-01T00:00:00Z'));
  assert.deepEqual((await run()).body.zones.map(z => z.name), ['ESR833 HJORTEN', 'ESR901 LATER', 'ESR902 HIGH']);
  fn._test.setNow(Date.parse('2025-06-01T00:00:00Z'));
  assert.deepEqual((await run()).body.zones.map(z => z.name), ['ESR900 OLD']);
});

test('NOTAM und SUP landen zusammen in einer Antwort', async () => {
  stub(byLayer(res(SE_NOTAM_RAW), res(SE_SUP_RAW)));
  fn._test.setNow(Date.parse(NOW));
  assert.equal((await run()).body.zones.length, 4);
});

test('scheitert einer der beiden Abrufe → 502 ohne Teilergebnis', async () => {
  fn._test.setNow(Date.parse(NOW));
  stub(byLayer(res(SE_NOTAM_RAW), res('Service Unavailable', 503)));
  let r = await run();
  assert.equal(r.status, 502);
  assert.ok(r.body.error);
  assert.ok(!('zones' in r.body));
  stub(byLayer(res('boom', 500), res(SE_SUP_RAW)));
  assert.equal((await run()).status, 502);
  stub(async (u) => { if (/dynais:NOTAM/.test(u)) return res(SE_NOTAM_RAW); throw new Error('ECONNRESET'); });
  assert.equal((await run()).status, 502);
});

test('Nicht-JSON oder fehlende Feature-Liste → 502', async () => {
  fn._test.setNow(Date.parse(NOW));
  stub(byLayer(res('<html>Maintenance</html>'), res(SE_SUP_RAW)));
  assert.equal((await run()).status, 502);
  stub(byLayer(res(SE_NOTAM_RAW), res('<?xml version="1.0"?><ows:ExceptionReport/>')));
  assert.equal((await run()).status, 502);
  stub(byLayer(res(SE_NOTAM_RAW), res(JSON.stringify({ message: 'nope' }))));
  assert.equal((await run()).status, 502);
});

test('Fehlerantworten werden nicht gecacht', async () => {
  stub(byLayer(res('x', 500), res('x', 500)));
  const r = await run();
  assert.equal(r.status, 502);
  assert.equal(r.headers['Cache-Control'], 'no-store');
});

test('Zeitlimit: hängender Upstream wird abgebrochen → 502 (Timeout)', async () => {
  fn._test.setTimeoutMs(20);
  let aborted = 0;
  stub((u, o) => new Promise((_, reject) => {
    o.signal.addEventListener('abort', () => { aborted++; const e = new Error('aborted'); e.name = 'AbortError'; reject(e); });
  }));
  const r = await run();
  assert.equal(r.status, 502);
  assert.match(r.body.error, /timeout/i);
  assert.ok(aborted >= 1);
});

test('jeder Abruf bekommt ein AbortSignal mit', async () => {
  const opts = [];
  stub(async (u, o) => { opts.push(o); return res(JSON.stringify({ features: [] })); });
  await run();
  assert.equal(opts.length, 2);
  assert.ok(opts.every(o => o && o.signal && typeof o.signal.aborted === 'boolean'));
});

test('Features ohne brauchbare Geometrie werden übersprungen', async () => {
  stub(byLayer(res(JSON.stringify({ features: [
    { properties: { LOWER: 0, CODE23: 'RT', SERIES: 'A', NO: 1, YEAR: 26 }, geometry: null },
    { properties: { LOWER: 0, CODE23: 'RT', SERIES: 'A', NO: 2, YEAR: 26 }, geometry: { type: 'Point', coordinates: [1, 2] } },
  ] })), res(JSON.stringify({ features: [] }))));
  fn._test.setNow(Date.parse(NOW));
  assert.deepEqual((await run()).body.zones, []);
});
