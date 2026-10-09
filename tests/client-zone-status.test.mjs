// Zieht reine Funktionen per Namenssuche aus skycheck.html und prüft sie mit Stubs.
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

const PLACEHOLDER = { unavailable: true, name: '', type: 'DATA_UNAVAILABLE', color: '#64748b',
  lower: '—', upper: '—', legal: '—', legalUrl: '', desc: '' };

// Gemeinsame Stubs für alles, was die herausgezogenen Funktionen aus dem Seitenkontext lesen.
function sandbox(extra = '') {
  return `
    const _t = k => (typeof k === 'string' ? 'T:' + k : k);
    const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
    const isCtrZone = () => false;
    ${extra}
    ${grab('zoneDataUnavailable')}
    ${grab('evalZoneStatus')}
  `;
}
const run = (body, extra) => new Function(`${sandbox(extra)}\n${body}`)();

test('Platzhalter hat exakt die vereinbarte Form', () => {
  assert.deepEqual(run('return zoneDataUnavailable();'), PLACEHOLDER);
});

test('leere Liste → go ohne Gründe (Erfolg ohne Treffer bleibt grün)', () => {
  assert.deepEqual(run('return evalZoneStatus([]);'), { lvl: 'go', reasons: [] });
});

test('nur Platzhalter → warn, Grund zoneDataUnavailable an erster Stelle', () => {
  const r = run('return evalZoneStatus([zoneDataUnavailable()]);');
  assert.equal(r.lvl, 'warn');
  assert.equal(r.reasons[0], 'T:zoneDataUnavailable');
});

test('Platzhalter + PROHIBITED-Zone → nogo, Ausfall-Grund steht trotzdem vorn', () => {
  const r = run(`return evalZoneStatus([
    { name: 'ENR412', type: 'PROHIBITED', notam: true }, zoneDataUnavailable()]);`);
  assert.equal(r.lvl, 'nogo');
  assert.equal(r.reasons[0], 'T:zoneDataUnavailable');
  assert.ok(r.reasons.length >= 2);
});

test('Platzhalter + gewöhnliche Zone → warn, Ausfall-Grund vorn, Zonenname dahinter', () => {
  const r = run(`return evalZoneStatus([
    { name: 'EEGZ1', type: 'REQ_AUTHORISATION' }, zoneDataUnavailable()]);`);
  assert.equal(r.lvl, 'warn');
  assert.deepEqual(r.reasons, ['T:zoneDataUnavailable', 'EEGZ1']);
});

// ── Verteiler ────────────────────────────────────────────────────────────────
function dispatcher(country, adapters, extra = '') {
  const names = ['fetchZonesCH', 'fetchZonesES', 'fetchZonesESEasa', 'fetchZonesAT', 'fetchZonesDK',
    'fetchZonesIE', 'fetchZonesNL', 'fetchZonesPT', 'fetchZonesFR', 'fetchZonesDE', 'fetchZonesEd269'];
  const stubs = names.map(n => `const ${n} = ${adapters[n] || 'async () => { throw new Error("nicht erwartet: ' + n + '"); }'};`).join('\n');
  return new Function(`
    const _t = k => 'T:' + k;
    const COUNTRY = ${JSON.stringify(country)};
    const ED269_COUNTRIES = { lu: 1, no: 1, ee: 1 };
    const esEasa = () => false;
    const console = { warn() {}, info() {}, log() {} };
    ${extra || 'const notamNoHits = () => [];'}
    ${stubs}
    ${grab('zoneDataUnavailable')}
    ${grab('fetchZones')}
    return fetchZones(60, 10, 100);
  `)();
}

for (const [country, adapter] of [['de', 'fetchZonesDE'], ['fr', 'fetchZonesFR'], ['at', 'fetchZonesAT'],
  ['ch', 'fetchZonesCH'], ['es', 'fetchZonesESEasa'], ['dk', 'fetchZonesDK'], ['ie', 'fetchZonesIE'],
  ['nl', 'fetchZonesNL'], ['pt', 'fetchZonesPT'], ['lu', 'fetchZonesEd269'], ['ee', 'fetchZonesEd269']]) {
  test(`Verteiler ${country}: werfender Adapter → [Platzhalter], kein Wurf nach außen`, async () => {
    const adapters = { [adapter]: 'async () => { throw new Error("HTTP 500"); }' };
    const extra = country === 'es' ? 'const notamNoHits = () => []; const esEasaOverride = true;' : '';
    const result = country === 'es'
      ? await new Function(`
          const _t = k => 'T:' + k; const COUNTRY = 'es'; const ED269_COUNTRIES = { lu: 1, no: 1, ee: 1 };
          const esEasa = () => true; const console = { warn() {} }; const notamNoHits = () => [];
          const fetchZonesESEasa = async () => { throw new Error('HTTP 500'); };
          const fetchZonesES = async () => { throw new Error('nicht erwartet'); };
          ${grab('zoneDataUnavailable')}
          ${grab('fetchZones')}
          return fetchZones(40, -3, 100);`)()
      : await dispatcher(country, adapters, extra);
    assert.deepEqual(result, [PLACEHOLDER]);
  });
}

test('Verteiler: Adapter mit leerer Liste → leere Liste (kein Platzhalter)', async () => {
  assert.deepEqual(await dispatcher('at', { fetchZonesAT: 'async () => []' }), []);
});

test('Verteiler: Adapter mit Zonen → unverändert durchgereicht', async () => {
  const z = await dispatcher('dk', { fetchZonesDK: 'async () => [{ name: "A", type: "X" }]' });
  assert.deepEqual(z, [{ name: 'A', type: 'X' }]);
});

test('Verteiler Norwegen: Adapterfehler + geladene NOTAM-Treffer → NOTAM zuerst, dann Platzhalter', async () => {
  const z = await dispatcher('no', { fetchZonesEd269: 'async () => { throw new Error("502"); }' },
    'const notamNoHits = () => [{ name: "ENR412", type: "PROHIBITED", notam: true }];');
  assert.equal(z.length, 2);
  assert.equal(z[0].notam, true);
  assert.deepEqual(z[1], PLACEHOLDER);
});

test('Verteiler: synchron werfender Adapter wird ebenfalls abgefangen', async () => {
  const z = await dispatcher('ie', { fetchZonesIE: '() => { throw new Error("sync"); }' });
  assert.deepEqual(z, [PLACEHOLDER]);
});
