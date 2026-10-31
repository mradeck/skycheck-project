// Wächter für das DiPUL-Schema: reine Vergleichslogik, ohne Netzwerk (Fixtures).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ServiceUnavailable, ServiceBlocked, run, checkBboxProbe, checkGfiKontrollzonen, WFS_REQUIREMENTS, INACTIVE_COLUMNS, loadSkycheckHelpers, parseXsdFields, parseWmsLayerNames,
  parseGfiTable, checkFields, checkKontrollzonen, checkTemporaere, checkWmsLayers, checkInactiveGfi,
  interpretResponse, parseJsonFeatures, fetchWithRetry, formatProblem,
} from '../scripts/check-dipul-schema.mjs';

const html = readFileSync(fileURLToPath(new URL('../skycheck.html', import.meta.url)), 'utf8');
const helpers = loadSkycheckHelpers(html);

const xsd = fields => `<?xml version="1.0"?><xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema"><xsd:complexType name="xType"><xsd:complexContent><xsd:extension base="gml:AbstractFeatureType"><xsd:sequence>
${fields.map(f => `<xsd:element maxOccurs="1" minOccurs="0" name="${f}" nillable="true" type="xsd:string"/>`).join('\n')}
</xsd:sequence></xsd:extension></xsd:complexContent></xsd:complexType><xsd:element name="x" substitutionGroup="gml:AbstractFeature" type="dipul:xType"/></xsd:schema>`;

const KZ_FIELDS = ['geom', 'lower_limit_m_agl', 'legal_ref', 'generated_name_EN', 'lower_limit_ft_msl', 'type_code_detail', 'external_reference', 'upper_limit_ft_msl', 'generated_name_DE', 'type_code'];
const TMP_FIELDS = ['external_reference', 'legal_ref', 'start_time', 'end_time', 'type_code', 'generated_name_de', 'generated_name_en', 'lower_limit_altitude', 'lower_limit_unit', 'lower_limit_alt_ref', 'upper_limit_altitude', 'upper_limit_unit', 'upper_limit_alt_ref', 'geom'];

// ---- Helfer aus skycheck.html ----
test('Layerliste und Funktionen kommen aus skycheck.html', () => {
  assert.ok(helpers.layers.includes('kontrollzonen') && helpers.layers.includes('inaktive_temporaere_betriebseinschraenkungen'));
  assert.equal(helpers.parseDipulTime('2026-10-31T07:00:00Z'), Date.UTC(2026, 9, 31, 7));
  assert.equal(helpers.dipulLimits({ lower_limit_ft_msl: 100, lower_limit_m_agl: 0 }).lowerRaw, 100);
});

// ---- Felder ----
test('echtes Schema besteht; Top-Level-Element zählt nicht als Feld', () => {
  assert.deepEqual(parseXsdFields(xsd(KZ_FIELDS)), KZ_FIELDS);
  for (const [layer, f] of [['kontrollzonen', KZ_FIELDS], ['temporaere_betriebseinschraenkungen', TMP_FIELDS]])
    assert.deepEqual(checkFields(layer, f, WFS_REQUIREMENTS[layer]), []);
});

test('umbenanntes Feld schlägt fehl und nennt Ebene, Feld, Folge', () => {
  const f = KZ_FIELDS.map(x => (x === 'lower_limit_ft_msl' ? 'lower_limit_msl_ft' : x));
  const [p, ...rest] = checkFields('kontrollzonen', f, WFS_REQUIREMENTS.kontrollzonen);
  assert.equal(rest.length, 0);
  const line = formatProblem(p);
  assert.match(line, /kontrollzonen/); assert.match(line, /lower_limit_ft_msl/); assert.match(line, /SkyCheck-Folge/);
});

test('zusätzliches Feld ist kein Fehler', () => {
  assert.deepEqual(checkFields('kontrollzonen', [...KZ_FIELDS, 'neues_feld'], WFS_REQUIREMENTS.kontrollzonen), []);
});

test('temporaere: neues Schema (…_ft_msl) statt altem ist kein Fehler; ganz ohne Höhenfeld schon', () => {
  const neu = TMP_FIELDS.filter(f => !f.startsWith('lower_limit_')).concat('lower_limit_ft_msl', 'lower_limit_m_agl');
  assert.deepEqual(checkFields('temporaere_betriebseinschraenkungen', neu, WFS_REQUIREMENTS.temporaere_betriebseinschraenkungen), []);
  const ohne = TMP_FIELDS.filter(f => !f.startsWith('lower_limit_'));
  assert.equal(checkFields('temporaere_betriebseinschraenkungen', ohne, WFS_REQUIREMENTS.temporaere_betriebseinschraenkungen).length, 1);
});

test('temporaere: name ODER generated_name_de genügt', () => {
  const f = TMP_FIELDS.concat('name');
  assert.deepEqual(checkFields('t', f.filter(x => x !== 'generated_name_de'), WFS_REQUIREMENTS.temporaere_betriebseinschraenkungen), []);
  assert.equal(checkFields('t', TMP_FIELDS.filter(x => x !== 'generated_name_de'), WFS_REQUIREMENTS.temporaere_betriebseinschraenkungen).length, 1);
});

// ---- kontrollzonen-Semantik ----
const kz = (n, ft, agl) => ({ properties: { type_code_detail: `U_CONTROL_ZONE_${n}`, lower_limit_ft_msl: ft, lower_limit_m_agl: agl, name: `Z${n}` } });
const goodKz = () => [kz(1, 150, 0), kz(2, 300, 25), kz(2, 1200, 25), kz(3, 400, 45), kz(4, 500, 100), kz(4, 50.5, 100)];

test('kontrollzonen: gültige Daten (nicht jeder Flughafen hat alle Zonen) bestehen', () => {
  assert.deepEqual(checkKontrollzonen(goodKz()), []);
});

test('kontrollzonen: 0 ft in Zone 2 schlägt fehl', () => {
  const r = checkKontrollzonen([...goodKz(), kz(2, 0, 25)]);
  assert.equal(r.length, 1); assert.match(r[0].msg, /Zone 2/); assert.equal(r[0].field, 'lower_limit_ft_msl');
});

test('kontrollzonen: null/leerer String als MSL-Wert schlägt fehl', () => {
  assert.equal(checkKontrollzonen([...goodKz(), kz(3, null, 45)]).length, 1);
  assert.equal(checkKontrollzonen([...goodKz(), kz(3, '', 45)]).length, 1);
});

test('kontrollzonen: geänderter m_agl-Deckel schlägt fehl', () => {
  const r = checkKontrollzonen([...goodKz().filter(f => f.properties.type_code_detail !== 'U_CONTROL_ZONE_3'), kz(3, 400, 50)]);
  assert.equal(r.length, 1); assert.equal(r[0].field, 'lower_limit_m_agl'); assert.match(r[0].msg, /45/);
});

test('kontrollzonen: Zone fehlt komplett / Feld umbenannt (alle ohne Zonencode) schlägt fehl', () => {
  assert.match(checkKontrollzonen(goodKz().filter(f => f.properties.type_code_detail !== 'U_CONTROL_ZONE_4'))[0].msg, /ZONE_4/);
  assert.equal(checkKontrollzonen(goodKz().map(f => ({ properties: { zone: f.properties.type_code_detail } }))).length, 4);
  assert.equal(checkKontrollzonen([]).length, 4);
});

// ---- temporaere ----
const nfz = o => ({ properties: { type_code: 'U_NFZ', start_time: '2026-10-31T07:00:00Z', end_time: '2026-10-31T23:00:00Z', name: 'x', lower_limit_altitude: 0, lower_limit_unit: 'M', lower_limit_alt_ref: 'AGL', ...o } });

test('temporaere: leere Ebene besteht', () => assert.deepEqual(checkTemporaere([], helpers), { problems: [], warnings: [] }));
test('temporaere: echte Form besteht', () => assert.deepEqual(checkTemporaere([nfz(), nfz({ name: 'y' })], helpers), { problems: [], warnings: [] }));
test('temporaere: falscher type_code / vereinzelt unlesbare Zeit schlagen fehl', () => {
  assert.equal(checkTemporaere([nfz({ type_code: 'U_FOO' })], helpers).problems[0].field, 'type_code');
  assert.equal(checkTemporaere([nfz(), nfz({ start_time: '31.10.2026 07:00' })], helpers).problems[0].field, 'start_time');
  assert.deepEqual(checkTemporaere([nfz({ end_time: null })], helpers).problems, []);   // offenes Ende ist erlaubt
});
test('temporaere: Zeiten bei ALLEN Features fehlend/unlesbar = nur Warnung', () => {
  for (const o of [{ start_time: null, end_time: null }, { start_time: 'müll', end_time: 'müll' }]) {
    const r = checkTemporaere([nfz(o), nfz(o)], helpers);
    assert.deepEqual(r.problems, []); assert.equal(r.warnings.length, 1);
  }
});
test('temporaere: Höhengrenzen im neuen Schema lesbar', () => {
  const p = nfz({ lower_limit_altitude: undefined, lower_limit_ft_msl: 0, lower_limit_m_agl: 0 });
  assert.deepEqual(checkTemporaere([p], helpers).problems, []);
});

// ---- WMS ----
test('WMS: fehlender Layer schlägt fehl, Präfix und Gruppennamen stören nicht', () => {
  const caps = `<WMS_Capabilities><Layer><Name>dipul:kontrollzonen</Name><Layer><Name>polizei</Name></Layer></Layer></WMS_Capabilities>`;
  const names = parseWmsLayerNames(caps);
  assert.deepEqual(checkWmsLayers(names, ['kontrollzonen', 'polizei']), []);
  const r = checkWmsLayers(names, ['kontrollzonen', 'flughaefen']);
  assert.equal(r.length, 1); assert.equal(r[0].field, 'flughaefen');
});

// ---- Inaktiv-GFI ----
const gfi = (cols, rows) => `<html><body><table class="featureInfo"><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
const INACT_COLS = ['fid', 'name', 'lower_limit_value', 'start_time', 'end_time', 'recurrence_rule'];
test('Inaktiv-GFI: keine Zeilen = kein Fehler; Zeilen mit allen Spalten bestehen; fehlende Spalte schlägt fehl', () => {
  assert.deepEqual(checkInactiveGfi(parseGfiTable(''), helpers).problems, []);
  const row = ['inaktive_x.1', 'n', '0.0', 'Mar 19, 2026, 11:00:00 PM', 'Mar 27, 2026, 10:59:00 PM', ''];
  assert.deepEqual(checkInactiveGfi(parseGfiTable(gfi(INACT_COLS, [row])), helpers).problems, []);
  const cols2 = INACT_COLS.filter(c => c !== 'recurrence_rule');
  const r = checkInactiveGfi(parseGfiTable(gfi(cols2, [row.slice(0, 5)])), helpers).problems;
  assert.equal(r.length, 1); assert.equal(r[0].field, 'recurrence_rule');
  assert.ok(INACTIVE_COLUMNS.length >= 6);
});

// ---- Ausfall vs. Schema ----
test('Ausfall: 5xx/429 und HTML-Wartungsseite mit 200 sind ServiceUnavailable, 401/403/404 ServiceBlocked', () => {
  for (const s of [500, 502, 503, 429]) assert.throws(() => interpretResponse('xsd', s, 'x'), ServiceUnavailable);
  for (const s of [401, 403, 404]) assert.throws(() => interpretResponse('xsd', s, '<html>Forbidden</html>'), ServiceBlocked);
  assert.throws(() => interpretResponse('xsd', 200, '<html><body>Wartungsarbeiten</body></html>'), ServiceUnavailable);
  assert.throws(() => interpretResponse('json', 200, '<html>Wartung</html>'), ServiceUnavailable);
  assert.throws(() => interpretResponse('wms-caps', 200, '<html>503</html>'), ServiceUnavailable);
  assert.throws(() => interpretResponse('gfi-html', 200, '<html><body>Wartung</body></html>'), ServiceUnavailable);
  assert.throws(() => parseJsonFeatures('{"type":"FeatureCollection"'), ServiceUnavailable);
  assert.throws(() => parseJsonFeatures('{"foo":1}'), ServiceUnavailable);
  assert.throws(() => parseXsdFields('<xsd:schema/>'), ServiceUnavailable);
});

const EX = (msg, code = 'InvalidParameterValue') => `<ows:ExceptionReport><ows:Exception exceptionCode="${code}"><ows:ExceptionText>${msg}</ows:ExceptionText></ows:Exception></ows:ExceptionReport>`;
test('nur spezifische „Feature type dipul:<layer> unknown“-Meldung ist missingLayer', () => {
  assert.equal(interpretResponse('xsd', 400, EX('Feature type dipul:kontrollzonen unknown'), 'kontrollzonen').missingLayer, true);
  assert.equal(interpretResponse('xsd', 200, EX('Feature type dipul:kontrollzonen unknown'), 'kontrollzonen').missingLayer, true);
  // allgemeine Store-Fehlermeldung mit „typeName“ -> Dienstproblem, kein Schemaalarm
  assert.throws(() => interpretResponse('xsd', 400, EX('Error while reading typeName from store'), 'kontrollzonen'), ServiceUnavailable);
  assert.throws(() => interpretResponse('xsd', 500, EX('Feature type dipul:kontrollzonen unknown'), 'x'), ServiceUnavailable);
  // andere Ebene unbekannt -> nicht unsere Ebene
  assert.throws(() => interpretResponse('xsd', 400, EX('Feature type dipul:andere unknown'), 'kontrollzonen'), ServiceUnavailable);
});

test('gültige Antworten werden durchgereicht', () => {
  assert.ok(interpretResponse('xsd', 200, xsd(KZ_FIELDS)).text);
  assert.ok(interpretResponse('json', 200, '{"features":[]}').text);
  assert.ok(interpretResponse('gfi-html', 200, '<html><title>Geoserver GetFeatureInfo output</title></html>').text);
});

test('fetchWithRetry: 503 dann 200 klappt; dauerhaft 503 / Netzfehler -> ServiceUnavailable', async () => {
  let n = 0;
  const flaky = async () => ({ status: n++ < 1 ? 503 : 200, text: async () => 'ok' });
  assert.equal((await fetchWithRetry('u', { fetchImpl: flaky, sleep: async () => {} })).text, 'ok');
  await assert.rejects(fetchWithRetry('u', { fetchImpl: async () => ({ status: 503, text: async () => '' }), sleep: async () => {} }), ServiceUnavailable);
  await assert.rejects(fetchWithRetry('u', { fetchImpl: async () => { throw new Error('ECONNRESET'); }, sleep: async () => {} }), ServiceUnavailable);
  assert.equal((await fetchWithRetry('u', { fetchImpl: async () => ({ status: 400, text: async () => 'e' }), sleep: async () => {} })).status, 400);
});

test('Import führt kein Netzwerk aus (Modul lädt ohne main)', async () => {
  const m = await import('../scripts/check-dipul-schema.mjs');
  assert.equal(typeof m.checkKontrollzonen, 'function');
});

// ---- Neue Prüfungen ----
const GFI_COLS = ['fid', 'lower_limit_m_agl', 'legal_ref', 'lower_limit_ft_msl', 'type_code_detail', 'name'];
test('GFI kontrollzonen: gültige Zeile besteht; 0 Zeilen, fehlende Tabelle, Zellen-Mismatch, fehlende Spalten schlagen fehl', () => {
  const row = ['kontrollzonen.34', '0.0', 'NfL', '1487.0', 'U_CONTROL_ZONE_1', 'EDDM'];
  assert.deepEqual(checkGfiKontrollzonen(parseGfiTable(gfi(GFI_COLS, [row]))), []);
  assert.equal(checkGfiKontrollzonen(parseGfiTable('<html>GetFeatureInfo output</html>'))[0].field, 'table.featureInfo');
  assert.ok(checkGfiKontrollzonen(parseGfiTable(gfi(GFI_COLS, []))).some(p => p.field === 'Zeilen'));
  assert.ok(checkGfiKontrollzonen(parseGfiTable(gfi(GFI_COLS, [row.slice(0, 4)]))).some(p => p.field === 'Spalten/Zellen'));
  const noCol = GFI_COLS.filter(c => c !== 'lower_limit_ft_msl');
  assert.ok(checkGfiKontrollzonen(parseGfiTable(gfi(noCol, [row.filter((_, i) => i !== 3)]))).some(p => p.field === 'lower_limit_ft_msl'));
});
test('GFI-Spaltennamen werden klein gelesen (wie parseFeatureInfo)', () => {
  const t = parseGfiTable(gfi(['Type_Code_Detail'], [['U_CONTROL_ZONE_2']]));
  assert.equal(t.rows[0].type_code_detail, 'U_CONTROL_ZONE_2');
});
test('BBOX-Probe: Treffer in lon,lat bestehen; 0 Treffer und vertauschte Reihenfolge schlagen fehl', () => {
  const f = c => ({ geometry: { type: 'MultiPolygon', coordinates: [[[c, [c[0] + 0.1, c[1]], [c[0], c[1] + 0.1], c]]] } });
  assert.deepEqual(checkBboxProbe([f([11.78, 48.35])]), []);
  assert.equal(checkBboxProbe([]).length, 1);
  assert.equal(checkBboxProbe([f([48.35, 11.78])]).length, 1);
});

// ---- run() mit gestubbtem fetch ----
const LAYERS = helpers.layers;
const mkFeat = (z, ft, agl, ring) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: { type_code_detail: `U_CONTROL_ZONE_${z}`, lower_limit_ft_msl: ft, lower_limit_m_agl: agl, type_code: 'KONTROLLZONE', name: `n${z}` } });
const RING = [[11.7, 48.3], [11.8, 48.3], [11.8, 48.4], [11.7, 48.3]];
const KZ_JSON = JSON.stringify({ features: [mkFeat(1, 1487, 0, RING), mkFeat(2, 1500, 25, RING), mkFeat(2, 900, 25, RING), mkFeat(3, 1600, 45, RING), mkFeat(4, 1700, 100, RING)] });
const NFZ_JSON = (props = {}) => JSON.stringify({ features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [RING] }, properties: { type_code: 'U_NFZ', name: 'x', start_time: '2026-10-31T07:00:00Z', end_time: '2026-10-31T23:00:00Z', lower_limit_altitude: 0, lower_limit_unit: 'M', lower_limit_alt_ref: 'AGL', ...props } }] });
const CAPS = `<WMS_Capabilities>${[...LAYERS, 'schienenverkehr_zone', 'brandneue_ebene'].map(l => `<Layer><Name>${l}</Name></Layer>`).join('')}</WMS_Capabilities>`;
const GFI_OK = gfi(GFI_COLS, [['kontrollzonen.34', '0.0', 'NfL', '1487.0', 'U_CONTROL_ZONE_1', 'EDDM']]);
const INACT_OK = gfi(INACT_COLS, [['inaktive_x.1', 'n', '0.0', 'Mar 19, 2026, 11:00:00 PM', 'Mar 27, 2026, 10:59:00 PM', '']]);
const R = (status, body) => ({ status, text: async () => body });
function route(over = {}) {
  const base = {
    'DescribeFeatureType&typeNames=dipul:kontrollzonen': () => R(200, xsd(KZ_FIELDS)),
    'DescribeFeatureType&typeNames=dipul:flugbeschraenkungsgebiete': () => R(200, xsd(['type_code_detail', 'lower_limit_ft_msl', 'upper_limit_ft_msl', 'upper_limit_fl_pa', 'type_code'])),
    'DescribeFeatureType&typeNames=dipul:temporaere': () => R(200, xsd(TMP_FIELDS)),
    'count=300&bbox=': () => R(200, KZ_JSON),
    'typeNames=dipul:kontrollzonen&outputFormat=application/json&count=2000': () => R(200, KZ_JSON),
    'typeNames=dipul:temporaere_betriebseinschraenkungen&outputFormat=application/json&count=2000': () => R(200, NFZ_JSON()),
    'GetCapabilities': () => R(200, CAPS),
    'LAYERS=dipul:kontrollzonen&QUERY': () => R(200, GFI_OK),
    'LAYERS=dipul:inaktive': () => R(200, INACT_OK),
  };
  const table = { ...base, ...over };
  return async url => {
    // spezifischster Schlüssel zuerst
    const keys = Object.keys(table).sort((a, b) => b.length - a.length);
    const k = keys.find(k => url.includes(k));
    const v = table[k];
    return typeof v === 'function' ? v(url) : v;
  };
}
async function runWith(over, opts = {}) {
  const lines = [];
  const code = await run({ html, fetchImpl: route(over), out: l => lines.push(l), sleep: async () => {}, ...opts });
  return { code, lines, text: lines.join('\n') };
}

test('run: alles in Ordnung (Layer extra, leerer NFZ-Layer, Flughafen ohne Zone 4) -> 0 und „unverändert“', async () => {
  const r = await runWith({ 'typeNames=dipul:temporaere_betriebseinschraenkungen&outputFormat=application/json&count=2000': () => R(200, '{"features":[]}') });
  assert.equal(r.code, 0); assert.match(r.text, /unverändert/);
});

test('run: alle Anfragen scheitern -> Exit 1 mit Blockiert/Verschoben-Meldung, kein Schema-Alarm', async () => {
  const r = await runWith({}, { fetchImpl: async () => { throw new Error('ECONNREFUSED'); } });
  assert.equal(r.code, 1);
  assert.match(r.text, /Dienst nicht erreichbar, blockiert oder verschoben/);
  assert.doesNotMatch(r.text, /Schema geändert|unverändert/);
});

test('run: 403 an einem Endpunkt -> Exit 1 (blockiert), nicht grün', async () => {
  const r = await runWith({ 'GetCapabilities': () => R(403, '<html>Forbidden</html>') });
  assert.equal(r.code, 1); assert.match(r.text, /blockiert oder verschoben/); assert.doesNotMatch(r.text, /Schema geändert/);
});

test('run: Teilausfall (NFZ-Daten 503) -> Warnung, Exit 0, Schlusszeile benennt das Ungeprüfte, nicht „unverändert“', async () => {
  const r = await runWith({ 'typeNames=dipul:temporaere_betriebseinschraenkungen&outputFormat=application/json&count=2000': () => R(503, '') });
  assert.equal(r.code, 0);
  assert.match(r.text, /::warning::/); assert.match(r.text, /NICHT \(vollständig\) geprüft: .*temporaere_betriebseinschraenkungen/);
  assert.doesNotMatch(r.text, /unverändert/);
});

test('run: GFI kontrollzonen 0 Zeilen / ohne Tabelle -> Exit 1; Wartungs-HTML -> nicht ok, Teilausfall', async () => {
  const empty = '<html><title>Geoserver GetFeatureInfo output</title></html>';
  const r = await runWith({ 'LAYERS=dipul:kontrollzonen&QUERY': () => R(200, empty) });
  assert.equal(r.code, 1); assert.match(r.text, /table\.featureInfo/);
  const r2 = await runWith({ 'LAYERS=dipul:kontrollzonen&QUERY': () => R(200, gfi(GFI_COLS, [])) });
  assert.equal(r2.code, 1); assert.match(r2.text, /Zeilen/);
  const m = await runWith({ 'LAYERS=dipul:kontrollzonen&QUERY': () => R(200, '<html><body>Wartung</body></html>') });
  assert.equal(m.code, 0); assert.match(m.text, /nicht auswertbar/); assert.doesNotMatch(m.text, /unverändert|ok   WMS GetFeatureInfo kontrollzonen/);
});

test('run: Inaktiv-Ebene mit Wartungs-HTML wird nicht als ok gemeldet; ohne Zeilen = „nicht geprüft“, kein „unverändert“', async () => {
  const m = await runWith({ 'LAYERS=dipul:inaktive': () => R(200, '<html>Wartung</html>') });
  assert.doesNotMatch(m.text, /ok   WMS GetFeatureInfo Inaktiv/); assert.doesNotMatch(m.text, /unverändert/);
  const none = await runWith({ 'LAYERS=dipul:inaktive': () => R(200, '<html><title>Geoserver GetFeatureInfo output</title></html>') });
  assert.equal(none.code, 0); assert.doesNotMatch(none.text, /unverändert/); assert.match(none.text, /Inaktiv-Ebene/);
});

test('run: BBOX-Probe 0 Treffer oder vertauschte Koordinaten -> Exit 1', async () => {
  assert.equal((await runWith({ 'count=300&bbox=': () => R(200, '{"features":[]}') })).code, 1);
  const swapped = JSON.stringify({ features: [{ geometry: { type: 'Polygon', coordinates: [[[48.3, 11.7], [48.4, 11.8], [48.3, 11.7]]] }, properties: {} }] });
  const r = await runWith({ 'count=300&bbox=': () => R(200, swapped) });
  assert.equal(r.code, 1); assert.match(r.text, /lon,lat/);
});

test('run: GetFeature-Ausnahme „unknown“ wiederholt -> Fehler; einmalig -> 0; allgemeiner typeName-Fehler -> Dienstproblem', async () => {
  const ex = () => R(400, EX('Feature type dipul:kontrollzonen unknown'));
  const hard = await runWith({ 'typeNames=dipul:kontrollzonen&outputFormat=application/json&count=2000': ex });
  assert.equal(hard.code, 1); assert.match(hard.text, /unbekannt/); assert.doesNotMatch(hard.text, /unverändert/);
  let n = 0;
  const once = await runWith({ 'typeNames=dipul:kontrollzonen&outputFormat=application/json&count=2000': () => (n++ === 0 ? R(400, EX('Feature type dipul:kontrollzonen unknown')) : R(200, KZ_JSON)) });
  assert.equal(once.code, 0);
  const generic = await runWith({ 'typeNames=dipul:kontrollzonen&outputFormat=application/json&count=2000': () => R(400, EX('Error reading typeName')) });
  assert.doesNotMatch(generic.text, /Schema geändert/); assert.doesNotMatch(generic.text, /unverändert/);
});

test('run: NFZ-Zeiten bei allen unlesbar = Warnung, Exit 0; umbenanntes DescribeFeatureType-Feld = Exit 1', async () => {
  const w = await runWith({ 'typeNames=dipul:temporaere_betriebseinschraenkungen&outputFormat=application/json&count=2000': () => R(200, NFZ_JSON({ start_time: 'x', end_time: null })) });
  assert.equal(w.code, 0); assert.match(w.text, /::warning::.*start_time/); assert.doesNotMatch(w.text, /unverändert/);
  const f = await runWith({ 'DescribeFeatureType&typeNames=dipul:temporaere': () => R(200, xsd(TMP_FIELDS.map(x => (x === 'start_time' ? 'beginn' : x)))) });
  assert.equal(f.code, 1); assert.match(f.text, /start_time/);
});

test('run: Zeitbudget — hängende Verbindungen enden schnell, jedes Ergebnis wird sofort ausgegeben', async () => {
  const hang = (url, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(new Error('timeout'))));
  const t0 = Date.now(); const lines = [];
  const code = await run({ html, fetchImpl: hang, out: l => lines.push(l), sleep: async () => {}, timeoutMs: 30, retries: 2 });
  assert.equal(code, 1);
  assert.ok(Date.now() - t0 < 2000);
  assert.ok(lines.filter(l => l.startsWith('::warning::')).length >= 9);   // parallel, je Prüfung eine Zeile
});
