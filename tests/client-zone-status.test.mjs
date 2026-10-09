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
    const result = country === 'es'
      ? await new Function(`
          const _t = k => 'T:' + k; const COUNTRY = 'es'; const ED269_COUNTRIES = { lu: 1, no: 1, ee: 1 };
          const esEasa = () => true; const console = { warn() {} }; const notamNoHits = () => [];
          const fetchZonesESEasa = async () => { throw new Error('HTTP 500'); };
          const fetchZonesES = async () => { throw new Error('nicht erwartet'); };
          ${grab('zoneDataUnavailable')}
          ${grab('fetchZones')}
          return fetchZones(40, -3, 100);`)()
      : await dispatcher(country, adapters);
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

// ── Fix round 1 ──────────────────────────────────────────────────────────────
const jsonResp = (body, ok = true, status = 200) => ({ ok, status, json: async () => body, text: async () => String(body) });
const arcgis = (fetchImpl, call) => new Function('fetch', `${grab('_arcgisQuery')}\nreturn (${call});`)(fetchImpl);

test('ArcGIS strict: non-2xx wirft', async () => {
  await assert.rejects(arcgis(async () => jsonResp({}, false, 500), `_arcgisQuery('u', {}, true)`));
});
test('ArcGIS strict: 200 mit error-Body wirft', async () => {
  await assert.rejects(arcgis(async () => jsonResp({ error: { code: 400 } }), `_arcgisQuery('u', {}, true)`));
});
test('ArcGIS strict: features kein Array wirft', async () => {
  await assert.rejects(arcgis(async () => jsonResp({ features: 'x' }), `_arcgisQuery('u', {}, true)`));
});
test('ArcGIS strict: features [] → []', async () => {
  assert.deepEqual(await arcgis(async () => jsonResp({ features: [] }), `_arcgisQuery('u', {}, true)`), []);
});
test('ArcGIS strict: Treffer werden geliefert', async () => {
  assert.deepEqual(await arcgis(async () => jsonResp({ features: [{ a: 1 }] }), `_arcgisQuery('u', {}, true)`), [{ a: 1 }]);
});
test('ArcGIS lenient (Overlay): non-2xx → []', async () => {
  assert.deepEqual(await arcgis(async () => jsonResp({}, false, 503), `_arcgisQuery('u', {})`), []);
});
test('ArcGIS lenient (Overlay): 200 mit error-Body → []', async () => {
  assert.deepEqual(await arcgis(async () => jsonResp({ error: { code: 400 } }), `_arcgisQuery('u')`), []);
});

test('Verteiler Norwegen: werfendes notamNoHits → Adapter-Zonen, kein Reject', async () => {
  const z = await dispatcher('no', { fetchZonesEd269: 'async () => [{ name: "A", type: "X" }]' },
    'const notamNoHits = () => { throw new Error("kaputte Geometrie"); };');
  assert.deepEqual(z, [{ name: 'A', type: 'X' }]);
});
test('Verteiler Norwegen: werfendes notamNoHits + werfender Adapter → [Platzhalter]', async () => {
  const z = await dispatcher('no', { fetchZonesEd269: 'async () => { throw new Error("502"); }' },
    'const notamNoHits = () => { throw new Error("kaputte Geometrie"); };');
  assert.deepEqual(z, [PLACEHOLDER]);
});
test('Verteiler: Adapter liefert keine Liste → [Platzhalter]', async () => {
  assert.deepEqual(await dispatcher('at', { fetchZonesAT: 'async () => undefined' }), [PLACEHOLDER]);
});

for (const [fn, pre] of [['fetchZonesES', 'ENAIRE_IDENTIFY_URL'], ['fetchZonesCH', 'GEOADMIN_IDENTIFY_URL']]) {
  const call = fetchImpl => new Function('fetch', `
    const ${pre} = 'http://x'; const CH_ZONE_LAYER = 'l'; const LANG = 'de';
    const _esVal = v => (v == null || v === 'Nulo') ? '' : String(v);
    const _esAlt = () => '—', _chAlt = () => '—', _esZoneColor = () => '#000', _chZoneColor = () => '#000';
    const _stripHtml = s => String(s ?? ''); const console = { warn() {} };
    ${grab(fn)}
    return ${fn}(1, 2, 100);`)(fetchImpl);
  test(`${fn}: 200 mit error-Body wirft`, async () => {
    await assert.rejects(call(async () => jsonResp({ error: { code: 500 } })));
  });
  test(`${fn}: non-2xx wirft`, async () => {
    await assert.rejects(call(async () => jsonResp({}, false, 500)));
  });
  test(`${fn}: 200 {results:[]} → []`, async () => {
    assert.deepEqual(await call(async () => jsonResp({ results: [] })), []);
  });
}

// ── fetchZonesDE: Recovery nach ServiceException ─────────────────────────────
function de(responder, layers = 'a,b,c') {
  const bad = new Set();
  const result = new Function('fetch', 'dipulBadLayers', `
    const DIPUL_WMS_URL = 'http://x';
    const getActiveDipulLayers = () => '${layers}';
    const parseFeatureInfo = t => (t === 'HIT' ? [{ name: 'Z', type: 'T', lower: '', upper: '' }] : []);
    const isCtrZone = () => false;
    const console = { warn() {} };
    ${grab('fetchZonesDE')}
    return fetchZonesDE(1, 2, 100);`)(async url => {
      const L = new URL(url).searchParams.get('LAYERS');
      return responder(L);
    }, bad);
  return { result, bad };
}
const txt = (t, ok = true) => ({ ok, text: async () => t });

test('DE: kombinierte Abfrage ok → Zonen', async () => {
  const { result } = de(L => txt(L === 'a,b,c' ? 'HIT' : 'x'));
  assert.equal((await result).length, 1);
});
test('DE: kombinierte Abfrage HTTP-Fehler → wirft', async () => {
  const { result } = de(() => txt('', false));
  await assert.rejects(result);
});
test('DE: ServiceException, ein Layer defekt, andere nutzbar → kein Wurf, Layer gesperrt', async () => {
  const { result, bad } = de(L => txt(L === 'a,b,c' || L === 'a' ? 'ServiceException' : (L === 'b' ? 'HIT' : 'ok')));
  assert.equal((await result).length, 1);
  assert.deepEqual([...bad], ['a']);
});
test('DE: ServiceException, ein Layer defekt, alle anderen nicht erreichbar → wirft, Sperre bleibt', async () => {
  const { result, bad } = de(L => (L === 'a,b,c' || L === 'a') ? txt('ServiceException') : txt('', false));
  await assert.rejects(result);
  assert.deepEqual([...bad], ['a']);
});
