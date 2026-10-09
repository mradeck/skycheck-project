import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { buildZones } from '../scripts/build-eu-zones.mjs';
import { LU_RAW, NO_RAW, EE_RAW } from './fixtures/zones.mjs';

const require = createRequire(import.meta.url);
let fn;
const call = async (qs) => {
  const r = await fn.handler({ queryStringParameters: qs });
  return { status: r.statusCode, headers: r.headers || {}, body: r.statusCode === 200 ? JSON.parse(r.body) : r.body };
};

before(() => {
  const dir = mkdtempSync(join(tmpdir(), 'ed269-'));
  const circle = { identifier: 'C1', name: 'Circle zone', restriction: 'PROHIBITED',
    geometry: [{ lowerLimit: 0, lowerVerticalReference: 'AGL', upperLimit: 400, upperVerticalReference: 'AMSL',
      uomDimensions: 'FT', horizontalProjection: { type: 'Circle', center: [6.5, 49.9], radius: 500 } }] };
  const holed = { identifier: 'H1', name: 'Holed zone', restriction: 'CONDITIONAL', geometry: [{
    horizontalProjection: { type: 'Polygon', coordinates: [
      [[5.9, 49.5], [6.0, 49.5], [6.0, 49.6], [5.9, 49.6], [5.9, 49.5]],
      [[5.93, 49.53], [5.97, 49.53], [5.97, 49.57], [5.93, 49.57], [5.93, 49.53]]] } }] };
  writeFileSync(join(dir, 'uas-zones-lu.json'), JSON.stringify([...buildZones('lu', LU_RAW, { min: 1 }), circle, holed]));
  writeFileSync(join(dir, 'uas-zones-no.json'), JSON.stringify(buildZones('no', NO_RAW, { min: 1 })));
  writeFileSync(join(dir, 'uas-zones-ee.json'), JSON.stringify(buildZones('ee', EE_RAW, { min: 1 })));
  process.env.SKYCHECK_DATA_DIR = dir;
  fn = require('../netlify/functions/zones-ed269.js');
  fn._test.resetCache();
});

test('unbekanntes oder fehlendes Land → 400', async () => {
  assert.equal((await call({ country: 'xx', lat: '1', lon: '1' })).status, 400);
  assert.equal((await call({ lat: '1', lon: '1' })).status, 400);
  assert.equal((await call({ country: '../at', lat: '1', lon: '1' })).status, 400);
});

test('fehlende oder unsinnige Koordinaten → 400', async () => {
  assert.equal((await call({ country: 'lu' })).status, 400);
  assert.equal((await call({ country: 'lu', lat: 'abc', lon: '6' })).status, 400);
  assert.equal((await call({ country: 'lu', lat: '95', lon: '6' })).status, 400);
});

test('Punkt im Polygon trifft; Form und Namenswahl (name vor message)', async () => {
  const r = await call({ country: 'lu', lat: '49.875', lon: '6.165', radius: '100' });
  assert.equal(r.status, 200);
  assert.equal(r.body.country, 'LU');
  const z = r.body.zones.find(x => x.name === 'EL-UAS-S16');
  assert.ok(z, 'Zone gefunden, Name = name-Feld (nicht der message-Langtext)');
  assert.equal(z.type, 'REQ_AUTHORISATION');
  assert.equal(z.color, '#f59e0b');
  assert.equal(z.lower, 'GND');
  assert.equal(z.upper, '120 m AGL');
  assert.equal(z.legal, 'Armée Luxembourgeoise');
  assert.equal(z.legalUrl, '');
  assert.equal(z.desc, 'Please consult https://g-o.lu/uas');
  assert.equal(z.geometry[0].type, 'Polygon');
  assert.ok(!('info' in z));
  assert.equal(r.headers['Access-Control-Allow-Origin'], '*');
});

test('Punkt in der Bounding-Box, aber außerhalb der Fläche und des Radius → kein Treffer', async () => {
  // Hardangervidda-Fixture ist L-förmig; (60.8, 7.8) liegt in der leeren Ecke der Bounding-Box.
  const r = await call({ country: 'no', lat: '60.8', lon: '7.8', radius: '100' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.zones, []);
});

test('Punkt knapp außerhalb, aber innerhalb des Suchradius → Treffer', async () => {
  // 60.2005 liegt ~55 m nördlich der Kante lat 60.2 (zwischen lon 7.2 und 8.0).
  const near = await call({ country: 'no', lat: '60.2005', lon: '7.6', radius: '100' });
  assert.equal(near.body.zones.length, 1);
  const far = await call({ country: 'no', lat: '60.2005', lon: '7.6', radius: '20' });
  assert.equal(far.body.zones.length, 0);
});

test('Punkt im Loch eines Polygons → kein Treffer, außer der Lochrand liegt im Radius', async () => {
  const inHole = await call({ country: 'lu', lat: '49.55', lon: '5.95', radius: '100' });
  assert.ok(!inHole.body.zones.some(z => z.name === 'Holed zone'));
  const nearEdge = await call({ country: 'lu', lat: '49.5305', lon: '5.95', radius: '100' });
  assert.ok(nearEdge.body.zones.some(z => z.name === 'Holed zone'));
});

test('Kreis-Geometrie: Treffer innerhalb Radius + Suchradius, Höhe in ft', async () => {
  const hit = await call({ country: 'lu', lat: '49.905', lon: '6.5', radius: '100' }); // ~556 m vom Zentrum
  const z = hit.body.zones.find(x => x.name === 'Circle zone');
  assert.ok(z);
  assert.equal(z.upper, '400 ft AMSL');
  assert.deepEqual(z.geometry[0], { type: 'Circle', center: [6.5, 49.9], radius: 500 });
  const miss = await call({ country: 'lu', lat: '49.91', lon: '6.5', radius: '100' }); // ~1113 m
  assert.ok(!miss.body.zones.some(x => x.name === 'Circle zone'));
});

test('Radius wird auf 1…5000 m begrenzt', async () => {
  const neg = await call({ country: 'no', lat: '60.2005', lon: '7.6', radius: '-5' });
  assert.equal(neg.status, 200);
  assert.equal(neg.body.zones.length, 0);
  // 60.8/7.8 liegt ~33 km von der nächsten Kante: auch radius=999999 darf nicht treffen.
  const huge = await call({ country: 'no', lat: '60.8', lon: '7.8', radius: '999999' });
  assert.equal(huge.body.zones.length, 0);
});

test('EE: lokalisierte Meldung nach lang, Fallback en; NO_RESTRICTION ist eine gewöhnliche blaue Zone', async () => {
  const et = await call({ country: 'ee', lat: '59.405', lon: '24.705', lang: 'et' });
  assert.equal(et.body.zones[0].desc, 'Lennud kõrgemal kui 50 meetrit vajavad luba.');
  const de = await call({ country: 'ee', lat: '59.405', lon: '24.705', lang: 'de' });
  assert.equal(de.body.zones[0].desc, 'Operations higher than 50 metres require authorisation.');
  assert.equal(de.body.zones[0].lower, '51 m AGL');
  assert.equal(de.body.zones[0].legalUrl, 'https://transpordiamet.ee/en/flying');
  const free = await call({ country: 'ee', lat: '58.505', lon: '26.005' });
  assert.ok(!('info' in free.body.zones[0]));
  assert.equal(free.body.zones[0].type, 'NO_RESTRICTION');
  assert.equal(free.body.zones[0].color, '#3b82f6');
});

test('NO_RESTRICTION zählt als einschränkend: Reihenfolge bleibt die der Daten', async () => {
  const dir = process.env.SKYCHECK_DATA_DIR;
  const mk = (id, restriction) => ({ identifier: id, name: id, restriction, geometry: [{
    horizontalProjection: { type: 'Polygon', coordinates: [[[24, 59], [24.1, 59], [24.1, 59.1], [24, 59.1], [24, 59]]] } }] });
  writeFileSync(join(dir, 'uas-zones-ee.json'), JSON.stringify([mk('A', 'NO_RESTRICTION'), mk('B', 'PROHIBITED')]));
  fn._test.resetCache();
  const r = await call({ country: 'ee', lat: '59.05', lon: '24.05' });
  assert.deepEqual(r.body.zones.map(z => z.name), ['A', 'B']);
});

test('all=1 liefert alle Zonen in schlanker Form', async () => {
  const r = await call({ country: 'no', all: '1' });
  assert.equal(r.status, 200);
  assert.equal(r.body.all, true);
  assert.equal(r.body.zones.length, 2);
  assert.deepEqual(Object.keys(r.body.zones[0]).sort(), ['color', 'geometry', 'name', 'type']);
  assert.match(r.headers['Cache-Control'], /max-age=3600/);
});

test('unlesbare/korrupte Datendatei → 500', async () => {
  const keep = process.env.SKYCHECK_DATA_DIR;
  try {
    const bad = mkdtempSync(join(tmpdir(), 'corrupt-'));
    writeFileSync(join(bad, 'uas-zones-lu.json'), '{not json');
    process.env.SKYCHECK_DATA_DIR = bad;
    fn._test.resetCache();
    const r = await call({ country: 'lu', lat: '49.6', lon: '6.1' });
    assert.equal(r.status, 500);
  } finally {
    process.env.SKYCHECK_DATA_DIR = keep;
    fn._test.resetCache();
  }
});

// ── Inaktive Zonen (abgelaufene Aktivierungsfenster) ───────────────────────
const WINDOW = { startDateTime: '2026-10-07T09:40:00+02:00', endDateTime: '2026-10-07T19:00:00+02:00', permanent: 'NO' };
const mkZone = (id, restriction, applicability, extra = {}) => ({
  identifier: id, name: id, restriction, ...(applicability ? { applicability } : {}), ...extra,
  geometry: [{ horizontalProjection: { type: 'Polygon',
    coordinates: [[[24, 59], [24.1, 59], [24.1, 59.1], [24, 59.1], [24, 59]]] } }],
});
const useEeZones = (zones) => {
  writeFileSync(join(process.env.SKYCHECK_DATA_DIR, 'uas-zones-ee.json'), JSON.stringify(zones));
  fn._test.resetCache();
};
const at = (iso) => fn._test.setNow(Date.parse(iso));
const Q = { country: 'ee', lat: '59.05', lon: '24.05' };

test('abgelaufenes Aktivierungsfenster → inactive, grau, Hinweis mit Enddatum', async () => {
  try {
    useEeZones([mkZone('T1', 'PROHIBITED', [WINDOW], { message: 'Drone ban.' })]);
    at('2026-10-09T12:00:00Z');
    const z = (await call(Q)).body.zones[0];
    assert.equal(z.inactive, true);
    assert.equal(z.type, 'TEMPORARY_INACTIVE');
    assert.equal(z.color, '#64748b');
    assert.ok(z.desc.startsWith('Activation window ended 2026-10-07. May be reactivated — check the official source.'));
    assert.ok(z.desc.endsWith(' Drone ban.'));
    assert.ok(!('info' in z));
  } finally { fn._test.setNow(null); }
});

test('innerhalb des Aktivierungsfensters → nicht inactive, Originaltyp', async () => {
  try {
    useEeZones([mkZone('T1', 'PROHIBITED', [WINDOW])]);
    at('2026-10-07T10:00:00Z');
    const z = (await call(Q)).body.zones[0];
    assert.ok(!('inactive' in z));
    assert.equal(z.type, 'PROHIBITED');
    assert.equal(z.color, '#ef4444');
  } finally { fn._test.setNow(null); }
});

test('ein vergangenes und ein künftiges Fenster → nicht inactive', async () => {
  try {
    const future = { startDateTime: '2026-11-01T00:00:00Z', endDateTime: '2026-11-02T00:00:00Z', permanent: 'NO' };
    useEeZones([mkZone('T1', 'PROHIBITED', [WINDOW, future])]);
    at('2026-10-09T12:00:00Z');
    const z = (await call(Q)).body.zones[0];
    assert.ok(!('inactive' in z));
    assert.equal(z.type, 'PROHIBITED');
  } finally { fn._test.setNow(null); }
});

test('Fenster ohne oder mit unlesbarem Ende → nicht inactive', async () => {
  try {
    useEeZones([mkZone('N1', 'PROHIBITED', [{ permanent: 'YES' }]),
      mkZone('N2', 'PROHIBITED', [WINDOW, { endDateTime: 'kaputt' }]),
      mkZone('N3', 'PROHIBITED', [])]);
    at('2026-10-09T12:00:00Z');
    const zs = (await call(Q)).body.zones;
    assert.equal(zs.length, 3);
    assert.ok(zs.every(z => !z.inactive && z.type === 'PROHIBITED'));
  } finally { fn._test.setNow(null); }
});

test('LU-Fixture SPECI16 (Fenster 2023–2031) ist am 2026-10-09 nicht inactive', async () => {
  try {
    at('2026-10-09T12:00:00Z');
    const z = (await call({ country: 'lu', lat: '49.875', lon: '6.165', radius: '100' }))
      .body.zones.find(x => x.name === 'EL-UAS-S16');
    assert.ok(z);
    assert.ok(!('inactive' in z));
    assert.equal(z.type, 'REQ_AUTHORISATION');
  } finally { fn._test.setNow(null); }
});

test('Reihenfolge: einschränkend (inkl. NO_RESTRICTION) → inaktiv', async () => {
  try {
    useEeZones([mkZone('OLD', 'PROHIBITED', [WINDOW]), mkZone('FREE', 'NO_RESTRICTION'), mkZone('LIVE', 'REQ_AUTHORISATION')]);
    at('2026-10-09T12:00:00Z');
    assert.deepEqual((await call(Q)).body.zones.map(z => z.name), ['FREE', 'LIVE', 'OLD']);
  } finally { fn._test.setNow(null); }
});

test('inaktive NO_RESTRICTION-Zone ist inaktiv und grau', async () => {
  try {
    useEeZones([mkZone('OLDFREE', 'NO_RESTRICTION', [WINDOW])]);
    at('2026-10-09T12:00:00Z');
    const z = (await call(Q)).body.zones[0];
    assert.equal(z.inactive, true);
    assert.equal(z.type, 'TEMPORARY_INACTIVE');
    assert.equal(z.color, '#64748b');
    assert.ok(!('info' in z));
  } finally { fn._test.setNow(null); }
});

test('EE: realistische NO_RESTRICTION-Genehmigungszone (EER44FAUNA) ist gewöhnlich, blau und vor inaktiven', async () => {
  try {
    useEeZones([
      mkZone('OLD', 'PROHIBITED', [WINDOW]),
      mkZone('EER44FAUNA', 'NO_RESTRICTION', undefined, { reason: ['Nature'],
        message: 'Permission from the Estonian Environmental Board required' }),
    ]);
    at('2026-10-09T12:00:00Z');
    const zs = (await call(Q)).body.zones;
    assert.deepEqual(zs.map(z => z.name), ['EER44FAUNA', 'OLD']);
    assert.ok(!('info' in zs[0]));
    assert.equal(zs[0].type, 'NO_RESTRICTION');
    assert.equal(zs[0].color, '#3b82f6');
    assert.equal(zs[0].desc, 'Permission from the Estonian Environmental Board required');
  } finally { fn._test.setNow(null); }
});

test('all=1 liefert die inaktive Zone mit inactive:true und grauer Farbe', async () => {
  try {
    useEeZones([mkZone('T1', 'PROHIBITED', [WINDOW])]);
    at('2026-10-09T12:00:00Z');
    const r = await call({ country: 'ee', all: '1' });
    assert.equal(r.body.zones[0].inactive, true);
    assert.equal(r.body.zones[0].color, '#64748b');
    assert.equal(r.body.zones[0].type, 'TEMPORARY_INACTIVE');
  } finally { fn._test.setNow(null); }
});
