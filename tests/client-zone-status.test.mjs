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

// ---- Task 2: strikte ArcGIS-Anbindung der Punkt-Adapter ----
function arcgisStrict(fetchImpl, call) {
  return new Function('fetch', `
    const console = { warn() {} };
    const DK_LAYERS = [{ url: 'u-dk', color: '#111' }];
    const IE_LAYER = 'u-ie', NL_LAYER = 'u-nl', PT_LAYER = 'u-pt', ES_EASA_LAYER = 'u-es';
    const _mapDK = f => f, _mapIE = f => f, _mapNL = f => f, _mapPT = f => f, _mapESEasa = f => f;
    ${grab('_arcgisQuery')}
    ${grab('_envParams')}
    ${grab('fetchZonesDK')}
    ${grab('fetchAllZonesDK')}
    ${grab('fetchZonesIE')}
    ${grab('fetchZonesNL')}
    ${grab('fetchZonesPT')}
    ${grab('fetchZonesESEasa')}
    return (${call});`)(fetchImpl);
}
const http500 = async () => ({ ok: false, status: 500, json: async () => ({}) });
const err200 = async () => ({ ok: true, status: 200, json: async () => ({ error: { code: 400 } }) });

for (const name of ['DK', 'IE', 'NL', 'PT', 'ESEasa']) {
  test(`fetchZones${name}: HTTP 500 → wirft (strict verdrahtet)`, async () => {
    await assert.rejects(arcgisStrict(http500, `fetchZones${name}(50, 8, 100)`));
  });
  test(`fetchZones${name}: 200 mit error-Body → wirft (strict verdrahtet)`, async () => {
    await assert.rejects(arcgisStrict(err200, `fetchZones${name}(50, 8, 100)`));
  });
}
test('fetchAllZonesDK (Overlay) bleibt lenient: Fehler → Array', async () => {
  assert.ok(Array.isArray(await arcgisStrict(http500, 'fetchAllZonesDK()')));
  assert.ok(Array.isArray(await arcgisStrict(err200, 'fetchAllZonesDK()')));
});
test('_arcgisQuery strict: error-Zweig allein wirft, auch bei vorhandener features-Liste', async () => {
  const f = async () => ({ ok: true, status: 200, json: async () => ({ error: { code: 400 }, features: [] }) });
  await assert.rejects(arcgisStrict(f, `_arcgisQuery('u', {}, true)`), /ArcGIS-Fehler 400/);
});

// ---- Task 2: renderZones mit Platzhalter ----
function zonesRender(zones) {
  const mk = () => ({ textContent: '', className: '', innerHTML: '' });
  const els = { 'z-count': mk(), 'zones-hdr-text': mk(), 'zones-body': mk() };
  new Function('els', 'zones', `
    const $ = id => els[id];
    const _t = k => (k === 'zonesCount' ? (n => 'T:zonesCount:' + n) : 'T:' + k);
    const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
    const ctrHeightHtml = () => '';
    const getLegalLink = () => '#';
    const COUNTRY = 'de';
    const COUNTRY_ZONE_SOURCES = { de: [{ label: 'DiPUL-Quelle', url: 'https://example.test/quelle' }] };
    let lastZones = [];
    ${grab('renderZones')}
    renderZones(zones);`)(els, zones);
  return els;
}
test('renderZones: nur Platzhalter → "!" ohne ok, Hinweiskasten mit Quelle, kein zonesNone', () => {
  const els = zonesRender([PLACEHOLDER]);
  assert.equal(els['z-count'].textContent, '!');
  assert.ok(!/\bok\b/.test(els['z-count'].className));
  assert.ok(els['zones-hdr-text'].innerHTML.includes('T:zonesUnavailable'));
  const body = els['zones-body'].innerHTML;
  assert.ok(body.includes('z-unavailable'));
  assert.ok(body.includes('T:zonesUnavailableHint'));
  assert.ok(body.includes('https://example.test/quelle'));
  assert.ok(!body.includes('zonesNone'));
  assert.ok(!els['zones-hdr-text'].innerHTML.includes('zonesNone'));
  assert.ok(body.includes('DiPUL-Quelle'));                 // Quellenbeschriftung
  assert.ok(body.includes('T:zoneDataUnavailable'));        // Ausfalltitel
});
test('renderZones: leere Liste → "0" mit ok, Kopf zonesNone, Körper leer', () => {
  const els = zonesRender([]);
  assert.equal(els['z-count'].textContent, 0);
  assert.ok(/\bok\b/.test(els['z-count'].className));
  assert.equal(els['zones-hdr-text'].innerHTML, 'T:zonesNone');
  assert.equal(els['zones-body'].innerHTML, '');
});
test('renderZones: Farbwert mit Injektion wird verworfen, Fallback #64748b', () => {
  const z = { name: 'X', type: 'T', color: 'red;background:url(x)', lower: '', upper: '', legal: 'L', legalUrl: '', desc: '' };
  const body = zonesRender([z])['zones-body'].innerHTML;
  assert.ok(!body.includes('url(x)'));
  assert.ok(body.includes('background:#64748b'));
});
test('renderZones: gültige Hex-Farbe bleibt erhalten', () => {
  const z = { name: 'X', type: 'T', color: '#ef4444', lower: '', upper: '', legal: 'L', legalUrl: '', desc: '' };
  assert.ok(zonesRender([z])['zones-body'].innerHTML.includes('background:#ef4444'));
});
test('renderZones: NOTAM-Zone + Platzhalter → "!" und Kasten plus Zonenname', () => {
  const notam = { name: 'ENR412', type: 'PROHIBITED', notam: true, color: '#ef4444', lower: 'GND', upper: '100 m', legal: 'NOTAM', legalUrl: '', desc: '' };
  const els = zonesRender([notam, PLACEHOLDER]);
  assert.equal(els['z-count'].textContent, '!');
  const body = els['zones-body'].innerHTML;
  assert.ok(body.includes('z-unavailable'));
  assert.ok(body.includes('ENR412'));
  assert.ok(els['zones-hdr-text'].innerHTML.includes('T:zonesCount:1'));   // Platzhalter zählt nicht mit
});
