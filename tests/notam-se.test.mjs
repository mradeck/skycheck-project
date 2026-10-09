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
const NOW = '2026-10-16T12:00:00Z'; // innerhalb der Gültigkeit der Fixture-NOTAMs (10-15 … 10-18)

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
  assert.equal(rz.desc, 'Valid 2026-10-15 09:00 – 2026-10-18 12:00 UTC. TEMPORARY RESTRICTED AREA ESR532 MELLBERG ESTABLISHED FOR MILITARY AVIATION OPERATIONS.');
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
  assert.equal(a.desc, 'Valid 2025-11-10 06:00 – 2027-08-31 21:00 UTC. Schedule: 10 NOV 2025 – 31 AUG 2027 MON – FRI 0600 – 2100 (0500 – 2000). Temporary restricted areas established for aviation operations with UAS with special permission.');
  assert.equal(a.geometry.length, 2);
  assert.ok(a.geometry.every(g => g.type === 'Polygon'));
  assert.equal(a.legalUrl, 'https://aro.lfv.se/content/eaip/eSUP/ES-SUP-en-GB.html#SUP');
  assert.equal(a.notam, true);
  assert.equal(b.lower, 'SFC');
  assert.equal(b.upper, 'FL660');
  assert.ok(b.desc.startsWith('Valid 2025-11-10 06:00'));
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

// ── Fix-Runde 1 ────────────────────────────────────────────────────────────
const poly = { type: 'Polygon', coordinates: [[[17, 59.7], [17.1, 59.7], [17.1, 59.8], [17, 59.7]]] };
const nf = (over, geometry = poly) => ({ geometry, properties: { SERIES: 'A', NO: 1, YEAR: 26, CODE23: 'RT', LOWER: 0,
  STARTVALIDITY: '2026-10-15T09:00:00Z', ENDVALIDITY: '2026-10-18T12:00:00Z', ITEM_E: 'Text E.', ITEM_F: 'GND', ITEM_G: '100FT AMSL', ...over } });
const emptySup = res(JSON.stringify({ features: [] }));
const runNotams = async (features, nowIso = NOW) => {
  stub(byLayer(res(JSON.stringify({ features })), emptySup));
  fn._test.setNow(Date.parse(nowIso));
  return (await run()).body.zones;
};
const sf = (over, geometry) => ({ geometry: geometry || { type: 'MultiPolygon', coordinates: [[poly.coordinates[0]]] }, properties: { DESIG: 'ESR1', NAME: 'X',
  LOWER: 'GND', UPPER: '2100', FROM: '2025-11-10T06:00Z', TO: '2027-08-31T21:00Z', COM_EN: 'English.', COM_SE: 'Svenska.', LOW_UOM: '', UP_UOM: 'ft AMSL', ...over } });
const runSup = async (features) => {
  stub(byLayer(res(JSON.stringify({ features: [] })), res(JSON.stringify({ features }))));
  fn._test.setNow(Date.parse(NOW));
  return (await run());
};

test('A: abgelaufenes NOTAM entfällt', async () => {
  assert.deepEqual(await runNotams([nf({})], '2026-10-19T00:00:00Z'), []);
});

test('A: noch nicht begonnenes NOTAM → inactive, grau, beide Texte', async () => {
  const [z] = await runNotams([nf({})], '2026-10-09T12:00:00Z');
  assert.equal(z.inactive, true);
  assert.equal(z.type, 'TEMPORARY_INACTIVE');
  assert.equal(z.color, '#64748b');
  assert.equal(z.notam, true);
  assert.equal(z.desc, 'Not yet active — starts 2026-10-15. Valid 2026-10-15 09:00 – 2026-10-18 12:00 UTC. Text E.');
});

test('A: laufendes NOTAM → aktiv mit Gültigkeitszeile', async () => {
  const [z] = await runNotams([nf({})]);
  assert.ok(!('inactive' in z));
  assert.equal(z.type, 'PROHIBITED');
  assert.equal(z.desc, 'Valid 2026-10-15 09:00 – 2026-10-18 12:00 UTC. Text E.');
});

test('A: fehlende oder unlesbare Grenzen → aktiv, Teil-Gültigkeitszeile', async () => {
  const zs = await runNotams([nf({ NO: 1, STARTVALIDITY: null }), nf({ NO: 2, ENDVALIDITY: 'kaputt' }),
    nf({ NO: 3, STARTVALIDITY: 'x', ENDVALIDITY: null })]);
  assert.equal(zs.length, 3);
  assert.ok(zs.every(z => !z.inactive && z.type === 'PROHIBITED'));
  assert.equal(zs[0].desc, 'Valid until 2026-10-18 12:00 UTC. Text E.');
  assert.equal(zs[1].desc, 'Valid from 2026-10-15 09:00 UTC. Text E.');
  assert.equal(zs[2].desc, 'Text E.');
});

test('A: ITEM_D steht als Schedule in der Beschreibung', async () => {
  const [z] = await runNotams([nf({ ITEM_D: '20 0700-1400, 21 1000-1400' })]);
  assert.equal(z.desc, 'Valid 2026-10-15 09:00 – 2026-10-18 12:00 UTC. Schedule: 20 0700-1400, 21 1000-1400. Text E.');
});

test('A: SUP trägt Gültigkeitszeile und Schedule vor dem Text', async () => {
  const r = await runSup([sf({ SCHEDULE: 'MON – FRI 0600 – 2100' })]);
  assert.equal(r.body.zones[0].desc, 'Valid 2025-11-10 06:00 – 2027-08-31 21:00 UTC. Schedule: MON – FRI 0600 – 2100. English.');
});

test('B: Einstufung nach CODE23 (RP/RR/RT gesperrt; RD, W…, sonstige R… bedingt)', async () => {
  const types = {};
  const zs = await runNotams(['RP', 'RR', 'RT', 'RD', 'WO', 'WE', 'RA'].map((c, i) => nf({ NO: i, CODE23: c })));
  zs.forEach((z, i) => { types[['RP', 'RR', 'RT', 'RD', 'WO', 'WE', 'RA'][i]] = z.type; });
  assert.deepEqual(types, { RP: 'PROHIBITED', RR: 'PROHIBITED', RT: 'PROHIBITED', RD: 'CONDITIONAL', WO: 'CONDITIONAL', WE: 'CONDITIONAL', RA: 'CONDITIONAL' });
  assert.equal(zs[3].color, '#f97316');
});

test('B: inaktive NOTAMs bleiben TEMPORARY_INACTIVE, egal welcher Code', async () => {
  const zs = await runNotams([nf({ CODE23: 'RT' }), nf({ NO: 2, CODE23: 'RD' })], '2026-10-09T12:00:00Z');
  assert.ok(zs.every(z => z.type === 'TEMPORARY_INACTIVE'));
});

test('C: SUP-Untergrenze — GND/SFC/0 und ≤ 400 ft / ≤ 120 m bleiben, Flugfläche und höher entfällt, Unlesbares bleibt', async () => {
  const lows = [['GND', ''], ['SFC', ''], ['0', ''], ['260', 'ft SFC'], ['400', 'ft'], ['120', 'm'], ['FL70', ''], ['FL95', ''], ['500', 'ft AGL'],
    ['121', 'm'], ['401', 'ft SFC'], ['???', ''], ['', ''], ['300', '']];
  const r = await runSup(lows.map(([l, u], i) => sf({ DESIG: `S${i}`, NAME: '', LOWER: l, LOW_UOM: u })));
  assert.deepEqual(r.body.zones.map(z => z.name), ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S11', 'S12', 'S13']);
});

test('D3: null-Eintrag oder Feature ohne Geometrie in der SUP-Liste wird übersprungen, kein 502', async () => {
  const r = await runSup([null, { properties: { DESIG: 'X' } }, sf({ DESIG: 'OK', NAME: '' })]);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.zones.map(z => z.name), ['OK']);
});

test('D5: COM_EN vorhanden → Englisch; COM_EN leer → COM_SE', async () => {
  const r = await runSup([sf({ DESIG: 'EN' }), sf({ DESIG: 'SE', COM_EN: '' })]);
  assert.ok(r.body.zones[0].desc.endsWith(' English.') && !r.body.zones[0].desc.includes('Svenska'));
  assert.ok(r.body.zones[1].desc.endsWith(' Svenska.') && !r.body.zones[1].desc.includes('English'));
});

test('D6: SUP mit unlesbarem FROM/TO bleibt sichtbar', async () => {
  const r = await runSup([sf({ FROM: 'kaputt', TO: '' })]);
  assert.equal(r.body.zones.length, 1);
  assert.ok(!r.body.zones[0].desc.startsWith('Valid'));
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
