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

test('SE RSTA: nur LOWER === GND, PROHIBITED, Name = LOCATION, Beschreibung = COMMENT_2', () => {
  const r = layerOf(seZones(), 'RSTA');
  assert.equal(r.length, 1);                                   // ES R129 (400), R210 (FL 95), R204A (3000) fallen weg
  assert.equal(r[0].restriction, 'PROHIBITED');
  assert.equal(r[0].name, 'ES R107 FORSMARK');
  assert.match(r[0].message, /^Kärnkraftverk\./);
  assert.equal(r[0].identifier, 'SE-RSTA-ES_R107');
});

test('SE: Einstufung je Layer (RSTA rot, 5-km-Flughafenbereich genehmigungspflichtig, Rest bedingt)', () => {
  const z = seZones();
  const lv = {};
  for (const x of z.filter(x => !('applicability' in x))) (lv[x.identifier.split('-')[1]] ||= new Set()).add(x.restriction);
  const got = Object.fromEntries(Object.entries(lv).map(([k, v]) => [k, [...v].join(',')]));
  assert.deepEqual(got, { RSTA: 'PROHIBITED', RWY5K: 'REQ_AUTHORISATION', DNGA: 'CONDITIONAL',
    CTR: 'CONDITIONAL', ATZ: 'CONDITIONAL', TIZ: 'CONDITIONAL', HKP1K: 'CONDITIONAL' });
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

// ───────────────────────── Fix round 1 ─────────────────────────
const seEd = (mut) => {
  const d = JSON.parse(SE_RAW.ED318);
  mut(d.features);
  return JSON.stringify(d);
};
const buildSe = (over) => buildZonesFromDir('se', seDir(over), { min: 1 });

test('SE ED-318: limitedApplicability → applicability (Start+Ende → permanent NO, schedule unverändert)', () => {
  const sched = [{ day: ['MON'], startTime: '07:00:00Z', endTime: '16:00:00Z' }];
  const z = buildSe({ ED318: seEd(f => {
    f[0].properties.limitedApplicability = [{ startDateTime: '2025-11-10T00:00:00Z', endDateTime: '2027-05-31T23:59:00Z', schedule: sched }];
  }) });
  assert.deepEqual(byId(z, 'SE-ED318-ESU200').applicability,
    [{ startDateTime: '2025-11-10T00:00:00Z', endDateTime: '2027-05-31T23:59:00Z', permanent: 'NO', schedule: sched }]);
});

test('SE ED-318: nur Start → permanent YES ohne endDateTime-Schlüssel; mehrere Fenster je ein Eintrag', () => {
  const z = buildSe({ ED318: seEd(f => {
    f[0].properties.limitedApplicability = [{ startDateTime: '2025-10-27T00:00:00Z' },
      { startDateTime: '2026-01-01T00:00:00Z', endDateTime: '2026-02-01T00:00:00Z' }];
  }) });
  const a = byId(z, 'SE-ED318-ESU200').applicability;
  assert.equal(a.length, 2);
  assert.deepEqual(a[0], { startDateTime: '2025-10-27T00:00:00Z', permanent: 'YES' });
  assert.ok(!('endDateTime' in a[0]) && !('schedule' in a[0]));
  assert.equal(a[1].permanent, 'NO');
});

test('SE ED-318: ohne limitedApplicability kein applicability-Schlüssel; abgelaufene Zone wird nicht verworfen', () => {
  const z = buildSe({ ED318: seEd(f => {
    delete f[0].properties.limitedApplicability;
    f[1].properties.limitedApplicability = [{ startDateTime: '2020-01-01T00:00:00Z', endDateTime: '2020-02-01T00:00:00Z' }];
  }) });
  assert.ok(!('applicability' in byId(z, 'SE-ED318-ESU200')));
  assert.ok(byId(z, 'SE-ED318-ESU202'), 'abgelaufene Zone bleibt');
  assert.ok(layerOf(z, 'RSTA').every(x => !('applicability' in x)), 'nur ED-318 trägt applicability');
});

test('Einstufung: REQ_AUTHORIZATION wird zu REQ_AUTHORISATION, NO_RESTRICTION ist für SE erlaubt', () => {
  const z = buildSe({ ED318: seEd(f => { f[1].properties.type = 'NO_RESTRICTION'; }) });
  assert.equal(byId(z, 'SE-ED318-ESU200').restriction, 'REQ_AUTHORISATION');
  assert.equal(byId(z, 'SE-ED318-ESU202').restriction, 'NO_RESTRICTION');
});

const beWith = (mut) => {
  const d = JSON.parse(BE_RAW);
  mut(d.features);
  return JSON.stringify(d);
};
const beNormal = f => f.find(x => x.properties.unique_identifier && x.properties.type_code === 'CIV_HELISTRIP');

test('BE: US-Schreibweise wird normalisiert; null, leer und unbekannte Einstufung brechen mit Land+Wert ab', () => {
  const ok = buildZones('be', beWith(f => { beNormal(f).properties.restriction = 'REQ_AUTHORIZATION'; }), { min: 1 });
  assert.ok(ok.some(x => x.typeCode === 'CIV_HELISTRIP' && x.restriction === 'REQ_AUTHORISATION'));
  assert.equal(buildZones('be', beWith(f => { beNormal(f).properties.restriction = 'NO_RESTRICTION'; }), { min: 1 })
    .find(x => x.typeCode === 'CIV_HELISTRIP').restriction, 'NO_RESTRICTION');
  assert.throws(() => buildZones('be', beWith(f => { beNormal(f).properties.restriction = null; }), { min: 1 }), /be.*null/);
  assert.throws(() => buildZones('be', beWith(f => { beNormal(f).properties.restriction = ''; }), { min: 1 }), /be/);
  assert.throws(() => buildZones('be', beWith(f => { beNormal(f).properties.restriction = 'MAYBE'; }), { min: 1 }), /be.*MAYBE/);
});

test('SE ED-318: unbekannte Einstufung nennt Land und Wert', () => {
  assert.throws(() => buildSe({ ED318: seEd(f => { f[0].properties.type = 'WHATEVER'; }) }), /se.*WHATEVER/);
});

test('mais-Kennungen hängen nicht an IDNR: Name (RSTA/DNGA/ATZ/TIZ), MSID (CTR), kompakt ohne Leerzeichen', () => {
  const mod = (k, over) => { const d = JSON.parse(SE_RAW[k]); Object.assign(d.features[0].properties, over); return JSON.stringify(d); };
  const a = buildSe({ RSTA: mod('RSTA', { IDNR: 1 }), TIZ: mod('TIZ', { IDNR: 2 }) });
  const b = buildSe({ RSTA: mod('RSTA', { IDNR: 77777 }), TIZ: mod('TIZ', { IDNR: 88888 }) });
  assert.deepEqual(a.map(x => x.identifier), b.map(x => x.identifier));
  assert.ok(byId(a, 'SE-RSTA-ES_R107'));
  assert.ok(byId(a, 'SE-TIZ-HAGFORS_TIZ_RMZ'));
  assert.ok(byId(a, 'SE-ATZ-SKÅ-EDEBY_ATZ'));
  assert.ok(byId(a, 'SE-CTR-4065'));                           // MSID von ROENNE CTR
  assert.ok(a.every(x => !/\s/.test(x.identifier)));
});

test('gemeinsamer Schluss: leerer/undefinierter Name oder Kennung und doppelte Kennungen brechen ab', () => {
  const lfvDup = JSON.parse(SE_RAW.TIZ);
  lfvDup.features[1].properties.NAMEOFAREA = lfvDup.features[0].properties.NAMEOFAREA;
  lfvDup.features[1].properties.LOCATION = 'X';
  assert.throws(() => buildSe({ TIZ: JSON.stringify(lfvDup) }), /nicht eindeutig/);
  const noName = JSON.parse(SE_RAW.TIZ);
  noName.features[0].properties.LOCATION = ''; noName.features[0].properties.NAMEOFAREA = '';
  assert.throws(() => buildSe({ TIZ: JSON.stringify(noName) }), /Name|Kennung/);
  const noId = JSON.parse(SE_RAW.CTR);
  delete noId.features[0].properties.MSID;
  assert.throws(() => buildSe({ CTR: JSON.stringify(noId) }), /Kennung/);
  assert.throws(() => buildZones('be', beWith(f => { f[0].properties.unique_identifier = null; f[0].properties.code = null; }), { min: 1 }), /Kennung/);
  const dupBe = beWith(f => { const k = f.filter(x => x.properties.type_code === 'CIV_PORT'); k[1].properties.unique_identifier = k[0].properties.unique_identifier; });
  assert.throws(() => buildZones('be', dupBe, { min: 1 }), /nicht eindeutig/);
});

test('SE Höhen: unbekannte Form bricht ab; gnd/unl/fl sind nicht case-sensitiv', () => {
  const mod = (k, i, over) => { const d = JSON.parse(SE_RAW[k]); Object.assign(d.features[i].properties, over); return JSON.stringify(d); };
  assert.throws(() => buildSe({ DNGA: mod('DNGA', 0, { UPPER: '1500 FT AMSL' }) }), /1500 FT AMSL/);
  assert.throws(() => buildSe({ TIZ: mod('TIZ', 0, { LOWER: 'SFC' }) }), /SFC/);
  const z = buildSe({ RSTA: mod('RSTA', 1, { LOWER: 'gnd' }), DNGA: mod('DNGA', 0, { UPPER: 'unl' }),
    TIZ: mod('TIZ', 0, { UPPER: 'fl 95' }) });
  assert.ok(layerOf(z, 'RSTA').some(x => x.identifier === 'SE-RSTA-ES_R129'), 'LOWER "gnd" bleibt im RSTA-Filter');
  assert.ok(!('upperLimit' in layerOf(z, 'DNGA').find(x => x.name === 'ES D182 SATTAVAARA').geometry[0]));
  assert.equal(layerOf(z, 'TIZ')[0].geometry[0].upperLimit, 9500);
  assert.equal(layerOf(z, 'TIZ')[0].geometry[0].upperVerticalReference, 'STD');
});

// ───────────────────────── Fix round 2 ─────────────────────────
test('Namensprüfung (a): CTR mit intakter MSID aber leerem Namen → Namensfehler, nicht Kennungsfehler', () => {
  const d = JSON.parse(SE_RAW.CTR);
  d.features[0].properties.LOCATION = ''; d.features[0].properties.NAMEOFAREA = '';
  assert.throws(() => buildSe({ CTR: JSON.stringify(d) }), err => /Name/.test(err.message) && !/Kennung/.test(err.message));
});

test('Namensprüfung (b): Heliport ohne LOCATION ergäbe "Heliport 1 km: undefined" → Abbruch', () => {
  const d = JSON.parse(SE_RAW.HKP1K);
  delete d.features[0].properties.LOCATION;
  assert.throws(() => buildSe({ HKP1K: JSON.stringify(d) }), err => /Name/.test(err.message));
});

test('Validierung nur auf ganze Tokens: "NaNo" im Wort ist erlaubt, undefined/null als Wort nicht', () => {
  const d = JSON.parse(SE_RAW.HKP1K);
  d.features[0].properties.LOCATION = 'Nanortalik NaNo Park';
  const z = buildSe({ HKP1K: JSON.stringify(d) });
  assert.ok(z.some(x => x.name === 'Heliport 1 km: Nanortalik NaNo Park'));
  const u = JSON.parse(SE_RAW.HKP1K);
  u.features[0].properties.LOCATION = 'undefined';
  assert.throws(() => buildSe({ HKP1K: JSON.stringify(u) }), /Name/);
  const c = JSON.parse(SE_RAW.CTR);
  c.features[0].properties.MSID = 'null';
  assert.throws(() => buildSe({ CTR: JSON.stringify(c) }), /Kennung/);
});

test('Validierung läuft nach dem Geometriefilter: unbrauchbare Zone ohne Namen bricht LU nicht ab', () => {
  const d = JSON.parse(LU_RAW.slice(1));
  d.features.push({ identifier: '', name: '', restriction: 'PROHIBITED', geometry: [] });
  const z = buildZones('lu', JSON.stringify(d), { min: 1 });
  assert.deepEqual(z.map(x => x.identifier), ['SPECI16', 'P1']);
});
