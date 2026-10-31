// Wächter für das DiPUL-Schema: reine Vergleichslogik, ohne Netzwerk (Fixtures).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ServiceUnavailable, WFS_REQUIREMENTS, INACTIVE_COLUMNS, loadSkycheckHelpers, parseXsdFields, parseWmsLayerNames,
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

test('temporaere: leere Ebene besteht', () => assert.deepEqual(checkTemporaere([], helpers), []));
test('temporaere: echte Form besteht', () => assert.deepEqual(checkTemporaere([nfz(), nfz({ name: 'y' })], helpers), []));
test('temporaere: falscher type_code / unlesbare Zeit / alles ohne Zeit schlagen fehl', () => {
  assert.equal(checkTemporaere([nfz({ type_code: 'U_FOO' })], helpers)[0].field, 'type_code');
  assert.equal(checkTemporaere([nfz({ start_time: '31.10.2026 07:00' })], helpers)[0].field, 'start_time');
  assert.equal(checkTemporaere([nfz({ start_time: null, end_time: null })], helpers)[0].field, 'start_time | end_time');
  assert.deepEqual(checkTemporaere([nfz({ end_time: null })], helpers), []);   // offenes Ende ist erlaubt
});
test('temporaere: Höhengrenzen im neuen Schema lesbar', () => {
  const p = nfz({ lower_limit_altitude: undefined, lower_limit_ft_msl: 0, lower_limit_m_agl: 0 });
  assert.deepEqual(checkTemporaere([p], helpers), []);
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
test('Ausfall: 5xx/429/403 und HTML-Wartungsseite mit 200 sind ServiceUnavailable, nicht Schema', () => {
  for (const s of [500, 502, 503, 429, 403]) assert.throws(() => interpretResponse('xsd', s, 'x'), ServiceUnavailable);
  assert.throws(() => interpretResponse('xsd', 200, '<html><body>Wartungsarbeiten</body></html>'), ServiceUnavailable);
  assert.throws(() => interpretResponse('json', 200, '<html>Wartung</html>'), ServiceUnavailable);
  assert.throws(() => interpretResponse('wms-caps', 200, '<html>503</html>'), ServiceUnavailable);
  assert.throws(() => parseJsonFeatures('{"type":"FeatureCollection"'), ServiceUnavailable);
  assert.throws(() => parseJsonFeatures('{"foo":1}'), ServiceUnavailable);
  assert.throws(() => parseXsdFields('<xsd:schema/>'), ServiceUnavailable);
});

test('sauber gemeldete unbekannte Ebene (OGC-Fehler 400) ist ein Schemaproblem', () => {
  const ex = '<ows:ExceptionReport><ows:Exception exceptionCode="InvalidParameterValue"><ows:ExceptionText>Feature type dipul:kontrollzonen unknown</ows:ExceptionText></ows:Exception></ows:ExceptionReport>';
  assert.equal(interpretResponse('xsd', 400, ex).missingLayer, true);
  assert.equal(interpretResponse('xsd', 200, ex).missingLayer, true);
});

test('gültige Antworten werden durchgereicht', () => {
  assert.ok(interpretResponse('xsd', 200, xsd(KZ_FIELDS)).text);
  assert.ok(interpretResponse('json', 200, '{"features":[]}').text);
  assert.ok(interpretResponse('gfi-html', 200, '').text === '');
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
