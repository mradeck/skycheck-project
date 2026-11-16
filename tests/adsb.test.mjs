import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const fn = require('../netlify/functions/adsb.js');
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const LOL = (lat, lon, d) => `https://api.adsb.lol/v2/point/${lat}/${lon}/${d}`;
const FI = (lat, lon, d) => `https://opendata.adsb.fi/api/v3/lat/${lat}/lon/${lon}/dist/${d}`;
const json = (obj, status = 200) => async () => ({ ok: status >= 200 && status < 300, status, json: async () => obj, text: async () => JSON.stringify(obj) });
const badJson = async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('x'); }, text: async () => '<html>' });
const fail403 = json({ error: 'nope' }, 403);
const call = async (qs) => { const r = await fn.handler({ queryStringParameters: qs }); return { status: r.statusCode, headers: r.headers, body: JSON.parse(r.body) }; };
const AC = { hex: 'abc123', flight: 'DLH1 ', lat: 52.5, lon: 13.4, alt_baro: 1200, alt_geom: 1300, gs: 140, track: 90, category: 'A3' };

test('Primärquelle adsb.lol: exakte URL, User-Agent, Antwortform und Cache-Header', async () => {
  const calls = [];
  globalThis.fetch = async (u, o) => { calls.push({ u, o }); return json({ now: 1234, ac: [AC] })(); };
  const r = await call({ lat: '52.51634', lon: '13.37771', dist: '10' });
  assert.equal(r.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].u, LOL(52.5163, 13.3777, 10));
  assert.equal(calls[0].o.headers['User-Agent'], 'SkyCheck (+https://skycheck-de.netlify.app)');
  assert.equal(r.body.source, 'adsb.lol');
  assert.equal(r.body.now, 1234);
  assert.deepEqual(r.body.ac, [AC]);
  assert.equal(r.headers['Content-Type'], 'application/json');
  assert.equal(r.headers['Access-Control-Allow-Origin'], '*');
  assert.equal(r.headers['Cache-Control'], 'public, max-age=3');
});

test('Primär 403 → Fallback adsb.fi mit exakter URL und User-Agent', async () => {
  const calls = [];
  globalThis.fetch = async (u, o) => { calls.push({ u, o }); return u.startsWith('https://api.adsb.lol') ? fail403() : json({ ac: [AC] })(); };
  const r = await call({ lat: '52.5', lon: '13.4', dist: '10' });
  assert.equal(r.status, 200);
  assert.equal(r.body.source, 'adsb.fi');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].u, FI(52.5, 13.4, 10));
  assert.equal(calls[1].o.headers['User-Agent'], 'SkyCheck (+https://skycheck-de.netlify.app)');
  assert.equal(typeof r.body.now, 'number');
});

test('Primär 200 mit Nicht-JSON oder ohne ac-Liste → Fallback', async () => {
  for (const primary of [badJson, json({ error: 'x' }), json({ ac: 'nope' }), json(null)]) {
    globalThis.fetch = async (u) => u.startsWith('https://api.adsb.lol') ? primary() : json({ ac: [AC] })();
    const r = await call({ lat: '1', lon: '2' });
    assert.equal(r.status, 200);
    assert.equal(r.body.source, 'adsb.fi');
  }
});

test('Netzwerkfehler der Primärquelle → Fallback', async () => {
  globalThis.fetch = async (u) => { if (u.startsWith('https://api.adsb.lol')) throw new Error('boom'); return json({ ac: [] })(); };
  const r = await call({ lat: '1', lon: '2' });
  assert.equal(r.status, 200);
  assert.equal(r.body.source, 'adsb.fi');
  assert.deepEqual(r.body.ac, []);
});

test('beide Quellen ausgefallen → 502 mit tried (2 Einträge) und no-store', async () => {
  globalThis.fetch = async (u) => { if (u.startsWith('https://api.adsb.lol')) return fail403(); throw new Error('timeout'); };
  const r = await call({ lat: '1', lon: '2' });
  assert.equal(r.status, 502);
  assert.equal(r.body.error, 'upstream_unavailable');
  assert.equal(r.body.tried.length, 2);
  assert.equal(r.body.tried[0].source, 'adsb.lol');
  assert.equal(r.body.tried[1].source, 'adsb.fi');
  assert.ok(r.body.tried.every(t => typeof t.reason === 'string' && t.reason));
  assert.equal(r.headers['Cache-Control'], 'no-store');
});

test('ungültige oder fehlende lat/lon → 400, fetch wird nie aufgerufen', async () => {
  let n = 0;
  globalThis.fetch = async () => { n++; return json({ ac: [] })(); };
  const bad = [{}, { lat: '1' }, { lon: '1' }, { lat: 'abc', lon: '1' }, { lat: '91', lon: '1' }, { lat: '-91', lon: '1' },
    { lat: '1', lon: '181' }, { lat: '1', lon: '-181' }, { lat: '', lon: '1' }, { lat: 'Infinity', lon: '1' }, { lat: '1e999', lon: '1' }];
  for (const qs of bad) {
    const r = await call(qs);
    assert.equal(r.status, 400, JSON.stringify(qs));
    assert.ok(r.body.error);
  }
  const r = await fn.handler({});
  assert.equal(r.statusCode, 400);
  assert.equal(n, 0);
});

test('dist: Default 108, Klemmung auf 1..250, Rundung auf ganze Zahl', async () => {
  const urls = [];
  globalThis.fetch = async (u) => { urls.push(u); return json({ ac: [] })(); };
  await call({ lat: '10', lon: '20' });
  await call({ lat: '10', lon: '20', dist: '0' });
  await call({ lat: '10', lon: '20', dist: '-5' });
  await call({ lat: '10', lon: '20', dist: '9999' });
  await call({ lat: '10', lon: '20', dist: '10.6' });
  await call({ lat: '10', lon: '20', dist: 'abc' });
  assert.deepEqual(urls, [LOL(10, 20, 108), LOL(10, 20, 1), LOL(10, 20, 1), LOL(10, 20, 250), LOL(10, 20, 11), LOL(10, 20, 108)]);
});

test('Feld-Whitelist: Zusatzfelder entfallen, Einträge ohne numerische lat/lon entfallen', async () => {
  globalThis.fetch = json({ now: 5, ac: [
    { ...AC, r: 'D-ABCD', t: 'A320', squawk: '1234', baro_rate: 64, mlat: [] },
    { hex: 'nolat', lon: 1 },
    { hex: 'strlat', lat: '52', lon: 13 },
    { hex: 'nullon', lat: 1, lon: null },
    { hex: 'minimal', lat: 0, lon: 0, alt_baro: 'ground' },
    null,
  ] });
  const r = await call({ lat: '1', lon: '2' });
  assert.equal(r.body.ac.length, 2);
  assert.deepEqual(r.body.ac[0], AC);
  assert.deepEqual(r.body.ac[1], { hex: 'minimal', lat: 0, lon: 0, alt_baro: 'ground' });
});
