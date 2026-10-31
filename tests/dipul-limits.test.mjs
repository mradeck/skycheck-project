// DiPUL-Schemawechsel (2026-10): Höhengrenzen kommen jetzt als lower_limit_m_agl /
// lower_limit_ft_msl / upper_limit_ft_msl / upper_limit_fl_pa. Prüft dipulLimits + CTR-Höhe.
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

const lib = new Function(`
  const FT_TO_M = 0.3048;
  ${grab('altitudeToMetres')}
  ${grab('dipulLimits')}
  ${grab('computeCtrFlightInfo')}
  return { dipulLimits, computeCtrFlightInfo };
`)();
const { dipulLimits, computeCtrFlightInfo } = lib;

test('WFS numerisch, EDDM Zone 3: 1634.6 ft MSL -> 498.2 m, max 40 m AGL bei 458 m Gelände', () => {
  const r = dipulLimits({ lower_limit_m_agl: 45, lower_limit_ft_msl: 1634.6, upper_limit_ft_msl: 3500, upper_limit_fl_pa: null });
  assert.ok(Math.abs(r.lowerMslM - 498.2) < 0.05);
  assert.equal(r.lower, '1634.6 ft MSL');
  assert.equal(r.lowerRef, 'MSL');
  assert.equal(r.lowerUnit, 'ft');
  assert.equal(r.upper, '3500 ft MSL');
  const info = computeCtrFlightInfo({ zoneNum: 3, lowerMslM: r.lowerMslM, ctrExact: true }, 458);
  assert.equal(info.maxAglM, 40);
});

test('Zone 4 bei 1815.1 ft und Gelände 500 m -> 53 m AGL', () => {
  const r = dipulLimits({ lower_limit_m_agl: 100, lower_limit_ft_msl: 1815.1, upper_limit_ft_msl: 3500 });
  const info = computeCtrFlightInfo({ zoneNum: 4, lowerMslM: r.lowerMslM, ctrExact: true }, 500);
  assert.equal(info.maxAglM, 53);
});

test('GFI-Strings ("1569.0", "25.0", "3500.0") werden normalisiert', () => {
  const r = dipulLimits({ lower_limit_m_agl: '25.0', lower_limit_ft_msl: '1569.0', upper_limit_ft_msl: '3500.0', upper_limit_fl_pa: '' });
  assert.ok(Math.abs(r.lowerMslM - 478.2) < 0.05);
  assert.equal(r.lower, '1569 ft MSL');
  assert.equal(r.lowerRaw, 1569);
  assert.equal(r.upper, '3500 ft MSL');
});

test('plain CTR / RESTRICTED mit 0 ft MSL -> GND, kein MSL-Wert', () => {
  for (const p of [
    { lower_limit_m_agl: null, lower_limit_ft_msl: 0, upper_limit_ft_msl: 3500 },
    { lower_limit_m_agl: '', lower_limit_ft_msl: '0.0', upper_limit_ft_msl: '', upper_limit_fl_pa: '' },
  ]) {
    const r = dipulLimits(p);
    assert.equal(r.lower, 'GND');
    assert.equal(r.lowerMslM, null);
    assert.equal(r.lowerRaw, 0);
  }
});

test('Layer nur mit lower_limit_m_agl', () => {
  const r = dipulLimits({ lower_limit_m_agl: 25 });
  assert.equal(r.lower, '25 m AGL');
  assert.equal(r.lowerMslM, null);
  assert.equal(r.upper, '—');
  assert.equal(dipulLimits({ lower_limit_m_agl: '0.0' }).lower, 'GND');
});

test('Obergrenze als Flugfläche', () => {
  const r = dipulLimits({ lower_limit_ft_msl: 0, upper_limit_ft_msl: null, upper_limit_fl_pa: 100 });
  assert.equal(r.upper, 'FL 100');
});

test('Leere Strings werden nicht zu 0 ft MSL oder Zahlen', () => {
  const r = dipulLimits({ lower_limit_m_agl: '  ', lower_limit_ft_msl: '', upper_limit_ft_msl: ' ', upper_limit_fl_pa: '' });
  assert.equal(r.lower, 'GND');
  assert.equal(r.upper, '—');
  assert.equal(r.lowerMslM, null);
});

test('Altes Schema bleibt Fallback', () => {
  const r = dipulLimits({ lower_limit_altitude: '1634.6', lower_limit_alt_ref: 'MSL', lower_limit_unit: 'ft', upper_limit_altitude: '3500.0', upper_limit_unit: 'ft', upper_limit_alt_ref: 'MSL' });
  assert.ok(Math.abs(r.lowerMslM - 498.2) < 0.05);
  assert.equal(r.lower, '1634.6 ft MSL');
  assert.equal(r.upper, '3500.0 ft MSL');
  assert.equal(dipulLimits({ lower_limit_altitude: '0.0', lower_limit_alt_ref: 'AGL', lower_limit_unit: 'm', upper_limit_altitude: '99999.0' }).upper, 'UNL');
  assert.equal(dipulLimits({ untere_grenze: '0.0', obere_grenze: 'UNL' }).lower, 'GND');
  assert.equal(dipulLimits({}).lower, 'GND');
  assert.equal(dipulLimits({}).upper, '—');
});
