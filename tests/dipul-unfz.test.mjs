// U_NFZ (temporaere_betriebseinschraenkungen): aktiv = rot, noch nicht begonnen/abgelaufen = grau/gelb.
// GFI-Zeiten ("Oct 31, 2026, 7:00:00 AM") sind UTC; Parser-Fehler dürfen nie "inaktiv" ergeben.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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

const SOON_MS = 24 * 3600 * 1000;
const timeSrc = `const SOON_MS = ${SOON_MS}; ${grab('parseDipulTime')} ${grab('dipulWindowInactive')}`;
const { parseDipulTime, dipulWindowInactive } = new Function(`${timeSrc}; return { parseDipulTime, dipulWindowInactive };`)();

const NOW = Date.UTC(2026, 9, 31, 12, 0, 0);
const H = 3600 * 1000;
const iso = ms => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');

// ---- Zeit-Parser ----
test('GFI-Form wird als UTC gelesen (unabhängig von der Prozess-Zeitzone)', () => {
  assert.equal(parseDipulTime('Oct 31, 2026, 7:00:00 AM'), Date.UTC(2026, 9, 31, 7, 0, 0));
  assert.equal(parseDipulTime('Oct 31, 2026, 11:00:00 PM'), Date.UTC(2026, 9, 31, 23, 0, 0));
  const out = execFileSync(process.execPath, ['-e',
    `${timeSrc}; console.log(parseDipulTime('Oct 31, 2026, 7:00:00 AM'), new Date(2026,9,31,7).getTime());`],
    { env: { ...process.env, TZ: 'America/New_York' } }).toString().trim().split(' ');
  assert.equal(Number(out[0]), Date.UTC(2026, 9, 31, 7, 0, 0));
  assert.notEqual(Number(out[0]), Number(out[1]), 'Testzeitzone muss von UTC abweichen');
});

test('12 AM = 0 Uhr, 12 PM = 12 Uhr, schmales Leerzeichen vor AM/PM', () => {
  assert.equal(parseDipulTime('Nov 20, 2026, 12:00:00 AM'), Date.UTC(2026, 10, 20, 0, 0, 0));
  assert.equal(parseDipulTime('Nov 20, 2026, 12:30:00 PM'), Date.UTC(2026, 10, 20, 12, 30, 0));
  assert.equal(parseDipulTime('Nov 20, 2026, 1:05:09 PM'), Date.UTC(2026, 10, 20, 13, 5, 9));
});

test('ISO mit Z und Offset', () => {
  assert.equal(parseDipulTime('2026-10-31T07:00:00Z'), Date.UTC(2026, 9, 31, 7));
  assert.equal(parseDipulTime('2026-10-31T09:00:00+02:00'), Date.UTC(2026, 9, 31, 7));
});

test('leer/Müll/deutsche Locale -> null', () => {
  for (const s of ['', null, undefined, 'null', 'garbage', '31.10.2026, 07:00:00', '31. Okt. 2026, 07:00:00',
    'Foo 31, 2026, 7:00:00 AM', 'Oct 32, 2026, 7:00:00 AM', 'Oct 31, 2026, 13:00:00 PM'])
    assert.equal(parseDipulTime(s), null, String(s));
});

// ---- Fenster-Entscheidung ----
test('Fenster: laufend -> aktiv; Start binnen 24 h -> aktiv; Start nach 24 h -> inaktiv; vorbei -> inaktiv', () => {
  assert.equal(dipulWindowInactive(iso(NOW - H), iso(NOW + H), NOW), false);
  assert.equal(dipulWindowInactive(iso(NOW + 23 * H), iso(NOW + 30 * H), NOW), false);
  assert.equal(dipulWindowInactive(iso(NOW + 25 * H), iso(NOW + 30 * H), NOW), true);
  assert.equal(dipulWindowInactive(iso(NOW - 30 * H), iso(NOW - H), NOW), true);
});

test('Fenster fail-safe: fehlende/unlesbare Zeiten -> aktiv', () => {
  assert.equal(dipulWindowInactive('', '', NOW), false);
  assert.equal(dipulWindowInactive('garbage', 'null', NOW), false);
  assert.equal(dipulWindowInactive('31.12.2030, 07:00:00', '31.12.2030, 09:00:00', NOW), false);
  assert.equal(dipulWindowInactive('', iso(NOW + H), NOW), false);
  assert.equal(dipulWindowInactive(iso(NOW - H), '', NOW), false);
});

// ---- Status ----
const evalSrc = `
  const _t = k => (typeof k === 'string' ? 'T:' + k : k);
  const escapeHtml = s => String(s ?? '');
  const isCtrZone = () => false;
  ${grab('evalZoneStatus')}`;
const evalZ = zones => new Function('zones', `${evalSrc}; return evalZoneStatus(zones);`)(zones);

test('aktive U_NFZ (echte Form, leeres type_code_detail) -> nogo mit zoneNoFly', () => {
  const r = evalZ([{ name: 'Polizeieinsatz', type: 'U_NFZ', typeDetail: '', rawType: 'U_NFZ' }]);
  assert.equal(r.lvl, 'nogo');
  assert.deepEqual(r.reasons, ['T:zoneNoFly']);
});

test('inaktive U_NFZ -> warn mit Inaktiv-Text, nicht nogo', () => {
  const r = evalZ([{ name: 'Christkindlmarkt 2026', type: 'U_NFZ', inactive: true }]);
  assert.equal(r.lvl, 'warn');
  assert.deepEqual(r.reasons, ['Christkindlmarkt 2026 · T:zoneInactive']);
});

// ---- zoneColor ----
test('zoneColor: U_NFZ rot', () => {
  const zc = new Function(`${grab('zoneColor')}; return zoneColor;`)();
  assert.equal(zc('U_NFZ'), '#ef4444');
});

// ---- parseFeatureInfo end-to-end (minimaler DOMParser-Ersatz für die GFI-Tabelle) ----
class FakeDoc {
  constructor(htmlText) { this.html = htmlText; }
  querySelectorAll(sel) {
    assert.equal(sel, 'table.featureInfo');
    return [...this.html.matchAll(/<table class="featureInfo">([\s\S]*?)<\/table>/g)].map(m => new FakeTable(m[1]));
  }
}
class FakeTable {
  constructor(inner) { this.rows = [...inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(m => m[1]); }
  querySelectorAll(sel) {
    if (sel === 'th') return this._cells(this.rows[0], 'th');
    if (sel === 'tr') return this.rows.map(r => ({ querySelectorAll: () => this._cells(r, 'td') }));
    throw new Error(sel);
  }
  _cells(row, tag) {
    return [...row.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))].map(m => ({ textContent: m[1] }));
  }
}
const COLS = ['fid', 'external_reference', 'legal_ref', 'start_time', 'end_time', 'name', 'type_code',
  'generated_name_de', 'generated_name_en', 'lower_limit_altitude', 'lower_limit_unit', 'lower_limit_alt_ref',
  'upper_limit_altitude', 'upper_limit_unit', 'upper_limit_alt_ref'];
const gfiTime = ms => {
  const d = new Date(ms); const h = d.getUTCHours();
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
  return `${mon} ${d.getUTCDate()}, ${d.getUTCFullYear()}, ${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
const gfiTable = (name, start, end, type = 'U_NFZ') => `<table class="featureInfo"><tr>${COLS.map(c => `<th>${c}</th>`).join('')}</tr>
<tr>${[`temporaere_betriebseinschraenkungen.1`, 'null', '§ 21h', start, end, name, type, name, name, '0', 'M', 'AGL', '1000', 'M', 'AGL']
  .map(v => `<td>${v}</td>`).join('')}</tr></table>`;
const parse = src => new Function('DOMParser', 'SOON_MS', 'zoneColor', 'dipulLimits', `
  ${grab('parseDipulTime')} ${grab('dipulWindowInactive')} ${grab('parseFeatureInfo')}
  return parseFeatureInfo;`)(class { parseFromString(t) { return new FakeDoc(t); } }, SOON_MS,
  new Function(`${grab('zoneColor')}; return zoneColor;`)(),
  () => ({ lowerMslM: null, lower: '0 M AGL', lowerRaw: 0, lowerRef: 'AGL', lowerUnit: 'm', upper: '1000 M AGL' }))(src);

test('parseFeatureInfo: laufende U_NFZ aktiv, rot', () => {
  const [z] = parse(gfiTable('Polizeieinsatz', gfiTime(Date.now() - 2 * H), gfiTime(Date.now() + 2 * H)));
  assert.equal(z.type, 'U_NFZ');
  assert.ok(!z.inactive);
  assert.equal(z.color, '#ef4444');
});

test('parseFeatureInfo: noch nicht begonnene U_NFZ (Start in 20 Tagen) -> inactive, grau', () => {
  const [z] = parse(gfiTable('Christkindlmarkt 2026', gfiTime(Date.now() + 20 * 24 * H), gfiTime(Date.now() + 21 * 24 * H)));
  assert.equal(z.inactive, true);
  assert.equal(z.color, '#64748b');
});

test('parseFeatureInfo: abgelaufene U_NFZ -> inactive; Start in 12 h -> aktiv; deutsche Locale -> aktiv', () => {
  assert.equal(parse(gfiTable('x', gfiTime(Date.now() - 5 * H), gfiTime(Date.now() - H)))[0].inactive, true);
  assert.ok(!parse(gfiTable('x', gfiTime(Date.now() + 12 * H), gfiTime(Date.now() + 20 * H)))[0].inactive);
  const de = parse(gfiTable('x', '31.12.2035, 07:00:00', '31.12.2035, 09:00:00'))[0];
  assert.ok(!de.inactive);
  assert.equal(de.color, '#ef4444');
});

test('parseFeatureInfo: andere Typen bekommen nie inactive', () => {
  const [z] = parse(gfiTable('x', gfiTime(Date.now() + 20 * 24 * H), gfiTime(Date.now() + 21 * 24 * H), 'RESTRICTED'));
  assert.ok(!z.inactive);
});
