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
  assert.equal(e.els['av-stat'].textContent, '\u26a0 T:avNoDataShort');   // Chip kurz
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
  assert.equal((html.match(/avNoDataShort: '/g) || []).length, 5);
});

test('Callsign in der Hauptansicht-Karte wird escaped', () => {
  assert.match(html, /\$\{escapeHtml\(cls\.ac\.callsign\) \|\| _t\('airUnknown'\)\}/);
});

test('avPositionStatus: Panel liegt unter dem sichtbaren Banner, Offset wird wieder entfernt', () => {
  const els = { 'av-banner': { offsetTop: 36, offsetHeight: 45 }, 'av-map-status': { style: { top: '' } } };
  const f = new Function('els', `const $ = id => els[id];\n${grab('avPositionStatus')}\nreturn avPositionStatus;`)(els);
  f(); assert.equal(els['av-map-status'].style.top, '89px');
  els['av-banner'].offsetHeight = 0; f(); assert.equal(els['av-map-status'].style.top, '');
});

// ── checkAircraftAlarm: Datenausfall in der Hauptansicht ────────────────────
function alarmEnv() {
  const mkCls = () => { const s = new Set(); return { add: c => s.add(c), remove: c => s.delete(c), contains: c => s.has(c), s }; };
  const els = {
    'alarm-banner': { classList: mkCls() },
    'alarm-text': { textContent: '' },
    'alarm-dismiss': { textContent: 'Stumm schalten ✕', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } },
  };
  const log = { bells: 0, intervals: [], cleared: [] };
  const STR = { alarmNoData: 'NODATA', closeAria: 'CLOSE', alarmMsg: (l, d, a) => `${l} ${d} ${a}`, alarmCraftCount: n => `${n} craft` };
  const code = `
    ${grab('_distM')}
    ${grab('alarmSetDismissLabel')}
    ${grab('alarmRenderNoData')}
    ${grab('alarmRelang')}
    ${grab('alarmReset')}
    ${grab('silenceAlarm')}
    ${grab('checkAircraftAlarm')}
    return { checkAircraftAlarm, silenceAlarm, alarmRelang, alarmReset };`;
  const S = { lat: 50, lon: 8, alarm: { active: false, silenced: false, intervalId: null, noData: false, noDataDismissed: false } };
  const document = { getElementById: id => els[id] || null };
  const api = new Function('S', 'document', '_t', 'playBell', 'setInterval', 'clearInterval', code)(
    S, document, k => STR[k], () => { log.bells++; },
    () => { log.intervals.push(1); return log.intervals.length; }, id => { log.cleared.push(id); });
  const b = els['alarm-banner'].classList;
  return { S, els, log, b, ...api };
}
const OUT = [{ api_error: 'HTTP_ERROR' }];
const THREAT = [{ icao: 'x', lat: 50.001, lon: 8, altBaro: 100 }];
const FAR = [{ icao: 'y', lat: 51, lon: 9, altBaro: 5000 }];

test('Alarm: Ausfall zeigt amberfarbenes Banner mit Text, kein Ton', () => {
  const e = alarmEnv();
  e.checkAircraftAlarm(OUT);
  assert.ok(e.b.contains('active') && e.b.contains('nodata'));
  assert.equal(e.els['alarm-text'].textContent, '⚠️ NODATA');
  assert.equal(e.log.bells, 0);
  assert.equal(e.log.intervals.length, 0);
  assert.equal(e.S.alarm.active, false);
  assert.equal(e.els['alarm-dismiss'].textContent, '✕');
  assert.equal(e.els['alarm-dismiss'].attrs['aria-label'], 'CLOSE');
});

test('Alarm: Ausfall während aktivem Bedrohungsalarm stoppt Glocke, Banner wird nodata', () => {
  const e = alarmEnv();
  e.checkAircraftAlarm(THREAT);
  assert.equal(e.log.bells, 1); assert.equal(e.S.alarm.active, true);
  e.checkAircraftAlarm(OUT);
  assert.deepEqual(e.log.cleared, [1]);
  assert.equal(e.S.alarm.intervalId, null);
  assert.equal(e.S.alarm.active, false);
  assert.ok(e.b.contains('nodata') && e.b.contains('active'));
  assert.equal(e.log.bells, 1);
});

test('Alarm: Ausfall-Hinweis schließen bleibt bei weiteren Fehlschlägen verborgen', () => {
  const e = alarmEnv();
  e.checkAircraftAlarm(OUT);
  e.silenceAlarm();
  assert.equal(e.b.contains('active'), false);
  assert.equal(e.S.alarm.noDataDismissed, true);
  assert.equal(e.S.alarm.silenced, false);
  e.checkAircraftAlarm(OUT);
  assert.equal(e.b.contains('active'), false);
});

test('Alarm: Daten zurück ohne Bedrohung blendet Banner aus, setzt Flag und Label zurück', () => {
  const e = alarmEnv();
  e.checkAircraftAlarm(OUT); e.silenceAlarm();
  e.checkAircraftAlarm(FAR);
  assert.equal(e.b.contains('nodata'), false);
  assert.equal(e.b.contains('active'), false);
  assert.equal(e.S.alarm.noData, false); assert.equal(e.S.alarm.noDataDismissed, false);
  assert.equal(e.els['alarm-dismiss'].textContent, 'Stumm schalten ✕');
  assert.equal(e.els['alarm-dismiss'].attrs['aria-label'], undefined);
  // Nach Erholung wird ein neuer Ausfall wieder gezeigt
  e.checkAircraftAlarm(OUT);
  assert.ok(e.b.contains('active'));
});

test('Alarm: Daten zurück mit Bedrohung zeigt rotes Banner und läutet', () => {
  const e = alarmEnv();
  e.checkAircraftAlarm(OUT);
  e.checkAircraftAlarm(THREAT);
  assert.equal(e.b.contains('nodata'), false);
  assert.ok(e.b.contains('active'));
  assert.equal(e.log.bells, 1);
  assert.ok(e.els['alarm-text'].textContent.includes('x'));
  assert.equal(e.S.alarm.active, true);
});

test('Alarm: Daten zurück mit stummgeschalteter Bedrohung lässt kein Ausfall-Banner stehen', () => {
  const e = alarmEnv();
  e.checkAircraftAlarm(THREAT); e.silenceAlarm();          // silenced = true
  e.checkAircraftAlarm(OUT);
  assert.equal(e.S.alarm.silenced, true);
  e.checkAircraftAlarm(THREAT);
  assert.equal(e.b.contains('active'), false);
  assert.equal(e.b.contains('nodata'), false);
});

test('Alarm: [] und normale Listen verhalten sich wie zuvor', () => {
  const e = alarmEnv();
  e.checkAircraftAlarm([]);
  assert.equal(e.b.contains('active'), false); assert.equal(e.b.contains('nodata'), false);
  assert.equal(e.S.alarm.noData, false);
  e.checkAircraftAlarm(FAR);
  assert.equal(e.b.contains('active'), false);
  e.checkAircraftAlarm(THREAT);
  assert.ok(e.b.contains('active')); assert.equal(e.log.bells, 1);
  e.silenceAlarm();
  assert.equal(e.S.alarm.silenced, true); assert.equal(e.b.contains('active'), false);
  e.checkAircraftAlarm(THREAT);                      // bleibt stumm
  assert.equal(e.b.contains('active'), false);
  e.checkAircraftAlarm(FAR);                         // keine Bedrohung setzt silenced zurück
  assert.equal(e.S.alarm.silenced, false);
});

test('Alarm: Sprachwechsel setzt Ausfalltext neu, sonst nichts', () => {
  const e = alarmEnv();
  e.alarmRelang();
  assert.equal(e.els['alarm-text'].textContent, '');
  e.checkAircraftAlarm(OUT);
  e.els['alarm-text'].textContent = 'überschrieben';
  e.alarmRelang();
  assert.equal(e.els['alarm-text'].textContent, '⚠️ NODATA');
});

test('alarmNoData existiert in allen fünf Sprachen', () => {
  assert.equal((html.match(/^\s*alarmNoData: '/gm) || []).length, 5);
  assert.ok(html.includes("alarmNoData: 'Keine Luftverkehrsdaten – Tiefflieger-Warnung nicht aktiv'"));
});

test('alarmReset (Zurück-Button): löscht Zustand, Banner, Intervall und Label', () => {
  const e = alarmEnv();
  e.checkAircraftAlarm(THREAT);
  e.alarmReset();
  assert.deepEqual(e.log.cleared, [1]);
  assert.equal(e.b.contains('active'), false);
  assert.ok(!e.S.alarm.active && !e.S.alarm.silenced && !e.S.alarm.intervalId);
  const e2 = alarmEnv();
  e2.checkAircraftAlarm(OUT); e2.silenceAlarm();
  e2.alarmReset();
  assert.equal(e2.b.contains('nodata'), false);
  assert.ok(!e2.S.alarm.noData && !e2.S.alarm.noDataDismissed);
  assert.equal(e2.els['alarm-dismiss'].textContent, 'Stumm schalten ✕');
  assert.ok(/\$\('btn-back'\)[\s\S]{0,400}alarmReset\(\)/.test(html), 'Back-Handler ruft alarmReset');
});

test('Alarm: Ausfall-Dismissal gilt nur für denselben Ort', () => {
  const e = alarmEnv();
  e.checkAircraftAlarm(OUT); e.silenceAlarm();
  e.checkAircraftAlarm(OUT);                       // gleicher Ort: bleibt zu
  assert.equal(e.b.contains('active'), false);
  e.S.lat = 51;                                    // anderer Ort
  e.checkAircraftAlarm(OUT);
  assert.ok(e.b.contains('active'));
  assert.equal(e.S.alarm.noDataDismissed, false);
});

test('avClose zeigt den Ausfall-Hinweis wieder, aber kein Bedrohungsbanner', () => {
  const body = grab('avClose');
  assert.ok(/S\.alarm\.noData && !S\.alarm\.noDataDismissed/.test(body));
  assert.ok(/classList\.add\('active'\)/.test(body));
  assert.ok(!/threat/i.test(body));
});

test('amber Banner-Hintergrund kontrastreich und in beiden Ansichten gleich', () => {
  assert.equal((html.match(/background: rgb\(160, 90, 0\)/g) || []).length, 2);
});

test('switchLang ruft alarmRelang', () => {
  assert.ok(/alarmRelang\(\);/.test(grab('switchLang')));
});
