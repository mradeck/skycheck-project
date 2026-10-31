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
  return `${mon} ${d.getUTCDate()}, ${d.getUTCFullYear()}, ${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}\u202F${h < 12 ? 'AM' : 'PM'}`;
};
const gfiTable = (name, start, end, type = 'U_NFZ') => `<table class="featureInfo"><tr>${COLS.map(c => `<th>${c}</th>`).join('')}</tr>
<tr>${[`temporaere_betriebseinschraenkungen.1`, 'null', '§ 21h', start, end, name, type, name, name, '0', 'M', 'AGL', '1000', 'M', 'AGL']
  .map(v => `<td>${v}</td>`).join('')}</tr></table>`;
const parse = src => new Function('DOMParser', 'SOON_MS', 'zoneColor', '_t', 'FT_TO_M', `
  ${grab('altitudeToMetres')} ${grab('dipulLimits')}
  ${grab('parseDipulTime')} ${grab('dipulWindowInactive')} ${grab('dipulWindowNote')} ${grab('parseFeatureInfo')}
  return parseFeatureInfo;`)(class { parseFromString(t) { return new FakeDoc(t); } }, SOON_MS,
  new Function(`${grab('zoneColor')}; return zoneColor;`)(), k => (typeof k === 'string' ? t => `${k}(${t})` : k), 0.3048)(src);

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
  const [z] = parse(gfiTable('x', gfiTime(Date.now() + 20 * 24 * H), gfiTime(Date.now() + 21 * 24 * H), 'RESTRICTED').replace('temporaere_betriebseinschraenkungen.1', 'flugbeschraenkungsgebiete.1'));
  assert.ok(!z.inactive);
});

// ---- Rollover ----
test('parseDipulTime: unmögliche Daten und unbekannte Monatswörter -> null', () => {
  for (const x of ['2026-13-01T00:00:00Z', '2026-02-31T00:00:00Z', 'Feb 31, 2026, 7:00:00 AM',
    'Octopus 31, 2026, 7:00:00 AM', 'Oct 31, 2026, 7:61:00 AM', '2026-10-31T25:00:00Z'])
    assert.equal(parseDipulTime(x), null, x);
  assert.equal(parseDipulTime('Feb 28, 2026, 7:00:00 AM'), Date.UTC(2026, 1, 28, 7));
});

// ---- Inaktiv-Ebene (echte Spalten) ----
const INACT_COLS = ['fid', 'external_reference', 'name', 'lower_limit_value', 'lower_limit_unit', 'lower_limit_reference',
  'upper_limit_value', 'upper_limit_unit', 'upper_limit_reference', 'legal_ref', 'start_time', 'end_time', 'recurrence_rule'];
const inactTable = (start, end, rec = '') => `<table class="featureInfo"><caption class="featureInfo">inaktive_temporaere_betriebseinschraenkungen</caption>
<tr><th>${INACT_COLS.join('</th><th >')}</th></tr>
<tr><td>${['inaktive_temporaere_betriebseinschraenkungen.90292308-8cf3-4b44-8cc6-8b54968c307a', '90292308-8cf3-4b44-8cc6-8b54968c307a',
  'Polizeilicher Einsatz in Nordrhein-Westfalen', '0.0', 'M', 'AGL', '305.0', 'M', 'AGL', '§ 21h, Abs. 3 (11.) LuftVO', start, end, rec].join('</td><td>')}</td></tr></table>`;

test('Inaktiv-Ebene: abgelaufen -> inactive, Limits 305 M AGL, Typ U_NFZ, Enddatum im desc', () => {
  const [z] = parse(inactTable('Mar 19, 2026, 11:00:00\u202FPM', 'Mar 27, 2026, 10:59:00\u202FPM'));
  assert.equal(z.type, 'U_NFZ');
  assert.equal(z.inactive, true);
  assert.equal(z.lower, 'GND');
  assert.equal(z.upper, '305.0 M AGL');
  assert.equal(z.desc, 'nfzEnded(2026-03-27 22:59 UTC)');
  assert.equal(z.name, 'Polizeilicher Einsatz in Nordrhein-Westfalen');
});

test('Inaktiv-Ebene: noch nicht begonnen -> inactive mit Startdatum; laufend -> aktiv, rot, "gilt bis"', () => {
  const s20 = Date.now() + 20 * 24 * H;
  const a = parse(inactTable(gfiTime(s20), gfiTime(s20 + H)))[0];
  assert.equal(a.inactive, true);
  assert.match(a.desc, /^nfzStarts\(/);
  const b = parse(inactTable(gfiTime(Date.now() - H), gfiTime(Date.now() + 2 * H)))[0];
  assert.ok(!b.inactive);
  assert.equal(b.color, '#ef4444');
  assert.match(b.desc, /^nfzUntil\(/);
  assert.equal(evalZ([b]).lvl, 'nogo');
});

test('Inaktiv-Ebene: gesetzte recurrence_rule -> nie inaktiv (fail-safe aktiv)', () => {
  const [z] = parse(inactTable('Mar 19, 2026, 11:00:00 PM', 'Mar 27, 2026, 10:59:00 PM', 'FREQ=WEEKLY'));
  assert.ok(!z.inactive);
  assert.equal(z.color, '#ef4444');
  assert.equal(z.desc, undefined);
});

test('Temporäre Ebene: external_reference (UUID) wird nicht an den Namen gehängt', () => {
  const t = gfiTable('Christkindlmarkt 2026', gfiTime(Date.now() - H), gfiTime(Date.now() + H))
    .replace('<td>null</td>', '<td>9b5e3ee3-1111-2222-3333-444455556666</td>');
  assert.equal(parse(t)[0].name, 'Christkindlmarkt 2026');
});

test('Typ-Gate: U_NFZ wird aus rawType erkannt, auch mit gefülltem type_code_detail', () => {
  const r = evalZ([{ name: 'x', type: 'Irgendwas', rawType: 'U_NFZ' }]);
  assert.equal(r.lvl, 'nogo');
});

// ---- Banner-Reihenfolge ----
test('Gründe: No-Go zuerst, Datenausfall ganz vorn, sonst Listenreihenfolge', () => {
  const r = evalZ([
    { name: 'Wasserstraße', type: 'Binnenwasserstraße' },
    { name: 'Industrie', type: 'Industrieanlage' },
    { name: 'ED-R', type: 'U_NFZ' },
    { unavailable: true }]);
  assert.equal(r.lvl, 'nogo');
  assert.equal(r.reasons[0], 'T:zoneDataUnavailable');
  assert.equal(r.reasons[1], 'T:zoneNoFly');
  assert.ok(r.reasons.length >= 3);
  const r2 = evalZ([{ name: 'alt', type: 'U_NFZ', inactive: true }, { name: 'neu', type: 'U_NFZ' }]);
  assert.deepEqual(r2.reasons, ['T:zoneNoFly', 'alt · T:zoneInactive']);
});

// ---- Source-Wiring: Sortierung und Kartenstatus ----
test('fetchZonesDE: inaktive Zonen werden hinten einsortiert', () => {
  assert.match(grab('fetchZonesDE'), /Number\(!!a\.inactive\) - Number\(!!b\.inactive\)/);
  const sorted = [{ n: 1, inactive: true }, { n: 2 }].sort((a, b) => Number(false) - Number(false) || Number(!!a.inactive) - Number(!!b.inactive));
  assert.equal(sorted[0].n, 2);
});

test('renderMapStatus: u_nfz -> Flugverbot-Label (rot), inaktiv -> grau, No-Go-Zone zuerst', () => {
  const src = grab('renderMapStatus');
  const run = zones => {
    let html = '';
    const el = { querySelector: () => null, set innerHTML(v) { html = v; }, get innerHTML() { return html; }, classList: { toggle() {}, remove() {} } };
    const fn = new Function('$', '_t', 'escapeHtml', 'isCtrZone', 'safeHexColor', 'evalZoneStatus', 'S', 'COUNTRY', 'LIVE_NOTAM', `
      ${src}; return renderMapStatus;`)(() => el, k => (typeof k === 'string' ? 'T:' + k : k), s => String(s ?? ''),
      () => false, (c, d) => c || d, zs => evalZ(zs), { lat: NaN }, 'de', {});
    fn(null, zones, el);
    return html;
  };
  const h = run([{ name: 'Wasserstraße Elbe', type: 'Binnenwasserstraßen' }, { name: 'ED-R', type: 'U_NFZ' }]);
  assert.ok(h.indexOf('T:msProhibited') !== -1, h);
  assert.ok(h.indexOf('T:msProhibited') < h.indexOf('T:msWaterway'), 'No-Go vor Wasserstraße');
  assert.match(run([{ name: 'Markt', type: 'U_NFZ', inactive: true }]), /Markt · T:zoneInactive/);
});

test('Inaktiv-Ebene: untere Grenze aus lower_limit_value/_reference (50 M AGL)', () => {
  const [z] = parse(inactTable('Mar 19, 2026, 11:00:00 PM', 'Mar 27, 2026, 10:59:00 PM').replace('<td>0.0</td>', '<td>50.0</td>'));
  assert.equal(z.lower, '50.0 M AGL');
});
