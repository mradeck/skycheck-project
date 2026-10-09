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
    const ZONE_LOOKUP_TIMEOUT_MS = 20000;
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
          const esEasa = () => true; const console = { warn() {} }; const notamNoHits = () => []; const ZONE_LOOKUP_TIMEOUT_MS = 20000;
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
    const ED269_COUNTRIES = { lu: 1, no: 1, ee: 1 };
    const esEasa = () => false;
    const console = { warn() {}, info() {}, log() {} };
    const notamNoHits = ${notamSrc};
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
