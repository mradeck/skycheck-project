import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { BE_LIVE_RAW } from './fixtures/live.mjs';

const require = createRequire(import.meta.url);
const fn = require('../netlify/functions/notam-be.js');
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; fn._test.setTimeoutMs(null); });

const stub = (impl) => { globalThis.fetch = impl; };
const ok = (text, status = 200) => async () => ({ ok: status >= 200 && status < 300, status, text: async () => text });
const run = async () => { const r = await fn.handler({}); return { status: r.statusCode, headers: r.headers, body: JSON.parse(r.body) }; };

test('URL: Droneguide-WFS mit cql_filter auf genau die beiden Live-Typen, ohne TIME_ZONE', async () => {
  let url;
  stub(async (u) => { url = u; return ok(BE_LIVE_RAW)(); });
  await run();
  assert.ok(url.startsWith('https://map.droneguide.be/ows?'));
  assert.match(url, /typeNames=geo_zone_fast/);
  assert.match(url, /outputFormat=application\/json/);
  assert.match(url, /srsName=EPSG:4326/);
  const cql = decodeURIComponent(url.match(/cql_filter=([^&]+)/)[1]);
  assert.equal(cql, "type_code IN ('NOTAM','TEMPORARY-NO-FLY-ZONE')");
  assert.ok(!/TIME_ZONE/.test(url));
  assert.ok(!/NOT\s+IN/i.test(cql));
});

test('Zonen: Form, Typ = restriction, Höhen in m AGL; Untergrenze über 120 m entfällt', async () => {
  stub(ok(BE_LIVE_RAW));
  const r = await run();
  assert.equal(r.status, 200);
  assert.equal(r.body.country, 'BE');
  assert.ok(!Number.isNaN(Date.parse(r.body.fetchedAt)));
  assert.deepEqual(r.body.zones.map(z => z.name), ['F1207/26', 'Police activities', 'Only fr']);
  const [a, b, c] = r.body.zones;
  assert.equal(a.type, 'PROHIBITED');
  assert.equal(a.color, '#ef4444');
  assert.equal(a.lower, 'GND');
  assert.equal(a.upper, '120 m AGL');
  assert.match(a.desc, /^TEMPO SEGREGATED AREA/);
  assert.equal(a.legalUrl, 'https://map.droneguide.be/');
  assert.equal(a.notam, true);
  assert.equal(b.type, 'CONDITIONAL');
  assert.equal(b.color, '#f97316');
  assert.equal(b.lower, 'GND');          // fehlender unterer Wert zählt als 0
  assert.equal(b.upper, '122 m AGL');
  assert.equal(c.type, 'REQ_AUTHORISATION');
  assert.equal(c.color, '#f59e0b');
  assert.equal(c.lower, '120 m AGL');    // genau 120 m ist noch erlaubt (nur > 120 entfällt)
});

test('Namens- und Beschreibungs-JSON: en vor nl vor fr, sonst Klartext', async () => {
  stub(ok(BE_LIVE_RAW));
  const z = (await run()).body.zones.find(x => x.name === 'Police activities');
  assert.equal(z.desc, 'No flights');
  stub(ok(JSON.stringify({ features: [{ geometry: { type: 'Polygon', coordinates: [[[1, 50], [2, 50], [2, 51], [1, 50]]] },
    properties: { name: '{"fr":"Zone FR","nl":"Zone NL"}', description: '{"fr":"Interdit"}', code: 'C1', restriction: 'PROHIBITED',
      lower_limit_altitude_meter_agl: 0, upper_limit_altitude_meter_agl: 50 } }] })));
  const z2 = (await run()).body.zones[0];
  assert.equal(z2.name, 'Zone NL');
  assert.equal(z2.desc, 'Interdit');
});

test('MultiPolygon → mehrere Polygon-Geometrien', async () => {
  stub(ok(BE_LIVE_RAW));
  const c = (await run()).body.zones.find(x => x.name === 'Only fr');
  assert.equal(c.geometry.length, 2);
  assert.ok(c.geometry.every(g => g.type === 'Polygon'));
  assert.equal(c.upper, '—');
});

test('Header: CORS, 5 Minuten Cache', async () => {
  stub(ok(BE_LIVE_RAW));
  const r = await run();
  assert.match(r.headers['Cache-Control'], /max-age=300/);
  assert.equal(r.headers['Access-Control-Allow-Origin'], '*');
});

test('leere FeatureCollection → 200 mit leerer Liste', async () => {
  stub(ok(JSON.stringify({ type: 'FeatureCollection', features: [] })));
  const r = await run();
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.zones, []);
});

test('Upstream-Fehlerstatus, HTML statt JSON, fehlende Feature-Liste → 502', async () => {
  stub(ok('Bad gateway', 502));
  let r = await run();
  assert.equal(r.status, 502);
  assert.ok(r.body.error);
  assert.equal(r.headers['Cache-Control'], 'no-store');
  stub(ok('<html>Maintenance</html>'));
  assert.equal((await run()).status, 502);
  stub(ok(JSON.stringify({ message: 'nope' })));
  assert.equal((await run()).status, 502);
});

test('Netzwerkfehler → 502; hängender Upstream wird per AbortController abgebrochen → 502', async () => {
  stub(async () => { throw new Error('ECONNRESET'); });
  assert.equal((await run()).status, 502);
  fn._test.setTimeoutMs(20);
  stub((u, o) => new Promise((_, reject) => {
    o.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; reject(e); });
  }));
  const r = await run();
  assert.equal(r.status, 502);
  assert.match(r.body.error, /timeout/i);
});

// ── Fix-Runde 1 ────────────────────────────────────────────────────────────
const feat = (props) => ({ geometry: { type: 'Polygon', coordinates: [[[1, 50], [2, 50], [2, 51], [1, 50]]] },
  properties: { name: 'Z', code: 'Z', restriction: 'PROHIBITED', lower_limit_altitude_meter_agl: 0, upper_limit_altitude_meter_agl: 50, ...props } });
const zonesOf = async (...props) => { stub(ok(JSON.stringify({ features: props.map(feat) }))); return (await run()).body.zones; };

test('D4: Untergrenze als numerischer String wird gelesen (120-m-Regel greift); negativ zählt als 0', async () => {
  assert.deepEqual(await zonesOf({ lower_limit_altitude_meter_agl: '142.9' }), []);
  const [a] = await zonesOf({ lower_limit_altitude_meter_agl: '80', upper_limit_altitude_meter_agl: '99.6' });
  assert.equal(a.lower, '80 m AGL');
  assert.equal(a.upper, '100 m AGL');
  const [b] = await zonesOf({ lower_limit_altitude_meter_agl: -5 });
  assert.equal(b.lower, 'GND');
});

test('D6: unbekannte restriction wird PROHIBITED (rot)', async () => {
  const [z, y] = await zonesOf({ restriction: 'WHATEVER' }, { restriction: null });
  assert.equal(z.type, 'PROHIBITED');
  assert.equal(z.color, '#ef4444');
  assert.equal(y.type, 'PROHIBITED');
});

test('D2: Timeout beim Lesen des Bodys wird als Timeout gemeldet', async () => {
  fn._test.setTimeoutMs(20);
  stub(async (u, o) => ({ ok: true, status: 200, text: () => new Promise((_, reject) => {
    o.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; reject(e); });
  }) }));
  const r = await run();
  assert.equal(r.status, 502);
  assert.match(r.body.error, /timeout/i);
});
