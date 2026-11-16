// Zieht die Luftverkehr-Funktionen per Namenssuche aus skycheck.html und prüft sie mit Stubs.
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
const grabLine = re => { const m = html.match(re); assert.ok(m, String(re)); return m[0]; };

// ── fetchAircraftCached ──────────────────────────────────────────────────────
function cacheEnv(results) {
  const calls = [];
  const code = `
    ${grabLine(/let _acLastFetch = 0[^\n]*/)}
    ${grabLine(/const AC_COOLDOWN_MS[^\n]*/)}
    ${grabLine(/const AC_MOVE_THRESH_KM[^\n]*/)}
    ${grab('_acDistKm')}
    const fetchAircraft = async () => { calls.push(1); return results.shift(); };
    console = { log() {} };
    ${grab('fetchAircraftCached')}
    return fetchAircraftCached;`;
  return { fn: new Function('calls', 'results', 'console', code)(calls, results, { log() {} }), calls };
}

test('fetchAircraftCached: Fehlschlag wird nicht gecacht, nächster Aufruf fragt neu an', async () => {
  const { fn, calls } = cacheEnv([[{ api_error: 'HTTP_ERROR' }], [{ api_error: 'HTTP_ERROR' }], [{ icao: 'a', lat: 1, lon: 2 }]]);
  assert.equal((await fn(50, 8))[0].api_error, 'HTTP_ERROR');
  assert.equal((await fn(50, 8))[0].api_error, 'HTTP_ERROR');
  assert.equal(calls.length, 2);                      // genau ein Request je Aufruf
  assert.equal((await fn(50, 8))[0].icao, 'a');
  assert.equal(calls.length, 3);
});

test('fetchAircraftCached: Erfolg behält den Cooldown (kein zweiter Request)', async () => {
  const { fn, calls } = cacheEnv([[{ icao: 'a' }], [{ icao: 'b' }]]);
  await fn(50, 8); const r = await fn(50, 8);
  assert.equal(calls.length, 1);
  assert.equal(r[0].icao, 'a');
});

test('fetchAircraftCached: leere Erfolgsliste ist ein Erfolg und wird gecacht', async () => {
  const { fn, calls } = cacheEnv([[], [{ icao: 'b' }]]);
  await fn(50, 8); await fn(50, 8);
  assert.equal(calls.length, 1);
});

// ── Callsign-Helfer ──────────────────────────────────────────────────────────
test('_csTrim/_acLabel vertragen Nicht-Strings', () => {
  const { _csTrim, _acLabel } = new Function(`${grab('_csTrim')}\n${grab('_acLabel')}\nreturn { _csTrim, _acLabel };`)();
  assert.equal(_csTrim(' DLH1 '), 'DLH1');
  assert.equal(_csTrim(123), '');
  assert.equal(_csTrim(null), '');
  assert.equal(_acLabel({ flight: 123, hex: 'abc' }), 'abc');
  assert.equal(_acLabel({ flight: {}, hex: 5 }), '?');
  assert.equal(_acLabel({ flight: ' X1 ', hex: 'abc' }), 'X1');
});

// ── avPoll-Zustandsautomat ───────────────────────────────────────────────────
function pollEnv() {
  const els = {};
  const mk = id => (els[id] = { className: '', textContent: '', classList: { contains(c) { return els[id].className.split(' ').includes(c); } } });
  ['av-stat', 'av-banner'].forEach(mk);
  const log = { markers: 0, prox: 0, clears: 0, lowalt: 0, throwIn: null, intervals: [] };
  const AV = { POLL_MS: 5000, TIMEOUT_MS: 9000, pollSeq: 0, failCount: 0, state: 'connecting', inflight: null, ctrl: null,
    locationSeq: 0, lat: 50, lon: 8, alarmOn: false, beepInterval: null, trails: {}, acLayer: { clearLayers() { log.clears++; } }, trailLayer: { clearLayers() { log.clears++; } } };
  const env = { AV, els, log, responses: [], fetchCalls: [] };
  const code = `
    const $ = id => els[id];
    const _t = k => 'T:' + k;
    const ADSB_URL = '/.netlify/functions/adsb';
    const setInterval = () => 1, clearInterval = () => {};
    const avUpdateMarkers = p => { log.markers++; if (log.throwIn === 'markers') throw new Error('x'); };
    const avCheckProx = p => { log.prox++; if (log.throwIn === 'prox') throw new Error('y'); els['av-stat'].className = 'av-stat watch'; els['av-stat'].textContent = _t('avWatch'); };
    const avUpdateLowAlt = () => { log.lowalt++; };
    ${['_csTrim', '_acLabel', 'avRenderConnecting', 'avRenderNoData', 'avRenderWatch', 'avRelang', 'avClearMarkers', 'avSetNoData', 'avStartPoll', 'avStopPoll', 'avPoll'].map(grab).join('\n')}
    return { avStartPoll, avStopPoll, avPoll, avRelang };`;
  const fetchStub = (url, opts) => {
    env.fetchCalls.push({ url, opts });
    const next = env.responses.shift();
    return typeof next === 'function' ? next(opts) : Promise.resolve(next);
  };
  Object.assign(env, new Function('AV', 'els', 'log', 'fetch', 'console', code)(AV, els, log, fetchStub, { warn() {} }));
  return env;
}
const okRes = ac => ({ ok: true, json: async () => ({ ac }) });
const flush = () => new Promise(r => setImmediate(r));

test('avPoll: connecting → watch erst nach erstem Erfolg', async () => {
  const e = pollEnv();
  e.responses.push(okRes([]));
  e.avStartPoll();
  assert.equal(e.AV.state, 'connecting');
  assert.equal(e.els['av-stat'].className, 'av-stat connecting');
  assert.equal(e.els['av-stat'].textContent, 'T:avConnecting');
  await flush();
  assert.equal(e.AV.state, 'watch');
  assert.equal(e.els['av-stat'].className, 'av-stat watch');
  assert.equal(e.log.markers, 1);
  assert.match(e.fetchCalls[0].url, /^\/\.netlify\/functions\/adsb\?lat=50&lon=8&dist=10$/);
});

test('avPoll: ein Fehler → noch keine Warnung, zweiter in Folge → noData; Erfolg → Erholung', async () => {
  const e = pollEnv();
  e.responses.push({ ok: false, status: 502 }, { ok: true, json: async () => ({ nope: 1 }) }, okRes([]));
  e.avStartPoll(); await flush();
  assert.equal(e.AV.state, 'connecting');               // nach 1 Fehler weiterhin neutral
  assert.equal(e.els['av-banner'].className, '');
  await e.avPoll();                                       // 2. Fehler (200 ohne ac-Liste)
  assert.equal(e.AV.state, 'nodata');
  assert.equal(e.els['av-stat'].className, 'av-stat nodata');
  assert.equal(e.els['av-banner'].className, 'av-banner show nodata');
  assert.equal(e.els['av-banner'].textContent, '⚠ T:avNoData');
  assert.ok(e.log.clears >= 2);
  await e.avPoll();                                       // Erfolg
  assert.equal(e.AV.state, 'watch');
  assert.equal(e.els['av-banner'].className, 'av-banner');
  assert.equal(e.els['av-stat'].className, 'av-stat watch');
});

test('avPoll: Netzfehler (fetch wirft) zählt als Fehler', async () => {
  const e = pollEnv();
  e.responses.push(() => Promise.reject(new Error('net')), () => Promise.reject(new Error('net')));
  e.avStartPoll(); await flush(); await e.avPoll();
  assert.equal(e.AV.state, 'nodata');
});

test('avPoll: Exception in avUpdateMarkers/avCheckProx zählt als Fehlschlag (kein falsches „Beobachte“)', async () => {
  for (const where of ['markers', 'prox']) {
    const e = pollEnv();
    e.log.throwIn = where;
    e.responses.push(okRes([]), okRes([]));
    e.avStartPoll(); await flush();
    assert.equal(e.AV.state, 'connecting', where);
    assert.equal(e.els['av-stat'].className, 'av-stat connecting', where);
    await e.avPoll();
    assert.equal(e.AV.state, 'nodata', where);
    assert.equal(e.els['av-stat'].className, 'av-stat nodata', where);
  }
});

test('avPoll: Exception im Betrieb (watch) zählt, zweite in Folge → noData', async () => {
  const e = pollEnv();
  e.responses.push(okRes([]), okRes([]), okRes([]));
  e.avStartPoll(); await flush();
  assert.equal(e.AV.state, 'watch');
  e.log.throwIn = 'markers';
  await e.avPoll();
  assert.equal(e.AV.state, 'watch');
  await e.avPoll();
  assert.equal(e.AV.state, 'nodata');
});

test('avPoll: In-flight-Guard überspringt Ticks ohne Erfolg/Fehler zu zählen', async () => {
  const e = pollEnv();
  let release;
  e.responses.push(() => new Promise(r => { release = () => r(okRes([])); }));
  e.avStartPoll();
  await e.avPoll(); await e.avPoll();                    // zwei Ticks während der Poll läuft
  assert.equal(e.fetchCalls.length, 1);
  assert.equal(e.AV.failCount, 0);
  release(); await flush();
  assert.equal(e.AV.state, 'watch');
  e.responses.push(okRes([]));
  await e.avPoll();
  assert.equal(e.fetchCalls.length, 2);                  // danach wieder frei
});

test('avPoll: Client-Timeout bricht per AbortController ab und zählt als Fehler', async () => {
  const e = pollEnv();
  e.AV.TIMEOUT_MS = 20;
  const hang = o => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(new Error('abort'))));
  e.responses.push(hang, hang);
  e.avStartPoll(); await new Promise(r => setTimeout(r, 60));
  assert.equal(e.AV.failCount, 1);
  assert.equal(e.AV.inflight, null);
  await e.avPoll();
  assert.equal(e.AV.state, 'nodata');
});

test('avPoll: Antwort nach avStopPoll oder Standortwechsel wird verworfen', async () => {
  const e = pollEnv();
  let rel1, rel2;
  e.responses.push(() => new Promise(r => { rel1 = () => r(okRes([])); }));
  e.avStartPoll(); e.avStopPoll(); rel1(); await flush();
  assert.equal(e.log.markers, 0);
  assert.equal(e.AV.state, 'connecting');
  e.responses.push(() => new Promise(r => { rel2 = () => r(okRes([])); }));
  e.avStartPoll(); e.AV.locationSeq++; rel2(); await flush();
  assert.equal(e.log.markers, 0);
});

test('avRelang: Text folgt der Sprache in allen drei Zuständen', async () => {
  const e = pollEnv();
  e.AV.state = 'connecting'; e.avRelang();
  assert.equal(e.els['av-stat'].textContent, 'T:avConnecting');
  e.AV.state = 'nodata'; e.avRelang();
  assert.equal(e.els['av-banner'].textContent, '⚠ T:avNoData');
  e.AV.state = 'watch'; e.els['av-stat'].className = 'av-stat watch'; e.els['av-stat'].textContent = 'alt'; e.avRelang();
  assert.equal(e.els['av-stat'].textContent, 'T:avWatch');
  e.els['av-stat'].className = 'av-stat alarm'; e.els['av-stat'].textContent = 'ALARM'; e.avRelang();
  assert.equal(e.els['av-stat'].textContent, 'ALARM');   // Alarm-Text bleibt unberührt
});

// ── Quelltext-Prüfungen ──────────────────────────────────────────────────────
test('avClose räumt Marker, Spuren und Tiefflieger-Liste auf', () => {
  const src = grab('avClose');
  assert.match(src, /avClearMarkers\(\)/);
  assert.match(grab('avClearMarkers'), /acLayer\.clearLayers[\s\S]*trailLayer\.clearLayers[\s\S]*AV\.trails = \{\}[\s\S]*avUpdateLowAlt\(\[\]\)/);
});

test('avConnecting existiert in allen fünf Sprachen', () => {
  assert.equal((html.match(/avConnecting: '/g) || []).length, 5);
  assert.equal((html.match(/avNoData: '/g) || []).length, 5);
});

test('Callsign in der Hauptansicht-Karte wird escaped', () => {
  assert.match(html, /\$\{escapeHtml\(cls\.ac\.callsign\) \|\| _t\('airUnknown'\)\}/);
});
