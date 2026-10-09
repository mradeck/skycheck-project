import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { buildZones, buildZonesFromDir, buildSeZones } from '../scripts/build-eu-zones.mjs';
import { LU_RAW, NO_RAW, EE_RAW, SE_RAW, BE_RAW } from './fixtures/zones.mjs';

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

// ───────────────────────── Schweden ─────────────────────────
const SE_FILE_NAMES = { RSTA: 'RSTA.json', DNGA: 'DNGA.json', ATZ: 'ATZ.json', TIZ: 'TIZ.json',
  CTR: 'CTR.json', HKP1K: 'HKP1K.json', RWY5K: 'RWY5K.json', ED318: 'uas_zones_ED318.json' };
function seDir(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'se-'));
  for (const [k, f] of Object.entries(SE_FILE_NAMES)) {
    if (overrides[k] === null) continue;                       // Datei fehlt
    writeFileSync(join(dir, f), overrides[k] !== undefined ? overrides[k] : SE_RAW[k]);
  }
  return dir;
}
const seZones = () => buildZonesFromDir('se', seDir(), { min: 1 });
const byId = (zs, id) => zs.find(z => z.identifier === id);
const layerOf = (zs, l) => zs.filter(z => z.typeCode === l);

test('SE: Gesamtzahl und eindeutige, stabile Kennungen SE-<Layer>-<Schlüssel>', () => {
  const z = seZones();
  assert.equal(z.length, 16);                                  // 1+3+1+2+2+2+2+3
  assert.equal(new Set(z.map(x => x.identifier)).size, z.length);
  assert.ok(z.every(x => /^SE-[A-Z0-9]+-\S+$/.test(x.identifier)));
  assert.ok(z.every(x => x.country === 'SWE'));
  assert.deepEqual(z[0].zoneAuthority, [{ name: 'LFV / Transportstyrelsen (CC BY 4.0)', siteURL: 'https://dronechart.lfv.se/' }]);
});

test('SE RSTA: nur LOWER === GND, REQ_AUTHORISATION, Name = LOCATION, Beschreibung = COMMENT_2', () => {
  const r = layerOf(seZones(), 'RSTA');
  assert.equal(r.length, 1);                                   // ES R129 (400), R210 (FL 95), R204A (3000) fallen weg
  assert.equal(r[0].restriction, 'REQ_AUTHORISATION');
  assert.equal(r[0].name, 'ES R107 FORSMARK');
  assert.match(r[0].message, /^Kärnkraftverk\./);
  assert.equal(r[0].identifier, 'SE-RSTA-30109');
});

test('SE Höhen: GND → 0 AGL; Zahl → Fuß AMSL', () => {
  const g = layerOf(seZones(), 'RSTA')[0].geometry[0];
  assert.deepEqual([g.uomDimensions, g.lowerLimit, g.lowerVerticalReference, g.upperLimit, g.upperVerticalReference],
    ['FT', 0, 'AGL', 2000, 'AMSL']);
});

test('SE Höhen: FL nnn → nnn×100 Fuß, Bezug STD; UNL → kein oberer Wert', () => {
  const d = layerOf(seZones(), 'DNGA');
  const fl = d.find(z => z.name.includes('ES D') && z.geometry[0].upperVerticalReference === 'STD');
  assert.equal(fl.geometry[0].upperLimit, 66000);
  assert.equal(fl.geometry[0].uomDimensions, 'FT');
  const unl = d.find(z => z.geometry[0].upperLimit === undefined);
  assert.ok(unl, 'UNL-Zone ohne upperLimit');
  assert.ok(!('upperVerticalReference' in unl.geometry[0]));
  assert.equal(unl.geometry[0].lowerLimit, 0);
  assert.equal(unl.restriction, 'CONDITIONAL');
});

test('SE DNGA: Beschreibung aus COMMENT_2 (zweisprachig, aus den Daten)', () => {
  const d = layerOf(seZones(), 'DNGA');
  assert.ok(d.every(z => typeof z.message === 'string'));
  assert.ok(d.some(z => /Laser activity/.test(z.message)));
});

test('SE ATZ/CTR: Einträge mit POSITIONINDICATOR ESGP fallen weg, Rest ist CONDITIONAL mit festem Satz', () => {
  const z = seZones();
  const atz = layerOf(z, 'ATZ'), ctr = layerOf(z, 'CTR');
  assert.equal(atz.length, 1);
  assert.equal(ctr.length, 2);
  assert.ok([...atz, ...ctr].every(x => !/GOTEBORG CITY/.test(x.name)));
  assert.ok([...atz, ...ctr].every(x => x.restriction === 'CONDITIONAL'));
  assert.equal(ctr[0].message, 'Control zone. Conditions for drone flights apply — see dronechart.lfv.se and the rules of Transportstyrelsen.');
  assert.match(atz[0].message, /^Aerodrome traffic zone\. /);
  assert.equal(ctr[0].geometry[0].upperLimit, 1500);           // CTR ROENNE: UPPER 1500 ft
});

test('SE TIZ: CONDITIONAL, fester Satz, Höhe aus UPPER', () => {
  const t = layerOf(seZones(), 'TIZ');
  assert.equal(t.length, 2);
  assert.ok(t.every(x => x.restriction === 'CONDITIONAL' && /^Traffic information zone\. /.test(x.message)));
  assert.equal(t[0].name, 'HAGFORS TIZ/RMZ');
  assert.equal(t[0].geometry[0].upperLimit, 2300);
});

test('SE RWY5K/HKP1K: MultiPolygon → ein Volumen je Teilpolygon, ohne Höhen, Namenspräfix', () => {
  const z = seZones();
  const rwy = layerOf(z, 'RWY5K'), hkp = layerOf(z, 'HKP1K');
  assert.equal(rwy[0].name, 'Airport 5 km: STURUP CTR');
  assert.equal(rwy[0].restriction, 'REQ_AUTHORISATION');
  assert.equal(hkp[0].name, 'Heliport 1 km: Kriegers Flak B');
  assert.equal(hkp[0].restriction, 'CONDITIONAL');
  const multi = [...rwy, ...hkp].find(x => x.geometry.length > 1);
  assert.ok(multi, 'mindestens eine Zone mit mehreren Volumen');
  for (const x of [...rwy, ...hkp]) for (const v of x.geometry) {
    assert.equal(v.horizontalProjection.type, 'Polygon');
    assert.ok(!('lowerLimit' in v) && !('upperLimit' in v));
  }
  assert.match(rwy[0].message, /^Airport zone, 5 km/);
  assert.match(hkp[0].message, /^Heliport zone, 1 km/);
});

test('SE ED-318: Kreis (Point + extent), Polygon, Einstufung abgebildet, Sprachfassungen', () => {
  const z = seZones();
  const circle = byId(z, 'SE-ED318-ESU200');
  assert.equal(circle.restriction, 'REQ_AUTHORISATION');       // REQ_AUTHORIZATION → REQ_AUTHORISATION
  assert.equal(circle.name, 'Stornorrforsen hydro power plant');
  const hp = circle.geometry[0].horizontalProjection;
  assert.equal(hp.type, 'Circle');
  assert.equal(hp.radius, 500);
  assert.deepEqual(hp.center, [20.05111, 63.85222]);           // gerundet auf 5 Stellen
  assert.deepEqual([circle.geometry[0].uomDimensions, circle.geometry[0].upperLimit, circle.geometry[0].upperVerticalReference], ['M', 150, 'AGL']);
  assert.match(circle.message, /^Access prohibited/);
  const langs = circle.extendedProperties.localizedMessages.map(m => m.language);
  assert.deepEqual(langs, ['en-GB', 'sv-SE']);
  assert.match(circle.extendedProperties.localizedMessages[1].message, /^Tillträde förbjudet/);
  const poly = byId(z, 'SE-ED318-ESU202');
  assert.equal(poly.geometry[0].horizontalProjection.type, 'Polygon');
  const ft = byId(z, 'SE-ED318-ESU209');
  assert.deepEqual([ft.geometry[0].uomDimensions, ft.geometry[0].upperLimit, ft.geometry[0].upperVerticalReference], ['FT', 1500, 'AMSL']);
});

test('SE: unbekannte ED-318-Einstufung → Fehler', () => {
  const bad = JSON.parse(SE_RAW.ED318);
  bad.features[0].properties.type = 'WHATEVER';
  assert.throws(() => buildZonesFromDir('se', seDir({ ED318: JSON.stringify(bad) }), { min: 1 }), /Einstufung/);
});

test('SE: alle Namen, Höhen und Koordinaten sind endlich (kein NaN/undefined)', () => {
  for (const z of seZones()) {
    assert.ok(typeof z.name === 'string' && z.name && !/undefined|NaN/.test(z.name), z.identifier);
    for (const v of z.geometry) {
      for (const k of ['lowerLimit', 'upperLimit']) if (k in v) assert.ok(Number.isFinite(v[k]), z.identifier + k);
      const hp = v.horizontalProjection;
      const pts = hp.type === 'Circle' ? [hp.center] : hp.coordinates.flat();
      assert.ok(pts.every(p => Number.isFinite(p[0]) && Number.isFinite(p[1])), z.identifier);
    }
  }
});

test('SE: fehlende Datei → Abbruch (kein Teil-Snapshot)', () => {
  assert.throws(() => buildZonesFromDir('se', seDir({ CTR: null }), { min: 1 }), /CTR\.json/);
});

test('SE: leere oder unlesbare Datei → Abbruch', () => {
  assert.throws(() => buildZonesFromDir('se', seDir({ TIZ: '' }), { min: 1 }), /TIZ\.json/);
  assert.throws(() => buildZonesFromDir('se', seDir({ RSTA: '<html>502</html>' }), { min: 1 }));
  assert.throws(() => buildZonesFromDir('se', seDir({ DNGA: JSON.stringify({ type: 'FeatureCollection', features: [] }) }), { min: 1 }), /DNGA/);
});

test('SE: Mindestanzahl 250 greift ohne opts; buildZones(se) verlangt ein Verzeichnis', () => {
  assert.throws(() => buildZonesFromDir('se', seDir()), /zu wenige Zonen/);
  assert.throws(() => buildZones('se', '{}', { min: 1 }), /Verzeichnis/);
});

test('SE: Koordinaten gerundet, Ringe ≥ 4 Punkte, MultiPolygon-Teile bleiben Polygone', () => {
  const rwy = layerOf(seZones(), 'RWY5K')[0];
  for (const v of rwy.geometry) for (const ring of v.horizontalProjection.coordinates) {
    assert.ok(ring.length >= 4);
    assert.ok(ring.flat().every(n => Math.round(n * 1e5) / 1e5 === n));
  }
});

test('SE CLI: Verzeichnis → Ausgabe + .version, fehlende Datei lässt Zieldatei unberührt', () => {
  const dir = seDir(); const outDir = mkdtempSync(join(tmpdir(), 'seo-'));
  const out = join(outDir, 'uas-zones-se.json');
  execFileSync('node', [SCRIPT, 'se', dir, out, '--min', '1']);
  const body = readFileSync(out);
  assert.equal(JSON.parse(body).length, 16);
  assert.equal(readFileSync(join(outDir, 'uas-zones-se.version'), 'utf8').trim(),
    createHash('sha256').update(body).digest('hex'));
  const broken = seDir({ HKP1K: null });
  assert.throws(() => execFileSync('node', [SCRIPT, 'se', broken, out, '--min', '1'], { stdio: 'pipe' }));
  assert.equal(JSON.parse(readFileSync(out)).length, 16, 'alter Snapshot bleibt');
});

// ───────────────────────── Belgien ─────────────────────────
const beZones = () => buildZones('be', BE_RAW, { min: 1 });
const beNames = () => beZones().map(z => z.name);

test('BE: TIME_ZONE, NOTAM und TEMPORARY-NO-FLY-ZONE fallen weg', () => {
  const z = beZones();
  assert.ok(z.every(x => !['TIME_ZONE', 'NOTAM', 'TEMPORARY-NO-FLY-ZONE'].includes(x.typeCode)));
  assert.ok(!z.some(x => x.name === 'Europe/Brussels'));
});

test('BE: Zonen, die über 120 m beginnen, fallen weg; fehlender unterer Wert zählt als 0', () => {
  const z = beZones();
  assert.equal(z.length, 4);        // normal, mehrsprachig, Klartext, ohne unteren Wert (>120 m, NOTAM, TEMP, TIME_ZONE raus)
  const nolow = z.find(x => x.name === 'No lower value');
  assert.ok(nolow, 'Zone ohne unteren Wert bleibt');
  assert.equal(nolow.geometry[0].lowerLimit, 0);
  assert.ok(!('upperLimit' in nolow.geometry[0]), 'ohne oberen Wert kein upperLimit');
});

test('BE: Namens-JSON → en, Klartext bleibt; Höhen aus *_meter_agl gerundet, M, AGL', () => {
  const z = beZones();
  const normal = z.find(x => x.name === 'EBMH - MALDEGEM - Huysman (UGZ)');
  assert.ok(normal);
  const v = normal.geometry[0];
  assert.deepEqual([v.uomDimensions, v.lowerLimit, v.lowerVerticalReference, v.upperLimit, v.upperVerticalReference],
    ['M', 0, 'AGL', 1372, 'AGL']);                             // 1371.73 → 1372
  const plain = z.find(x => x.name === 'Plain text name');
  assert.equal(plain.geometry[0].upperLimit, 80);              // 80.4 → 80
  assert.equal(plain.message, 'Plain description');
  assert.ok(!plain.extendedProperties);
});

test('BE: mehrsprachige Beschreibung → message = en, alle Fassungen in localizedMessages', () => {
  const m = beZones().find(x => x.name === 'Police activities');
  assert.equal(m.message, 'No flights');
  assert.deepEqual(m.extendedProperties.localizedMessages.map(l => l.language).sort(), ['de', 'en', 'fr', 'nl']);
  assert.equal(m.extendedProperties.localizedMessages.find(l => l.language === 'de').message, 'Keine Flüge');
});

test('BE: Einstufung, Typ, Behörde, Land, Kennung', () => {
  const z = beZones();
  assert.equal(z.find(x => x.name === 'Police activities').restriction, 'PROHIBITED');
  const normal = z.find(x => x.typeCode === 'CIV_HELISTRIP');
  assert.equal(normal.restriction, 'REQ_AUTHORISATION');
  assert.equal(normal.country, 'BEL');
  assert.equal(normal.message, '');                             // description null
  assert.deepEqual(normal.zoneAuthority, [{ name: 'BCAA / skeyes (Droneguide)', siteURL: 'https://map.droneguide.be/' }]);
  assert.equal(new Set(z.map(x => x.identifier)).size, z.length);
  assert.ok(beNames().every(n => n && !/undefined|NaN/.test(n)));
});

test('BE: Mindestanzahl 300 greift ohne opts', () => {
  assert.throws(() => buildZones('be', BE_RAW), /zu wenige Zonen/);
});

test('BE CLI: Datei → Ausgabe; LU/NO/EE-Aufruf unverändert', () => {
  const dir = mkdtempSync(join(tmpdir(), 'be-'));
  const inp = join(dir, 'in.json'); const out = join(dir, 'uas-zones-be.json');
  writeFileSync(inp, BE_RAW);
  execFileSync('node', [SCRIPT, 'be', inp, out, '--min', '1']);
  assert.equal(JSON.parse(readFileSync(out)).length, 4);
  writeFileSync(inp, NO_RAW);
  execFileSync('node', [SCRIPT, 'no', inp, out, '--min', '1']);
  assert.equal(JSON.parse(readFileSync(out)).length, 2);
});
