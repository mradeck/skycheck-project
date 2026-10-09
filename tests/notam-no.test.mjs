import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { NOTAM_RAW } from './fixtures/zones.mjs';

const require = createRequire(import.meta.url);
const fn = require('../netlify/functions/notam-no.js');
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const stub = (impl) => { globalThis.fetch = impl; };
const ok = (text, status = 200) => async () => ({ ok: status >= 200 && status < 300, status, text: async () => text });
const run = async () => { const r = await fn.handler({}); return { status: r.statusCode, headers: r.headers, body: JSON.parse(r.body) }; };

test('Polygon und MultiPolygon werden zu Zonen; MultiPolygon → mehrere Polygon-Geometrien', async () => {
  let url;
  stub(async (u) => { url = u; return ok(NOTAM_RAW)(); });
  const r = await run();
  assert.equal(r.status, 200);
  assert.equal(url, 'https://dronesoner.no/data/forbud_notam.geojson');
  assert.equal(r.body.country, 'NO');
  assert.ok(!Number.isNaN(Date.parse(r.body.fetchedAt)));
  assert.equal(r.body.zones.length, 2);
  const [a, b] = r.body.zones;
  assert.equal(a.name, 'ENR412 Kobbholmen');
  assert.equal(a.type, 'PROHIBITED');
  assert.equal(a.color, '#ef4444');
  assert.equal(a.lower, 'GND');
  assert.equal(a.upper, '5000FT AMSL');
  assert.equal(a.desc, 'AMC Manageable.');
  assert.equal(a.legal, 'NOTAM');
  assert.equal(a.legalUrl, 'https://dronesoner.no/');
  assert.equal(a.notam, true);
  assert.equal(a.geometry.length, 1);
  assert.equal(b.geometry.length, 2);
  assert.ok(b.geometry.every(g => g.type === 'Polygon' && Array.isArray(g.coordinates[0])));
  assert.match(r.headers['Cache-Control'], /max-age=300/);
  assert.equal(r.headers['Access-Control-Allow-Origin'], '*');
});

test('leere FeatureCollection → 200 mit leerer Liste', async () => {
  stub(ok(JSON.stringify({ type: 'FeatureCollection', features: [] })));
  const r = await run();
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.zones, []);
});

test('Features ohne brauchbare Geometrie werden übersprungen, Namens-Fallback greift', async () => {
  stub(ok(JSON.stringify({ features: [
    { properties: { id: 'X1' }, geometry: null },
    { properties: { id: 'X2' }, geometry: { type: 'Point', coordinates: [1, 2] } },
    { properties: { id: 'X3' }, geometry: { type: 'Polygon', coordinates: [[[1, 60], [2, 60], [2, 61], [1, 60]]] } },
  ] })));
  const r = await run();
  assert.deepEqual(r.body.zones.map(z => z.name), ['X3']);
  assert.equal(r.body.zones[0].lower, '—');
  assert.equal(r.body.zones[0].desc, '');
});

test('Upstream-Fehlerstatus → 502', async () => {
  stub(ok('Service Unavailable', 503));
  const r = await run();
  assert.equal(r.status, 502);
  assert.ok(r.body.error);
});

test('HTTP 200 mit HTML statt JSON → 502', async () => {
  stub(ok('<!doctype html><html><body>Maintenance</body></html>'));
  assert.equal((await run()).status, 502);
});

test('gültiges JSON ohne features-Array → 502', async () => {
  stub(ok(JSON.stringify({ message: 'nope' })));
  assert.equal((await run()).status, 502);
});

test('Netzwerkfehler / Abbruch (Timeout) → 502', async () => {
  stub(async () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; });
  assert.equal((await run()).status, 502);
});

test('der Abruf bekommt ein AbortSignal mit', async () => {
  let opts;
  stub(async (u, o) => { opts = o; return ok(NOTAM_RAW)(); });
  await run();
  assert.ok(opts && opts.signal && typeof opts.signal.aborted === 'boolean');
});
