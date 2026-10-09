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
    const ED269_COUNTRIES = { lu: 1, no: 1, ee: 1, se: 1, be: 1 }; const LIVE_NOTAM = { no: {}, se: {}, be: {} };
    const ZONE_LOOKUP_TIMEOUT_MS = 20000;
    const esEasa = () => false;
    const console = { warn() {}, info() {}, log() {} };
    ${extra || 'const notamHits = () => [];'}
    ${stubs}
    ${grab('zoneDataUnavailable')}
    ${grab('fetchZones')}
    return fetchZones(60, 10, 100);
  `)();
}

for (const [country, adapter] of [['de', 'fetchZonesDE'], ['fr', 'fetchZonesFR'], ['at', 'fetchZonesAT'],
  ['ch', 'fetchZonesCH'], ['es', 'fetchZonesESEasa'], ['dk', 'fetchZonesDK'], ['ie', 'fetchZonesIE'],
  ['nl', 'fetchZonesNL'], ['pt', 'fetchZonesPT'], ['lu', 'fetchZonesEd269'], ['ee', 'fetchZonesEd269'], ['no', 'fetchZonesEd269'],
  ['se', 'fetchZonesEd269'], ['be', 'fetchZonesEd269']]) {
  test(`Verteiler ${country}: werfender Adapter → [Platzhalter], kein Wurf nach außen`, async () => {
    const adapters = { [adapter]: 'async () => { throw new Error("HTTP 500"); }' };
    const result = country === 'es'
      ? await new Function(`
          const _t = k => 'T:' + k; const COUNTRY = 'es'; const ED269_COUNTRIES = { lu: 1, no: 1, ee: 1, se: 1, be: 1 }; const LIVE_NOTAM = { no: {}, se: {}, be: {} };
          const esEasa = () => true; const console = { warn() {} }; const notamHits = () => []; const ZONE_LOOKUP_TIMEOUT_MS = 20000;
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
    'const notamHits = () => [{ name: "ENR412", type: "PROHIBITED", notam: true }];');
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

test('Verteiler Norwegen: werfendes notamHits → Adapter-Zonen, kein Reject', async () => {
  const z = await dispatcher('no', { fetchZonesEd269: 'async () => [{ name: "A", type: "X" }]' },
    'const notamHits = () => { throw new Error("kaputte Geometrie"); };');
  assert.deepEqual(z, [{ name: 'A', type: 'X' }]);
});
test('Verteiler Norwegen: werfendes notamHits + werfender Adapter → [Platzhalter]', async () => {
  const z = await dispatcher('no', { fetchZonesEd269: 'async () => { throw new Error("502"); }' },
    'const notamHits = () => { throw new Error("kaputte Geometrie"); };');
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
    const parseFeatureInfo = t => (t.includes('HIT') ? [{ name: 'Z' + (t.match(/HIT\\w*/) || [''])[0], type: 'T', lower: '', upper: '' }] : []);
    const isCtrZone = () => false;
    const console = { warn() {} };
    ${grab('zoneDataUnavailable')}
    ${grab('fetchZonesDE')}
    return fetchZonesDE(1, 2, 100);`)(async url => {
      const L = new URL(url).searchParams.get('LAYERS');
      return responder(L);
    }, bad);
  return { result, bad };
}
const txt = (t, ok = true) => ({ ok, text: async () => t });
// Echte GeoServer-Antwort (gekürzt): Titel + CSS; Treffer stehen als Marker 'HIT…' im Rumpf.
const gs = (body = '') => txt(`<html><head><title>Geoserver GetFeatureInfo output</title></head><style>table.featureInfo{}</style><body>${body}</body></html>`);

test('DE: kombinierte Abfrage ok → Zonen', async () => {
  const { result } = de(L => (L === 'a,b,c' ? gs('HIT') : gs()));
  assert.equal((await result).length, 1);
});
test('DE: kombinierte Abfrage HTTP-Fehler → wirft', async () => {
  const { result } = de(() => txt('', false));
  await assert.rejects(result);
});
test('DE: ServiceException, ein Layer defekt, andere nutzbar → kein Wurf, Layer gesperrt', async () => {
  const { result, bad } = de(L => (L === 'a,b,c' || L === 'a' ? txt('ServiceException') : (L === 'b' ? gs('HIT') : gs())));
  assert.equal((await result).length, 1);
  assert.deepEqual([...bad], ['a']);
});
test('DE: ServiceException, ein Layer defekt, alle anderen nicht erreichbar → wirft, Sperre bleibt', async () => {
  const { result, bad } = de(L => (L === 'a,b,c' || L === 'a') ? txt('ServiceException') : txt('', false));
  await assert.rejects(result);
  assert.deepEqual([...bad], ['a']);
});

// ── F1: HTTP 200 ohne GeoServer-Antwort ist kein „keine Zonen" ───────────────
test('DE F1: 200 mit Wartungsseite (kein GeoServer) → wirft', async () => {
  const { result } = de(() => txt('<html><body>Maintenance</body></html>'));
  await assert.rejects(result);
});
test('DE F1: 200 mit leerem Rumpf → wirft', async () => {
  const { result } = de(() => txt(''));
  await assert.rejects(result);
});
test('DE F1: 200 mit GeoServer-Seite ohne Tabellen → [] (echtes „keine Zonen")', async () => {
  const { result } = de(() => gs());
  assert.deepEqual(await result, []);
});
test('DE F1: Wartungsseite nur bei der exakten CTR-Abfrage → Hauptergebnis bleibt, kein Wurf', async () => {
  const { result } = de(L => (L === 'kontrollzonen' ? txt('<html>Maintenance</html>') : (L === 'a,b,c' ? gs('HIT') : gs())));
  assert.equal((await result).length, 1);
});

// ── F4: Teilergebnis plus Platzhalter (Deutschland) ──────────────────────────
test('DE F4: ein Layer ServiceException, einer transient defekt, einer nutzbar → Zonen + genau ein Platzhalter', async () => {
  const { result, bad } = de(L => (L === 'a,b,c' || L === 'a' ? txt('ServiceException') : (L === 'b' ? txt('', false) : gs('HIT'))));
  const z = await result;
  assert.equal(z.length, 2);
  assert.equal(z[0].name, 'ZHIT');
  assert.deepEqual(z[1], PLACEHOLDER);
  assert.deepEqual([...bad], ['a']);
});
test('DE F4: transiente Probe als Wartungsseite mit Status 200 → ebenfalls Platzhalter', async () => {
  const { result } = de(L => (L === 'a,b,c' || L === 'a' ? txt('ServiceException') : (L === 'b' ? txt('<html>Maintenance</html>') : gs('HIT'))));
  const z = await result;
  assert.equal(z.filter(x => x.unavailable).length, 1);
});
test('DE F4: ein Layer ServiceException, alle anderen nutzbar → KEIN Platzhalter', async () => {
  const { result } = de(L => (L === 'a,b,c' || L === 'a' ? txt('ServiceException') : (L === 'b' ? gs('HIT') : gs())));
  const z = await result;
  assert.equal(z.length, 1);
  assert.ok(!z.some(x => x.unavailable));
});
test('DE F4: abgelehnte Probe (fetch wirft) bei nutzbarem Layer → Platzhalter', async () => {
  const { result } = de(L => {
    if (L === 'a,b,c' || L === 'a') return txt('ServiceException');
    if (L === 'b') throw new Error('Netzwerk');
    return gs('HIT');
  });
  const z = await result;
  assert.equal(z.filter(x => x.unavailable).length, 1);
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
function zonesRender(zones, country = 'de') {
  const mk = () => ({ textContent: '', className: '', innerHTML: '', hidden: true });
  const els = { 'z-count': mk(), 'zones-hdr-text': mk(), 'zones-body': mk(), 'be-notice': mk() };
  new Function('els', 'zones', 'country', `
    const $ = id => els[id];
    const _t = k => (k === 'zonesCount' ? (n => 'T:zonesCount:' + n) : 'T:' + k);
    const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
    const ctrHeightHtml = () => '';
    const getLegalLink = () => '#';
    const COUNTRY = country;
    const COUNTRY_ZONE_SOURCES = { de: [{ label: 'DiPUL-Quelle', url: 'https://example.test/quelle' }] };
    COUNTRY_ZONE_SOURCES[country] = COUNTRY_ZONE_SOURCES[country] || COUNTRY_ZONE_SOURCES.de;
    let lastZones = [];
    ${grab('safeHexColor')}
    ${grab('renderZones')}
    renderZones(zones);`)(els, zones, country);
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

// ── F3: 200 mit falscher Form ────────────────────────────────────────────────
for (const [fn, pre] of [['fetchZonesES', 'ENAIRE_IDENTIFY_URL'], ['fetchZonesCH', 'GEOADMIN_IDENTIFY_URL']]) {
  const call = fetchImpl => new Function('fetch', `
    const ${pre} = 'http://x'; const CH_ZONE_LAYER = 'l'; const LANG = 'de';
    const _esVal = v => (v == null || v === 'Nulo') ? '' : String(v);
    const _esAlt = () => '—', _chAlt = () => '—', _esZoneColor = () => '#000', _chZoneColor = () => '#000';
    const _stripHtml = s => String(s ?? ''); const console = { warn() {} };
    ${grab(fn)}
    return ${fn}(1, 2, 100);`)(fetchImpl);
  test(`${fn} F3: 200 {} (kein results-Array) wirft`, async () => {
    await assert.rejects(call(async () => jsonResp({})));
  });
  test(`${fn} F3: 200 {results: "x"} wirft`, async () => {
    await assert.rejects(call(async () => jsonResp({ results: 'x' })));
  });
}

for (const [fn, local, setup] of [
  ['fetchZonesFR', 'fetchZonesFRLocal', ''],
  ['fetchZonesAT', 'fetchZonesATLocal', 'const LANG = "de";'],
  ['fetchZonesEd269', null, 'const LANG = "de"; const COUNTRY = "lu";'],
]) {
  const call = (fetchImpl, local_ = false) => new Function('fetch', `
    const console = { warn() {} }; const IS_LOCAL_PREVIEW = ${local_};
    const fetchZonesFRLocal = async () => [{ name: 'LOKAL' }];
    const fetchZonesATLocal = async () => [{ name: 'LOKAL' }];
    const loadLocalEd269Entries = async () => [];
    ${setup}
    ${grab(fn)}
    return ${fn}(50, 8, 100);`)(fetchImpl);
  test(`${fn} F3: 200 {} (zones kein Array) wirft (Produktion)`, async () => {
    await assert.rejects(call(async () => jsonResp({})));
  });
  test(`${fn} F3: 200 {zones: "x"} wirft (Produktion)`, async () => {
    await assert.rejects(call(async () => jsonResp({ zones: 'x' })));
  });
  test(`${fn} F3: 200 {zones: []} → []`, async () => {
    assert.deepEqual(await call(async () => jsonResp({ zones: [] })), []);
  });
  if (local) test(`${fn} F3: 200 {} in der lokalen Vorschau → Datei-Fallback (wie bei non-2xx)`, async () => {
    assert.deepEqual(await call(async () => jsonResp({}), true), [{ name: 'LOKAL' }]);
  });
}

// ── F4: Dänemark — Teilergebnis plus Platzhalter ─────────────────────────────
function dk(layerAnswers) {
  const call = fetchImpl => new Function('fetch', `
    const console = { warn() {} };
    const DK_LAYERS = [{ url: 'u1', color: '#111' }, { url: 'u2', color: '#222' }, { url: 'u3', color: '#333' }];
    const _mapDK = f => ({ name: f.name });
    ${grab('zoneDataUnavailable')}
    ${grab('_arcgisQuery')}
    ${grab('_envParams')}
    ${grab('fetchZonesDK')}
    return fetchZonesDK(55, 10, 100);`)(fetchImpl);
  return call(async url => {
    const a = layerAnswers[url.split('/query')[0]];
    return a === 'fail' ? { ok: false, status: 500, json: async () => ({}) }
      : { ok: true, status: 200, json: async () => ({ features: a }) };
  });
}
test('DK F4: eine von drei Ebenen fällt aus → Treffer der gesunden Ebenen plus genau ein Platzhalter', async () => {
  const z = await dk({ u1: [{ name: 'A' }], u2: 'fail', u3: [{ name: 'C' }] });
  assert.deepEqual(z.map(x => x.name), ['A', 'C', '']);
  assert.equal(z.filter(x => x.unavailable).length, 1);
  assert.deepEqual(z[2], PLACEHOLDER);
});
test('DK F4: alle drei Ebenen fallen aus → wirft', async () => {
  await assert.rejects(dk({ u1: 'fail', u2: 'fail', u3: 'fail' }));
});
test('DK F4: alle gesund → keine Platzhalter', async () => {
  const z = await dk({ u1: [{ name: 'A' }], u2: [], u3: [] });
  assert.deepEqual(z, [{ name: 'A' }]);
});
test('DK F4: alle gesund ohne Treffer → []', async () => {
  assert.deepEqual(await dk({ u1: [], u2: [], u3: [] }), []);
});

// ── F5: Null-Sicherheit und Farbwächter ──────────────────────────────────────
test('F5: evalZoneStatus verträgt null-Einträge in der Liste', () => {
  const r = run(`return evalZoneStatus([null, { name: 'EEGZ1', type: 'REQ_AUTHORISATION' }]);`);
  assert.equal(r.lvl, 'warn');
  assert.deepEqual(r.reasons, ['EEGZ1']);
});
for (const [color, ok] of [['#abc', true], ['#abcd', true], ['#aabbcc', true], ['#aabbccdd', true],
  ['#abcde', false], ['#aabbccd', false], ['#ab', false], ['#aabbccddee', false]]) {
  test(`F5: Zonenkarte Farbwächter ${color} → ${ok ? 'übernommen' : 'verworfen'}`, () => {
    const z = { name: 'X', type: 'T', color, lower: '', upper: '', legal: 'L', legalUrl: '', desc: '' };
    const body = zonesRender([z])['zones-body'].innerHTML;
    assert.equal(body.includes(`background:${color}`), ok);
    if (!ok) assert.ok(body.includes('background:#64748b'));
  });
}

// ── F2(a): Zeitlimit im Verteiler ────────────────────────────────────────────
// Der Verteiler liest ZONE_LOOKUP_TIMEOUT_MS aus dem Seitenkontext; hier injizierbar.
// Timer-Buchführung: jeder gesetzte Timer, der nicht gelöscht wurde, bleibt in `open`.
function dispatcherTimed(country, adapterSrc, timeoutMs, notamSrc = '() => []') {
  return new Function(`
    const _t = k => 'T:' + k;
    const COUNTRY = ${JSON.stringify(country)};
    const ED269_COUNTRIES = { lu: 1, no: 1, ee: 1, se: 1, be: 1 }; const LIVE_NOTAM = { no: {}, se: {}, be: {} };
    const esEasa = () => false;
    const console = { warn() {}, info() {}, log() {} };
    const notamHits = ${notamSrc};
    const ZONE_LOOKUP_TIMEOUT_MS = ${timeoutMs};
    const open = new Set();
    const setTimeout = (f, ms) => { const t = globalThis.setTimeout(f, ms); open.add(t); return t; };
    const clearTimeout = t => { open.delete(t); globalThis.clearTimeout(t); };
    const fetchZonesAT = ${adapterSrc};
    const fetchZonesEd269 = ${adapterSrc};
    ${grab('zoneDataUnavailable')}
    ${grab('fetchZones')}
    return fetchZones(60, 10, 100).then(zones => ({ zones, openTimers: open.size }));
  `)();
}
test('Konstante: Zeitlimit des Zonenabrufs beträgt 20 Sekunden', () => {
  assert.match(html, /const ZONE_LOOKUP_TIMEOUT_MS = 20000;/);
});
test('F2a: hängender Adapter → nach Zeitlimit [Platzhalter]', async () => {
  const t0 = Date.now();
  const { zones } = await dispatcherTimed('at', '() => new Promise(() => {})', 30);
  assert.deepEqual(zones, [PLACEHOLDER]);
  assert.ok(Date.now() - t0 < 2000);
});
test('F2a: schneller Adapter → seine Zonen, Timer ist gelöscht', async () => {
  const { zones, openTimers } = await dispatcherTimed('at', 'async () => [{ name: "A", type: "X" }]', 600000);
  assert.deepEqual(zones, [{ name: 'A', type: 'X' }]);
  assert.equal(openTimers, 0);
});
test('F2a: werfender Adapter → Platzhalter, Timer ist gelöscht', async () => {
  const { zones, openTimers } = await dispatcherTimed('at', 'async () => { throw new Error("x"); }', 600000);
  assert.deepEqual(zones, [PLACEHOLDER]);
  assert.equal(openTimers, 0);
});
test('F2a: Adapter scheitert NACH dem Zeitlimit → keine unbehandelte Ablehnung, weiter [Platzhalter]', async () => {
  let unhandled = null;
  const h = e => { unhandled = e; };
  process.on('unhandledRejection', h);
  const { zones } = await dispatcherTimed('at', '() => new Promise((_, rej) => globalThis.setTimeout(() => rej(new Error("spät")), 80))', 20);
  await new Promise(r => setTimeout(r, 150));
  process.off('unhandledRejection', h);
  assert.deepEqual(zones, [PLACEHOLDER]);
  assert.equal(unhandled, null);
});
test('F2a Norwegen: hängender Adapter + NOTAM-Treffer → NOTAM zuerst, dann Platzhalter', async () => {
  const { zones } = await dispatcherTimed('no', '() => new Promise(() => {})', 30,
    '() => [{ name: "ENR412", type: "PROHIBITED", notam: true }]');
  assert.equal(zones.length, 2);
  assert.equal(zones[0].notam, true);
  assert.deepEqual(zones[1], PLACEHOLDER);
});

// ── F2(b): Prüf-Status im Banner ─────────────────────────────────────────────
function bannerHarness() {
  const els = {};
  const $ = id => (els[id] ||= { className: '', textContent: '', innerHTML: '' });
  const api = new Function('$', `
    const _t = k => 'T:' + k;
    const escapeHtml = s => String(s ?? '');
    const isCtrZone = () => false;
    let lastStatus = { lvl: 'go', reasons: [] }, lastZoneStatus = null, lastZones = [];
    ${grab('zoneDataUnavailable')}
    ${grab('pendingZoneStatus')}
    ${grab('currentZoneStatus')}
    ${grab('evalZoneStatus')}
    ${grab('renderStatus')}
    return {
      renderStatus, pendingZoneStatus, currentZoneStatus, evalZoneStatus, zoneDataUnavailable,
      setPending() { lastZoneStatus = pendingZoneStatus(); },
      setZones(z) { lastZones = z; },
      get zoneStatus() { return lastZoneStatus; },
    };`)($);
  return { els, api };
}
test('F2b: Pending-Status ist ein go-Status mit pending-Marke und zonesChecking-Text', () => {
  const { api } = bannerHarness();
  assert.deepEqual(api.pendingZoneStatus(), { lvl: 'go', reasons: ['T:zonesChecking'], pending: true });
});
test('F2b: Banner während Pending zeigt zonesChecking, nie zoneOk; Ampel nur vom Wetter bestimmt', () => {
  const { els, api } = bannerHarness();
  api.setPending();
  api.renderStatus({ lvl: 'go', reasons: [] });
  assert.ok(els['status-desc'].innerHTML.includes('T:zonesChecking'));
  assert.ok(!els['status-desc'].innerHTML.includes('T:zoneOk'));
  assert.equal(els['status-banner'].className, 'status-banner go');
  api.renderStatus({ lvl: 'warn', reasons: ['Wind'] });   // METAR-/Wetter-Update während Pending
  assert.ok(els['status-desc'].innerHTML.includes('T:zonesChecking'));
  assert.equal(els['status-banner'].className, 'status-banner warn');
});
test('F2b: fertiger Check ersetzt Pending — leeres Ergebnis zeigt zoneOk', () => {
  const { els, api } = bannerHarness();
  api.setPending();
  api.renderStatus({ lvl: 'go', reasons: [] });
  api.renderStatus({ lvl: 'go', reasons: [] }, api.evalZoneStatus([]));
  assert.ok(els['status-desc'].innerHTML.includes('T:zoneOk'));
  assert.ok(!els['status-desc'].innerHTML.includes('T:zonesChecking'));
  assert.ok(!api.zoneStatus.pending);
});
test('F2b: fertiger Check mit Platzhalter ersetzt Pending → gelb, zoneDataUnavailable', () => {
  const { els, api } = bannerHarness();
  api.setPending();
  api.renderStatus({ lvl: 'go', reasons: [] });
  api.renderStatus({ lvl: 'go', reasons: [] }, api.evalZoneStatus([api.zoneDataUnavailable()]));
  assert.ok(els['status-desc'].innerHTML.includes('T:zoneDataUnavailable'));
  assert.ok(!els['status-desc'].innerHTML.includes('T:zonesChecking'));
  assert.equal(els['status-banner'].className, 'status-banner warn');
  assert.ok(!api.zoneStatus.pending);
});
test('F2b: Sprachwechsel während Pending bleibt Pending (nie zoneOk), danach echter Status', () => {
  const { api } = bannerHarness();
  api.setPending();
  api.setZones([]);                                   // lastZones stammt vom vorigen Punkt
  assert.deepEqual(api.currentZoneStatus(), { lvl: 'go', reasons: ['T:zonesChecking'], pending: true });
  api.setZones([api.zoneDataUnavailable()]);
  api.renderStatus({ lvl: 'go', reasons: [] }, api.evalZoneStatus([api.zoneDataUnavailable()]));
  assert.equal(api.currentZoneStatus().lvl, 'warn');  // nach Abschluss: aus lastZones berechnet
});
test('F2b: runCheck setzt den Pending-Status vor dem ersten renderStatus', () => {
  const body = grab('runCheck');
  const iPending = body.indexOf('pendingZoneStatus()');
  assert.ok(iPending > 0);
  assert.ok(iPending < body.indexOf('renderStatus('));
  assert.ok(iPending < body.indexOf('fetchZones('));
});
test('F2b: switchLang nutzt currentZoneStatus() statt evalZoneStatus(lastZones)', () => {
  const body = grab('switchLang');
  assert.ok(body.includes('currentZoneStatus()'));
  assert.ok(!body.includes('evalZoneStatus(lastZones)'));
});
test('F2b: zonesChecking existiert in allen fünf Sprachblöcken', () => {
  assert.equal((html.match(/^\s+zonesChecking: '/gm) || []).length, 5);
});
test('F2b: abgebrochener Check (catch in runCheck) ersetzt den Pending-Status durch „nicht geprüft"', () => {
  const body = grab('runCheck');
  const c = body.slice(body.indexOf('} catch (e) {'));
  assert.ok(c.includes('lastZoneStatus = evalZoneStatus(lastZones)'));
  assert.ok(c.includes('lastZones = [zoneDataUnavailable()]'));
});

// ── Task 4: Schweden/Belgien, verallgemeinerter Live-Knopf, Belgien-Hinweis ─────────────────
const LIVE_HIT = '() => [{ name: "NOTAM A1/26", type: "PROHIBITED", notam: true }]';
for (const country of ['no', 'se', 'be']) {
  test(`Verteiler ${country}: Adapterfehler + geladene Live-Treffer → Treffer zuerst, dann Platzhalter`, async () => {
    const z = await dispatcher(country, { fetchZonesEd269: 'async () => { throw new Error("502"); }' },
      `const notamHits = ${LIVE_HIT};`);
    assert.equal(z.length, 2);
    assert.equal(z[0].notam, true);
    assert.deepEqual(z[1], PLACEHOLDER);
  });
  test(`Verteiler ${country}: Live-Treffer werden vor die Adapter-Zonen gestellt`, async () => {
    const z = await dispatcher(country, { fetchZonesEd269: 'async () => [{ name: "Z", type: "X" }]' },
      `const notamHits = ${LIVE_HIT};`);
    assert.deepEqual(z.map(item => item.name), ['NOTAM A1/26', 'Z']);
  });
}
for (const country of ['lu', 'ee', 'de']) {
  test(`Verteiler ${country} (kein Live-Eintrag): nichts wird vorangestellt, notamHits wird nicht gefragt`, async () => {
    const adapter = country === 'de' ? 'fetchZonesDE' : 'fetchZonesEd269';
    const z = await dispatcher(country, { [adapter]: 'async () => [{ name: "Z", type: "X" }]' },
      'const notamHits = () => { throw new Error("darf nicht aufgerufen werden"); };');
    assert.deepEqual(z, [{ name: 'Z', type: 'X' }]);
    const withHit = await dispatcher(country, { [adapter]: 'async () => [{ name: "Z", type: "X" }]' },
      `const notamHits = ${LIVE_HIT};`);
    assert.deepEqual(withHit.map(item => item.name), ['Z']);
  });
}

const LIVE_TABLE = `const LIVE_NOTAM = {
  no: { url: '/.netlify/functions/notam-no', source: 'https://dronesoner.no/' },
  se: { url: '/.netlify/functions/notam-se', source: 'https://dronechart.lfv.se/' },
  be: { url: '/.netlify/functions/notam-be', source: 'https://map.droneguide.be/' } };`;
test('LIVE_NOTAM: Tabelle im Quelltext wie vereinbart (genau no, se, be)', () => {
  const m = html.match(/const LIVE_NOTAM = \{[\s\S]*?\n\s*\};/);
  assert.ok(m, 'LIVE_NOTAM nicht gefunden');
  const table = new Function(`${m[0]}; return LIVE_NOTAM;`)();
  assert.deepEqual(Object.keys(table), ['no', 'se', 'be']);
  assert.equal(table.no.url, '/.netlify/functions/notam-no');
  assert.equal(table.no.source, 'https://dronesoner.no/');
  assert.equal(table.se.url, '/.netlify/functions/notam-se');
  assert.equal(table.se.source, 'https://dronechart.lfv.se/');
  assert.equal(table.be.url, '/.netlify/functions/notam-be');
  assert.equal(table.be.source, 'https://map.droneguide.be/');
});

function notamUi(country, state, extra = '') {
  return new Function(`
    const _t = k => (k === 'notamAsOf' ? (t => 'T:notamAsOf:' + t) : 'T:' + k);
    const _locale = () => 'en-GB';
    const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
    const COUNTRY = ${JSON.stringify(country)};
    ${LIVE_TABLE}
    const NOTAM_TTL_MS = 5 * 60 * 1000;
    const NOTAM = ${JSON.stringify(state)};
    const S = { layers: {} };
    ${extra}
    ${grab('notamFresh')}
    ${grab('notamHits')}
    ${grab('notamControlHtml')}
    return { notamFresh, notamHits, notamControlHtml, NOTAM };
  `)();
}
const SQUARE = { name: 'Q', type: 'PROHIBITED', notam: true,
  geometry: [{ type: 'Polygon', coordinates: [[[10, 60], [10.1, 60], [10.1, 60.1], [10, 60.1], [10, 60]]] }] };
const hitStub = 'const zoneHitsPoint = (z, lat, lon, r) => lat >= 60 && lat <= 60.1;';

for (const [country, host] of [['no', 'dronesoner.no'], ['se', 'dronechart.lfv.se'], ['be', 'map.droneguide.be']]) {
  test(`Knopf ${country}: Fehlermeldung verlinkt die Quelle des Landes`, () => {
    const ui = notamUi(country, { zones: null, at: 0, fetchedAt: 0, loading: false, error: true });
    const out = ui.notamControlHtml();
    assert.ok(out.includes(`href="https://${host}/"`), out);
    assert.ok(out.includes(`${host} ↗`), out);
    assert.ok(out.includes('T:notamError'));
    assert.ok(out.includes('data-notam-load'));
    assert.ok(out.includes('T:notamLoad'));
  });
  test(`Treffer ${country}: geladene frische Zonen werden über zoneHitsPoint gefiltert`, () => {
    const ui = notamUi(country, { zones: [SQUARE, { ...SQUARE, name: 'weit' }], at: Date.now(), fetchedAt: Date.now(), loading: false, error: false },
      hitStub.replace('lat >= 60', 'z.name === "Q" && lat >= 60'));
    assert.deepEqual(ui.notamHits(60.05, 10.05, 100).map(z => z.name), ['Q']);
  });
}
test('Knopf: laufender Abruf zeigt notamLoading und ist deaktiviert; frische Daten zeigen notamAsOf', () => {
  const loading = notamUi('se', { zones: null, at: 0, fetchedAt: 0, loading: true, error: false }).notamControlHtml();
  assert.ok(loading.includes('T:notamLoading') && loading.includes(' disabled'));
  const fresh = notamUi('be', { zones: [], at: Date.now(), fetchedAt: Date.now(), loading: false, error: false }).notamControlHtml();
  assert.ok(fresh.includes('T:notamAsOf:'));
});
test('Treffer: Land ohne Eintrag (lu) und nicht geladene Daten liefern nichts', () => {
  const state = { zones: [SQUARE], at: Date.now(), fetchedAt: Date.now(), loading: false, error: false };
  assert.deepEqual(notamUi('lu', state, hitStub).notamHits(60.05, 10.05, 100), []);
  assert.deepEqual(notamUi('se', { ...state, zones: null }, hitStub).notamHits(60.05, 10.05, 100), []);
});
test('Frist: Daten älter als fünf Minuten gelten nicht mehr und leeren das Overlay', () => {
  const state = { zones: [SQUARE], at: Date.now() - 5 * 60 * 1000 - 1000, fetchedAt: 0, loading: false, error: false };
  const ui = notamUi('se', state, 'S.layers.notam = { clearLayers() { globalThis.__cleared = (globalThis.__cleared || 0) + 1; } };');
  globalThis.__cleared = 0;
  assert.equal(ui.notamFresh(), false);
  assert.equal(ui.NOTAM.zones, null);
  assert.equal(globalThis.__cleared, 1);
  delete globalThis.__cleared;
});
test('Frist: Konstante bleibt fünf Minuten', () => {
  assert.match(html, /const NOTAM_TTL_MS = 5 \* 60 \* 1000;/);
});

// loadNotam: Abruf je Land über die URL der Tabelle
test('loadNotam: ruft die Function-URL des Landes ab und speichert die Zonen', async () => {
  for (const [country, url] of [['no', '/.netlify/functions/notam-no'], ['se', '/.netlify/functions/notam-se'], ['be', '/.netlify/functions/notam-be']]) {
    const urls = [];
    const api = new Function('fetch', 'urls', `
      const COUNTRY = ${JSON.stringify(country)}; ${LIVE_TABLE}
      const NOTAM = { zones: null, at: 0, fetchedAt: 0, loading: false, error: false };
      const S = { layers: {} }; let lastWeather = null, lastZones = [];
      const console = { warn() {} };
      const renderMapStatus = () => {}; const refreshZonesAtCurrentPoint = () => {}; const drawNotamOverlay = () => {};
      ${grab('loadNotam')}
      return { loadNotam, NOTAM };`)(async u => { urls.push(u); return { ok: true, status: 200, json: async () => ({ fetchedAt: '2026-10-09T10:00:00Z', zones: [{ name: 'A', notam: true }] }) }; }, urls);
    await api.loadNotam();
    assert.deepEqual(urls, [url]);
    assert.equal(api.NOTAM.zones.length, 1);
    assert.equal(api.NOTAM.error, false);
  }
});
test('loadNotam: Land ohne Eintrag ruft nichts ab', async () => {
  let called = 0;
  const api = new Function('fetch', `
    const COUNTRY = 'lu'; ${LIVE_TABLE}
    const NOTAM = { zones: null, at: 0, fetchedAt: 0, loading: false, error: false };
    const renderMapStatus = () => {}; const refreshZonesAtCurrentPoint = () => {}; const drawNotamOverlay = () => {};
    let lastWeather = null, lastZones = []; const console = { warn() {} };
    ${grab('loadNotam')}
    return { loadNotam };`)(async () => { called++; });
  await api.loadNotam();
  assert.equal(called, 0);
});

// Ampel: Live-Zone, die noch nicht gilt, wird gelb, nie rot
test('evalZoneStatus: NOTAM-Zone PROHIBITED + inactive → warn mit „derzeit inaktiv", nicht nogo', () => {
  const r = run(`return evalZoneStatus([{ name: 'NOTAM A1/26', type: 'PROHIBITED', notam: true, inactive: true }]);`);
  assert.equal(r.lvl, 'warn');
  assert.deepEqual(r.reasons, ['NOTAM A1/26 · T:zoneInactive']);
});
test('evalZoneStatus: dieselbe NOTAM-Zone ohne inactive → nogo', () => {
  assert.equal(run(`return evalZoneStatus([{ name: 'NOTAM A1/26', type: 'PROHIBITED', notam: true }]).lvl;`), 'nogo');
});

// Overlay: Farbe der Zone, Norwegen (rot) bleibt rot
function overlayColors(zones) {
  const calls = [];
  new Function('L', 'S', 'calls', `
    const escapeHtml = s => String(s ?? '');
    const _t = k => 'T:' + k;
    const NOTAM = { zones: ${JSON.stringify(zones)} };
    ${grab('safeHexColor')}
    ${grab('drawNotamOverlay')}
    drawNotamOverlay();`)({
    layerGroup: () => ({ addTo() { return this; }, clearLayers() {} }),
    polygon: (rings, style) => ({ bindTooltip() { return this; }, addTo() { calls.push(style); return this; } }),
  }, { map: {}, layers: {} }, calls);
  return calls;
}
test('Overlay: gestrichelt in der Farbe der Zone mit schwacher Füllung; Norwegen bleibt rot', () => {
  const sq = [[[10, 60], [10.1, 60], [10.1, 60.1], [10, 60]]];
  const calls = overlayColors([
    { name: 'a', color: '#ef4444', geometry: [{ type: 'Polygon', coordinates: sq }] },
    { name: 'b', color: '#64748b', geometry: [{ type: 'Polygon', coordinates: sq }] },
    { name: 'c', geometry: [{ type: 'Polygon', coordinates: sq }] },
    { name: 'd', color: 'url(javascript:x)', geometry: [{ type: 'Polygon', coordinates: sq }] },
    { name: 'e', color: '#f59e0b', geometry: [{ type: 'Circle', center: [10, 60], radius: 5 }] }]);
  assert.equal(calls.length, 4);
  assert.deepEqual(calls[0], { color: '#ef4444', weight: 2, dashArray: '6 4', fillColor: '#ef4444', fillOpacity: 0.12 });
  assert.equal(calls[1].color, '#64748b');
  assert.equal(calls[1].fillColor, '#64748b');
  assert.equal(calls[2].color, '#ef4444');     // ohne Farbe: wie bisher rot
  assert.equal(calls[3].color, '#ef4444');     // ungültiger Farbwert verworfen
});

// Lokaler Fallback: Inaktivität (beendet oder noch nicht begonnen)
const DAY = 86400000;
const iso = ms => new Date(ms).toISOString();
const day = ms => iso(ms).slice(0, 10);
function localZone(feature, light = false, lang = 'en') {
  return new Function('feature', 'light', `
    const LANG = ${JSON.stringify(lang)};
    ${grab('atLocalColor')}
    ${grab('atLocalGeometry')}
    ${grab('atLocalFormatAltitude')}
    ${grab('atLocalMessage')}
    ${grab('normalizeLocalAtZone')}
    ${grab('ed269Inactivity')}
    ${grab('normalizeLocalEd269Zone')}
    return normalizeLocalEd269Zone(feature, light);`)(feature, light);
}
const baseFeature = (applicability, extra = {}) => ({
  name: 'Zone', restriction: 'PROHIBITED', message: 'Text',
  geometry: [{ horizontalProjection: { type: 'Polygon', coordinates: [[[1, 1], [2, 1], [2, 2], [1, 1]]] }, lowerLimit: 0, lowerVerticalReference: 'AGL', uomDimensions: 'M' }],
  applicability, ...extra });
test('Fallback inaktiv: beendetes Fenster → inaktiv, „Activation window ended <spätestes Ende>"', () => {
  const end = Date.now() - 3 * DAY;
  const z = localZone(baseFeature([{ startDateTime: iso(end - DAY), endDateTime: iso(end) }, { startDateTime: iso(end - 9 * DAY), endDateTime: iso(end - 5 * DAY) }]));
  assert.equal(z.inactive, true);
  assert.equal(z.type, 'TEMPORARY_INACTIVE');
  assert.equal(z.color, '#64748b');
  assert.equal(z.desc, `Activation window ended ${day(end)}. May be reactivated — check the official source. Text`);
});
test('Fallback inaktiv: künftiges Fenster → inaktiv, „Not yet active — starts <frühester Start>"', () => {
  const s1 = Date.now() + 10 * DAY, s2 = Date.now() + 4 * DAY;
  const z = localZone(baseFeature([{ startDateTime: iso(s1), endDateTime: iso(s1 + DAY) }, { startDateTime: iso(s2), endDateTime: iso(s2 + DAY) }]));
  assert.equal(z.inactive, true);
  assert.equal(z.type, 'TEMPORARY_INACTIVE');
  assert.equal(z.desc, `Not yet active — starts ${day(s2)}. May change — check the official source. Text`);
});
test('Fallback inaktiv: beendet + künftig gemischt → inaktiv mit Startdatum', () => {
  const end = Date.now() - 2 * DAY, st = Date.now() + 6 * DAY;
  const z = localZone(baseFeature([{ startDateTime: iso(end - DAY), endDateTime: iso(end) }, { startDateTime: iso(st), endDateTime: iso(st + DAY) }]));
  assert.equal(z.inactive, true);
  assert.ok(z.desc.startsWith(`Not yet active — starts ${day(st)}.`));
});
test('Fallback inaktiv: laufendes Fenster, Fenster ohne Grenzen oder ohne Fenster → aktiv', () => {
  const running = [{ startDateTime: iso(Date.now() - DAY), endDateTime: iso(Date.now() + DAY) }];
  assert.ok(!localZone(baseFeature(running)).inactive);
  assert.equal(localZone(baseFeature(running)).type, 'PROHIBITED');
  assert.ok(!localZone(baseFeature([{}])).inactive);
  assert.ok(!localZone(baseFeature([{ startDateTime: iso(Date.now() - DAY) }])).inactive);
  assert.ok(!localZone(baseFeature(undefined)).inactive);
  assert.ok(!localZone(baseFeature([])).inactive);
  // ein beendetes + ein laufendes Fenster → aktiv
  const end = Date.now() - 2 * DAY;
  assert.ok(!localZone(baseFeature([{ endDateTime: iso(end) }, ...running])).inactive);
});
test('Fallback inaktiv: leichte Variante setzt inaktiv/Farbe ohne Beschreibung', () => {
  const end = Date.now() - DAY;
  const z = localZone(baseFeature([{ endDateTime: iso(end) }]), true);
  assert.equal(z.inactive, true);
  assert.equal(z.color, '#64748b');
  assert.equal(z.desc, undefined);
});
test('Fallback Schweden: Kreisgeometrie ohne Höhen wird gezeichnet, Höhen „—"', () => {
  const z = localZone({ name: 'CIRC', restriction: 'REQ_AUTHORISATION', message: '',
    geometry: [{ horizontalProjection: { type: 'Circle', center: [18, 59], radius: 500 } }] });
  assert.deepEqual(z.geometry, [{ type: 'Circle', center: [18, 59], radius: 500 }]);
  assert.equal(z.lower, '—');
  assert.equal(z.upper, '—');
});
test('Fallback Belgien: ohne Beschreibung → Zonenart-Code mit Leerzeichen statt Unterstrichen', () => {
  const z = localZone(baseFeature(undefined, { message: '', typeCode: 'CIV_HELISTRIP' }));
  assert.equal(z.desc, 'CIV HELISTRIP');
  const withText = localZone(baseFeature(undefined, { message: 'Echter Text', typeCode: 'CIV_HELISTRIP' }));
  assert.equal(withText.desc, 'Echter Text');
  const end = Date.now() - DAY;
  const inactive = localZone(baseFeature([{ endDateTime: iso(end) }], { message: '', typeCode: 'CIV_HELISTRIP' }));
  assert.equal(inactive.desc, `Activation window ended ${day(end)}. May be reactivated — check the official source. CIV HELISTRIP`);
});

// Länder-Verdrahtung und Texte
test('Länder-Verdrahtung: se und be in allen Tabellen', () => {
  for (const name of ['COUNTRY_DEFAULT_LANG', 'COUNTRY_LANDMARK', 'COUNTRY_BBOX', 'COUNTRY_CC', 'COUNTRY_NAMES', 'COUNTRY_ZONE_SOURCES']) {
    const m = html.match(new RegExp(`const ${name} = \\{[\\s\\S]*?\\n\\s*\\};|const ${name} = \\{[^\\n]*\\};`));
    assert.ok(m, `${name} nicht gefunden`);
    assert.match(m[0], /\bse:/, `${name}: se fehlt`);
    assert.match(m[0], /\bbe:/, `${name}: be fehlt`);
  }
  assert.match(html, /const ED269_COUNTRIES = \{[^}]*\bse: 1[^}]*\bbe: 1[^}]*\};/);
  assert.match(html, /const OVERLAY_ALL = \{[^}]*\bse: 1[^}]*\bbe: 1[^}]*\};/);
  assert.match(html, /\{ c: 'se', flag: '🇸🇪' \}/);
  assert.match(html, /\{ c: 'be', flag: '🇧🇪' \}/);
  assert.match(html, /host\.includes\('skycheck-se'\) \|\| host\.endsWith\('skycheck\.se'\)\) return 'se'/);
  assert.match(html, /host\.includes\('skycheck-be'\) \|\| host\.endsWith\('skycheck\.be'\)\) return 'be'/);
  assert.match(html, /LFV \/ Transportstyrelsen \(CC BY 4\.0\)', url: 'https:\/\/dronechart\.lfv\.se\/'/);
});
test('beNotice: genau einmal je Sprachblock, alle vier Aussagen, nur für Belgien gerendert', () => {
  assert.equal((html.match(/^\s+beNotice: '/gm) || []).length, 5);
  const notices = [...html.matchAll(/^\s+beNotice: '((?:[^'\\]|\\.)*)'/gm)].map(m => m[1]);
  assert.equal(notices.length, 5);
  for (const text of notices) {
    assert.ok(/Droneguide/.test(text) && /skeyes/.test(text) && /BCAA/.test(text) && /AIP\/NOTAM/.test(text) && /CIS/.test(text), text);
    assert.ok(/UAS/.test(text), text);
  }
  const body = grab('renderMapStatus');
  assert.match(body, /COUNTRY === 'be'[\s\S]*?beNotice/);
});
test('renderMapStatus: Hinweis gilt für alle Live-Länder und nutzt die Tabelle statt COUNTRY === \'no\'', () => {
  const body = grab('renderMapStatus');
  assert.ok(body.includes('LIVE_NOTAM[COUNTRY]'));
  assert.ok(!body.includes("COUNTRY === 'no'"));
});

// ---- Task 5: Belgien-Hinweis dauerhaft sichtbar, Live-Knopf-Wächter ----
const BE_NOTICE = {
  de: 'Quelle: Droneguide (skeyes, im Auftrag der BCAA). SkyCheck ist keine offizielle Anwendung der BCAA oder belgischer Behörden. Maßgeblich sind allein die amtlichen Kanäle (Droneguide, AIP/NOTAM, CIS). Die Verantwortung für die Einhaltung der Vorschriften bleibt beim Fernpiloten und beim UAS-Betreiber.',
  en: 'Source: Droneguide (skeyes, on behalf of the BCAA). SkyCheck is not an official application of the BCAA or the Belgian authorities. Only the official channels (Droneguide, AIP/NOTAM, CIS) are authoritative. Responsibility for regulatory compliance remains with the remote pilot and the UAS operator.',
  fr: "Source : Droneguide (skeyes, pour le compte de la BCAA). SkyCheck n'est pas une application officielle de la BCAA ni des autorités belges. Seuls les canaux officiels (Droneguide, AIP/NOTAM, CIS) font foi. Le respect de la réglementation reste de la responsabilité du télépilote et de l'exploitant d'UAS.",
  es: 'Fuente: Droneguide (skeyes, por cuenta de la BCAA). SkyCheck no es una aplicación oficial de la BCAA ni de las autoridades belgas. Solo los canales oficiales (Droneguide, AIP/NOTAM, CIS) son vinculantes. La responsabilidad del cumplimiento normativo sigue siendo del piloto a distancia y del operador de UAS.',
  pl: 'Źródło: Droneguide (skeyes, w imieniu BCAA). SkyCheck nie jest oficjalną aplikacją BCAA ani władz belgijskich. Wiążące są wyłącznie oficjalne kanały (Droneguide, AIP/NOTAM, CIS). Odpowiedzialność za zgodność z przepisami spoczywa na pilocie bezzałogowego statku powietrznego i operatorze UAS.',
};

test('beNotice: die fünf Texte stimmen wörtlich mit der Vorgabe überein', () => {
  const found = [...html.matchAll(/^\s*beNotice: ('(?:[^'\\]|\\.)*'),?$/gm)].map(m => (0, eval)('(' + m[1] + ')'));
  assert.deepEqual(found, [BE_NOTICE.de, BE_NOTICE.en, BE_NOTICE.fr, BE_NOTICE.es, BE_NOTICE.pl]);
});

test('beNoticeShort: fünf Kurzhinweise vorhanden', () => {
  assert.equal([...html.matchAll(/^\s*beNoticeShort: '/gm)].length, 5);
});

test('Belgien-Hinweis steht außerhalb des (einklappbaren) zones-body', () => {
  assert.ok(/id="zones-body"><\/div>\s*<\/div>\s*<div id="be-notice"[^>]*hidden/.test(html));
});

test('renderZones be: Hinweisblock bei leerer Liste, mit Zonen und mit Platzhalter sichtbar', () => {
  for (const zones of [[], [{ name: 'EBR1', type: 'PROHIBITED', color: '#ef4444', lower: '0', upper: '1', legal: 'x' }], [PLACEHOLDER]]) {
    const els = zonesRender(zones, 'be');
    assert.equal(els['be-notice'].hidden, false);
    assert.equal(els['be-notice'].textContent, 'T:beNotice');
  }
});

test('renderZones se: Hinweisblock bleibt verborgen und leer', () => {
  const els = zonesRender([], 'se');
  assert.equal(els['be-notice'].hidden, true);
  assert.equal(els['be-notice'].textContent, '');
});

test('notamControlHtml: ohne Live-Quelle (lu, de) leer; mit Quelle (be) Knopf', () => {
  const run2 = country => new Function(`
    const _t = k => 'T:' + k; const escapeHtml = s => String(s);
    const COUNTRY = ${JSON.stringify(country)};
    const LIVE_NOTAM = { no: { source: 'https://a.test/' }, se: { source: 'https://b.test/' }, be: { source: 'https://c.test/' } };
    const NOTAM = { zones: null, at: 0, fetchedAt: 0, loading: false, error: false };
    const S = { layers: {} }; const NOTAM_TTL_MS = 1; const _locale = () => 'de';
    ${grab('notamFresh')}
    ${grab('notamControlHtml')}
    return notamControlHtml();`)();
  assert.equal(run2('lu'), '');
  assert.equal(run2('de'), '');
  assert.ok(run2('be').includes('data-notam-load'));
});

test('Hex-Farbwächter: ein gemeinsamer strikter Helfer, kein loses Muster mehr', () => {
  assert.ok(!html.includes('[0-9a-f]{3,8}'));
  const m = html.match(/function safeHexColor\(/);
  assert.ok(m);
  const safe = new Function(`${grab('safeHexColor')}; return safeHexColor;`)();
  assert.equal(safe('#abc', '#000'), '#abc');
  assert.equal(safe('#aabbcc', '#000'), '#aabbcc');
  assert.equal(safe('#aabbccdd', '#000'), '#aabbccdd');
  assert.equal(safe('#aabbc', '#000'), '#000');
  assert.equal(safe('#aabbccd', '#000'), '#000');
  assert.equal(safe('red;x', '#000'), '#000');
  assert.equal(safe(undefined, '#000'), '#000');
});
