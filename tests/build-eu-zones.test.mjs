import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { buildZones } from '../scripts/build-eu-zones.mjs';
import { LU_RAW, NO_RAW, EE_RAW } from './fixtures/zones.mjs';

const SCRIPT = new URL('../scripts/build-eu-zones.mjs', import.meta.url).pathname;

test('LU: BOM wird entfernt, features-Wrapper aufgelöst, Zone ohne Geometrie verworfen', () => {
  const z = buildZones('lu', LU_RAW, { min: 1 });
  assert.equal(z.length, 2);
  assert.deepEqual(z.map(x => x.identifier), ['SPECI16', 'P1']);
});

test('LU: befristete applicability wird NICHT gefiltert (nur NO filtert)', () => {
  const z = buildZones('lu', LU_RAW, { min: 1 });
  assert.ok(z.some(x => x.identifier === 'SPECI16'));
});

test('Koordinaten werden auf 5 Nachkommastellen gerundet', () => {
  const z = buildZones('lu', LU_RAW, { min: 1 });
  const p = z[0].geometry[0].horizontalProjection.coordinates[0][0];
  assert.deepEqual(p, [6.15976, 49.87169]);
});

test('aufeinanderfolgende identische Punkte fallen weg, Ring bleibt geschlossen', () => {
  const raw = JSON.stringify([{ identifier: 'D', name: 'D', restriction: 'PROHIBITED', geometry: [{
    horizontalProjection: { type: 'Polygon', coordinates: [[
      [6, 49], [6.000001, 49.000001], [6.1, 49], [6.1, 49.1], [6, 49.1], [6, 49]]] } }] }]);
  const ring = buildZones('lu', raw, { min: 1 })[0].geometry[0].horizontalProjection.coordinates[0];
  assert.equal(ring.length, 5);
  assert.deepEqual(ring[0], ring[ring.length - 1]);
});

test('NO: befristete Zone fällt weg, dauerhafte bleiben', () => {
  const z = buildZones('no', NO_RAW, { min: 1 });
  assert.deepEqual(z.map(x => x.identifier), ['666927C', 'NAT1']);
});

test('EE: Feature → Zone, geometry als Array, reason als Array, Darstellungsfelder weg, hidden verworfen', () => {
  const z = buildZones('ee', EE_RAW, { min: 1 });
  assert.deepEqual(z.map(x => x.identifier), ['EEGZ24S', 'FREE1']);
  const a = z[0];
  assert.ok(Array.isArray(a.geometry) && a.geometry.length === 1);
  assert.equal(a.geometry[0].horizontalProjection.type, 'Polygon');
  assert.deepEqual(a.reason, ['Air traffic']);
  for (const k of ['strokeColor', 'fillColor', 'hidden', 'metaData', 'lower', 'lowerMeters',
    'upper', 'upperMeters', 'airspacetype', 'airspaceclass']) assert.ok(!(k in a), k);
  assert.equal(a.extendedProperties.localizedMessages.length, 2);
});

test('Mindestanzahl: zu wenige Zonen → Fehler', () => {
  assert.throws(() => buildZones('no', NO_RAW, { min: 500 }), /zu wenige Zonen/);
});

test('Standard-Mindestwerte greifen ohne opts', () => {
  assert.throws(() => buildZones('lu', LU_RAW), /zu wenige Zonen/);
});

test('kaputtes JSON und unbekanntes Land → Fehler', () => {
  assert.throws(() => buildZones('lu', '<html>Service unavailable</html>'));
  assert.throws(() => buildZones('xx', '[]'), /unbekanntes Land/);
});

test('CLI: schreibt Ausgabe + .version (SHA-256), Fehlerfall lässt Zieldatei unberührt', () => {
  const dir = mkdtempSync(join(tmpdir(), 'euz-'));
  const inp = join(dir, 'in.json'); const out = join(dir, 'uas-zones-lu.json');
  writeFileSync(inp, LU_RAW);
  execFileSync('node', [SCRIPT, 'lu', inp, out, '--min', '1']);
  const body = readFileSync(out);
  assert.equal(JSON.parse(body).length, 2);
  assert.equal(readFileSync(join(dir, 'uas-zones-lu.version'), 'utf8').trim(),
    createHash('sha256').update(body).digest('hex'));

  writeFileSync(inp, '[]');
  assert.throws(() => execFileSync('node', [SCRIPT, 'lu', inp, out, '--min', '1'], { stdio: 'pipe' }));
  assert.equal(JSON.parse(readFileSync(out)).length, 2, 'alter Snapshot bleibt');
  assert.ok(existsSync(out));
});
