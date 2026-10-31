#!/usr/bin/env node
// SkyCheck — Wächter für das DiPUL-Schema (uas-betrieb.de). DiPUL hat Felder schon einmal
// ohne Ankündigung umbenannt (2026-10), unbemerkt. Dieses Skript prüft genau das, was
// skycheck.html tatsächlich liest, und schlägt laut fehl, sobald sich etwas ändert.
//
//   node scripts/check-dipul-schema.mjs
//
// Exit 0  = alles wie erwartet ODER Dienst nicht erreichbar (dann ::warning::, kein Fehlalarm).
// Exit 1  = Schema-/Semantikproblem, je Zeile: Ebene + Feld + was in SkyCheck kaputtgeht.
//
// Keine Abhängigkeiten. Beim Import wird nichts abgerufen (reine Funktionen exportiert,
// Tests: tests/check-dipul-schema.test.mjs). Die Konstanten kommen aus skycheck.html selbst
// (DIPUL_ALL_LAYERS, parseDipulTime, dipulLimits) — keine abweichende Kopie.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const WFS_URL = 'https://uas-betrieb.de/geoservices/dipul/wfs';
export const WMS_URL = 'https://uas-betrieb.de/geoservices/dipul/wms';
export const INACTIVE_LAYER = 'inaktive_temporaere_betriebseinschraenkungen';

// Dienst nicht erreichbar / liefert keine auswertbare Antwort (Timeout, 5xx, Wartungsseite mit 200 …).
// Das ist ausdrücklich KEIN Schemaalarm.
export class ServiceUnavailable extends Error {}
// Dienst antwortet, aber mit 401/403/404 (geblockt, verschoben, entfernt). Wird NICHT als Schemaänderung
// gemeldet, aber auch nicht grün: ein dauerhaft blockierter Wächter würde sonst ewig „alles ok“ zeigen.
export class ServiceBlocked extends Error {}

// ---------------------------------------------------------------------------------------------
// Anforderungen je Ebene, abgeleitet aus dem Code in skycheck.html.
// fields = Alternativen (mindestens eine muss existieren); breaks = was in SkyCheck kaputtgeht.
// ---------------------------------------------------------------------------------------------
export const WFS_REQUIREMENTS = {
  kontrollzonen: [
    { fields: ['type_code_detail'], breaks: 'CTR-Zonenerkennung U_CONTROL_ZONE_1…4 (Höhengitter, Zonenliste, Höhenberechnung)' },
    { fields: ['lower_limit_ft_msl'], breaks: 'MSL-Untergrenze der CTR-Zonen: computeCtrFlightInfo/Höhengitter bekommen keine Bezugshöhe' },
    { fields: ['lower_limit_m_agl'], breaks: 'AGL-Deckel der CTR-Zonen (dipulLimits)' },
    { fields: ['type_code'], breaks: 'Zonentyp KONTROLLZONE (isCtrZone/Ampel)' },
  ],
  flugbeschraenkungsgebiete: [
    { fields: ['type_code_detail'], breaks: 'Zonenart der Flugbeschränkungsgebiete (Ampel evalZoneStatus)' },
    { fields: ['lower_limit_ft_msl'], breaks: 'Untergrenze in der Zonenliste (dipulLimits)' },
    { fields: ['upper_limit_ft_msl', 'upper_limit_fl_pa'], breaks: 'Obergrenze in der Zonenliste (dipulLimits)' },
    { fields: ['type_code'], breaks: 'Zonentyp (Ampel)' },
  ],
  temporaere_betriebseinschraenkungen: [
    { fields: ['type_code'], breaks: 'U_NFZ-Erkennung: temporäre Flugverbote würden nicht mehr rot/No-Go' },
    { fields: ['start_time'], breaks: 'Gültigkeitsfenster der U_NFZ (aktiv/inaktiv, Höhengitter-Flugverbot)' },
    { fields: ['end_time'], breaks: 'Gültigkeitsfenster der U_NFZ (aktiv/inaktiv, Höhengitter-Flugverbot)' },
    { fields: ['name', 'generated_name_de'], breaks: 'Name der U_NFZ in Liste und Höhengitter-Hover' },
    // dipulLimits liest Neues Schema (…_ft_msl/_m_agl) ODER das alte (lower_limit_altitude) — beides ist kein Fehler.
    { fields: ['lower_limit_ft_msl', 'lower_limit_m_agl', 'lower_limit_altitude'], breaks: 'Höhengrenzen der U_NFZ (dipulLimits)' },
  ],
};

// Spalten der Inaktiv-Ebene (nur WMS/GFI), die parseFeatureInfo/dipulLimits lesen.
export const INACTIVE_COLUMNS = [
  { fields: ['fid'], breaks: 'Erkennung als U_NFZ per fid-Präfix (parseFeatureInfo)' },
  { fields: ['name'], breaks: 'Name der inaktiven U_NFZ' },
  { fields: ['start_time'], breaks: 'Start-Hinweis „beginnt erst …“ der inaktiven U_NFZ' },
  { fields: ['end_time'], breaks: 'Ende-Hinweis „endete …“ der inaktiven U_NFZ' },
  { fields: ['recurrence_rule'], breaks: 'Wiederholungsregel: wiederkehrende U_NFZ würden als „nie inaktiv“ nicht mehr erkannt' },
  { fields: ['lower_limit_value', 'lower_limit_altitude'], breaks: 'Untergrenze der inaktiven U_NFZ (dipulLimits)' },
];

// Konstanten, die in computeCtrFlightInfo fest einkodiert sind (NfL 2026-1-3960).
export const CTR_AGL_CAP = { 2: 25, 3: 45, 4: 100 };

// ---------------------------------------------------------------------------------------------
// Funktionen aus skycheck.html übernehmen (kein divergierender Zweitstand).
// ---------------------------------------------------------------------------------------------
export function grabFunction(html, name) {
  const m = html.match(new RegExp(`(async\\s+)?function ${name}\\(`));
  if (!m) throw new Error(`Funktion ${name} nicht in skycheck.html gefunden`);
  let depth = 0;
  for (let k = html.indexOf('{', html.indexOf(')', m.index)); k < html.length; k++) {
    if (html[k] === '{') depth++;
    else if (html[k] === '}' && --depth === 0) return html.slice(m.index, k + 1);
  }
  throw new Error(`Ende von ${name} nicht gefunden`);
}

export function loadSkycheckHelpers(html) {
  const lm = html.match(/const DIPUL_ALL_LAYERS = '([^']+)'/);
  if (!lm) throw new Error('DIPUL_ALL_LAYERS nicht in skycheck.html gefunden');
  const ft = html.match(/const FT_TO_M = ([0-9.]+);/);
  const src = `const FT_TO_M = ${ft ? ft[1] : '0.3048'};
    ${grabFunction(html, 'parseDipulTime')} ${grabFunction(html, 'altitudeToMetres')} ${grabFunction(html, 'dipulLimits')}
    return { parseDipulTime, dipulLimits };`;
  const fns = new Function(src)();
  return { ...fns, layers: lm[1].split(',').map(s => s.trim()).filter(Boolean) };
}

// ---------------------------------------------------------------------------------------------
// Antworten einordnen: auswertbar / Dienst-Problem / Ebene unbekannt (= Schemaproblem).
// ---------------------------------------------------------------------------------------------
// kind: 'xsd' | 'json' | 'wms-caps' | 'gfi-html'. Liefert {text}; wirft ServiceUnavailable (5xx, Wartungsseite …)
// oder ServiceBlocked (401/403/404); {missingLayer:true} nur, wenn der Dienst SPEZIFISCH sagt, dass genau
// diese Ebene (layer) unbekannt ist. Eine allgemeine Store-Fehlermeldung, die nur „typeName“ nennt, zählt nicht.
export function interpretResponse(kind, status, text, layer = '') {
  text = String(text ?? '');
  const head = text.slice(0, 4000);
  const ogcException = /ExceptionReport|ServiceExceptionReport/i.test(head);
  const specific = Boolean(layer) && head.toLowerCase().includes(layer.toLowerCase())
    && /unknown|not found|does not exist|could not find|not defined|LayerNotDefined/i.test(head);
  if (ogcException && specific && (status === 200 || status === 400 || status === 404)) return { missingLayer: true, detail: head.replace(/\s+/g, ' ').slice(0, 200) };
  if (status === 401 || status === 403 || status === 404) throw new ServiceBlocked(`HTTP ${status}`);
  if (status >= 500 || status === 408 || status === 429) throw new ServiceUnavailable(`HTTP ${status}`);
  if (status >= 400) throw new ServiceUnavailable(`HTTP ${status} ohne verwertbare OGC-Fehlermeldung`);
  if (ogcException) throw new ServiceUnavailable('OGC-Ausnahme ohne spezifischen Bezug zur abgefragten Ebene');
  const ok = {
    xsd: /<(xsd|xs):schema\b/i,
    json: /^\s*\{/,
    'wms-caps': /<(WMS_Capabilities|WMT_MS_Capabilities)\b/,
    'gfi-html': /GetFeatureInfo output|class="featureInfo"/i,   // GeoServer-Seite, auch ohne Treffer (Wartungs-HTML besteht nicht)
  }[kind];
  if (!ok.test(kind === 'json' || kind === 'gfi-html' ? text : head)) {
    throw new ServiceUnavailable(`HTTP ${status}, aber unerwartetes Antwortformat für ${kind} (Wartungsseite?)`);
  }
  return { text };
}

export function parseJsonFeatures(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new ServiceUnavailable('JSON nicht lesbar (Wartungsseite/abgeschnitten?)'); }
  if (!data || !Array.isArray(data.features)) throw new ServiceUnavailable('GeoJSON ohne features-Array');
  return data.features;
}

// ---------------------------------------------------------------------------------------------
// DescribeFeatureType / Capabilities / GFI parsen
// ---------------------------------------------------------------------------------------------
export function parseXsdFields(xml) {
  const names = [];
  for (const m of String(xml).matchAll(/<(?:xsd|xs):element\b([^>]*)>/gi)) {
    const attrs = m[1];
    if (/substitutionGroup=/.test(attrs)) continue;           // Top-Level-Element (Ebene selbst)
    const n = /\bname="([^"]+)"/.exec(attrs);
    if (n) names.push(n[1]);
  }
  if (!names.length) throw new ServiceUnavailable('DescribeFeatureType ohne Felder (unerwartetes Schema-Dokument)');
  return names;
}

export function parseWmsLayerNames(xml) {
  const names = new Set();
  for (const m of String(xml).matchAll(/<Name>\s*([^<\s]+)\s*<\/Name>/g)) names.add(m[1].replace(/^[^:]+:/, ''));
  if (!names.size) throw new ServiceUnavailable('GetCapabilities ohne Layer');
  return names;
}

// Gleiche Auswahl wie parseFeatureInfo: table.featureInfo, th (klein geschrieben) als Spalten, nur Zeilen
// mit gleich vielen td wie th zählen; abweichende Zeilen werden gezählt (mismatched), nicht gelesen.
export function parseGfiTable(html) {
  const rows = [];
  let columns = [], mismatched = 0;
  const tables = [...String(html).matchAll(/<table[^>]*class="featureInfo"[^>]*>([\s\S]*?)<\/table>/g)];
  for (const t of tables) {
    const trs = [...t[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(m => m[1]);
    if (!trs.length) continue;
    const heads = [...trs[0].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(m => m[1].trim().toLowerCase());
    columns = heads;
    for (const tr of trs.slice(1)) {
      const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1].trim());
      if (cells.length === heads.length) rows.push(Object.fromEntries(heads.map((h, i) => [h, cells[i]])));
      else mismatched++;
    }
  }
  return { columns, rows, mismatched, hasTable: tables.length > 0 };
}

// ---------------------------------------------------------------------------------------------
// Prüfungen (rein). Jedes Problem: { layer, field, msg }.
// ---------------------------------------------------------------------------------------------
const problem = (layer, field, msg) => ({ layer, field, msg });
export const formatProblem = p => `${p.layer} · ${p.field}: ${p.msg}`;

export function checkFields(layer, fields, requirements) {
  const have = new Set(fields);
  return requirements.filter(r => !r.fields.some(f => have.has(f))).map(r => problem(layer, r.fields.join(' | '),
    `Feld fehlt (vorhanden: ${[...have].slice(0, 30).join(', ')}). SkyCheck-Folge: ${r.breaks}.`));
}

const num = v => (v == null || String(v).trim() === '' ? null : (Number.isFinite(Number(v)) ? Number(v) : null));

// Echte kontrollzonen-Daten: Zonen 1–4 kommen vor, MSL-Untergrenze > 0, AGL-Deckel 25/45/100.
// Nicht jeder Flugplatz hat alle vier Subzonen — geprüft wird je Zonenart über den GANZEN Datensatz.
export function checkKontrollzonen(features) {
  const L = 'kontrollzonen', out = [];
  const byZone = { 1: [], 2: [], 3: [], 4: [] };
  for (const f of features || []) {
    const m = /^U_CONTROL_ZONE_([1-4])$/i.exec(String(f?.properties?.type_code_detail ?? ''));
    if (m) byZone[m[1]].push(f.properties);
  }
  for (const n of [1, 2, 3, 4]) {
    const zs = byZone[n];
    if (!zs.length) {
      out.push(problem(L, 'type_code_detail', `Keine einzige Zone U_CONTROL_ZONE_${n} im Datensatz (${(features || []).length} Features). SkyCheck-Folge: Zone ${n} wird nicht erkannt (Höhengitter, Höhenberechnung).`));
      continue;
    }
    const badMsl = zs.filter(p => !(num(p.lower_limit_ft_msl) > 0));
    if (badMsl.length) out.push(problem(L, 'lower_limit_ft_msl', `Zone ${n}: ${badMsl.length} von ${zs.length} ohne Wert > 0 (z. B. ${JSON.stringify(badMsl[0].lower_limit_ft_msl)}, ${badMsl[0].name ?? badMsl[0].external_reference ?? '?'}). SkyCheck-Folge: computeCtrFlightInfo hat keine MSL-Bezugshöhe, Höhen in CTR falsch/leer.`));
    if (n >= 2) {
      const bad = zs.filter(p => num(p.lower_limit_m_agl) !== CTR_AGL_CAP[n]);
      if (bad.length) out.push(problem(L, 'lower_limit_m_agl', `Zone ${n}: erwartet ${CTR_AGL_CAP[n]} m AGL (fest in computeCtrFlightInfo), gefunden ${[...new Set(bad.map(p => JSON.stringify(p.lower_limit_m_agl)))].join(', ')} bei ${bad.length} von ${zs.length}. SkyCheck-Folge: Höhenformel passt nicht mehr zu den DiPUL-Deckeln.`));
    }
  }
  return out;
}

// temporaere_betriebseinschraenkungen: leere Ebene ist gültig. Sonst U_NFZ, lesbare Zeiten, lesbare Limits.
// Sind die Zeiten bei ALLEN Features fehlend/unlesbar, ist das nur eine Warnung (die App behandelt das
// fail-safe: U_NFZ gelten dann als aktiv). Vereinzelt unlesbare Werte bleiben ein Fehler.
export function checkTemporaere(features, helpers) {
  const L = 'temporaere_betriebseinschraenkungen', problems = [], warnings = [];
  const fs = (features || []).map(f => f.properties || {});
  if (!fs.length) return { problems, warnings };
  const badType = fs.filter(p => !/^U_NFZ$/i.test(String(p.type_code ?? '')));
  if (badType.length) problems.push(problem(L, 'type_code', `${badType.length} von ${fs.length} Features nicht U_NFZ (z. B. ${JSON.stringify(badType[0].type_code)}). SkyCheck-Folge: Erkennung/Rotfärbung temporärer Flugverbote greift nicht.`));
  const readable = v => v != null && String(v).trim() !== '' && helpers.parseDipulTime(v) !== null;
  if (fs.every(p => !readable(p.start_time) && !readable(p.end_time))) {
    warnings.push(problem(L, 'start_time | end_time', `Bei allen ${fs.length} Features fehlend oder unlesbar (z. B. ${JSON.stringify(fs[0].start_time)}). SkyCheck-Folge: kein Gültigkeitsfenster, jede U_NFZ gilt als aktiv (fail-safe, aber abgelaufene bleiben rot).`));
  } else {
    for (const f of ['start_time', 'end_time']) {
      const bad = fs.filter(p => p[f] != null && String(p[f]).trim() !== '' && helpers.parseDipulTime(p[f]) === null);
      if (bad.length) problems.push(problem(L, f, `${bad.length} Werte nicht lesbar (z. B. ${JSON.stringify(bad[0][f])}). SkyCheck-Folge: Gültigkeitsfenster unlesbar, diese U_NFZ gelten immer als aktiv.`));
    }
  }
  const badLim = fs.filter(p => { try { return !Number.isFinite(helpers.dipulLimits(p).lowerRaw); } catch { return true; } });
  if (badLim.length) problems.push(problem(L, 'lower_limit_*', `${badLim.length} Features, deren Höhengrenzen dipulLimits nicht lesen kann. SkyCheck-Folge: Höhenangaben der U_NFZ fehlerhaft.`));
  return { problems, warnings };
}

// GetFeatureInfo am festen Punkt in EDDM Zone 1 (Pfad der Zonenliste, parseFeatureInfo).
export const GFI_KZ_COLUMNS = [
  { fields: ['type_code_detail'], breaks: 'Zonenart/Zonennummer in der Zonenliste (parseFeatureInfo)' },
  { fields: ['lower_limit_ft_msl'], breaks: 'MSL-Untergrenze der CTR-Zone in der Zonenliste/Höhenberechnung (dipulLimits)' },
  { fields: ['lower_limit_m_agl'], breaks: 'AGL-Deckel der CTR-Zone in der Zonenliste (dipulLimits)' },
];
export function checkGfiKontrollzonen({ columns, rows, mismatched, hasTable }) {
  const L = 'kontrollzonen (GetFeatureInfo)';
  if (!hasTable) return [problem(L, 'table.featureInfo', 'Keine Ergebnistabelle am Testpunkt EDDM Zone 1. SkyCheck-Folge: parseFeatureInfo findet keine Zonen, die Zonenliste bleibt leer (Ampel grün!).')];
  const out = [];
  if (mismatched) out.push(problem(L, 'Spalten/Zellen', `${mismatched} Zeile(n) mit anderer Zellzahl als Kopfspalten. SkyCheck-Folge: parseFeatureInfo überspringt diese Zeilen, Zonen fehlen.`));
  if (!rows.length) out.push(problem(L, 'Zeilen', 'Keine lesbare Zeile am Testpunkt EDDM Zone 1. SkyCheck-Folge: Zonenliste leer.'));
  else if (!rows.some(r => /^U_CONTROL_ZONE_[1-4]$/i.test(r.type_code_detail ?? ''))) out.push(problem(L, 'type_code_detail', `Keine U_CONTROL_ZONE_n-Zeile (gefunden: ${rows.map(r => r.type_code_detail).join(', ')}). SkyCheck-Folge: CTR-Zone wird in der Zonenliste nicht erkannt.`));
  out.push(...checkFields(L, columns, GFI_KZ_COLUMNS));
  return out;
}

// WFS-BBOX in lat,lon-Reihenfolge um EDDM: ≥ 1 Feature, Koordinaten lon,lat innerhalb Deutschlands.
const firstCoord = g => { let c = g?.coordinates; while (Array.isArray(c) && Array.isArray(c[0])) c = c[0]; return Array.isArray(c) ? c : null; };
export function checkBboxProbe(features) {
  const L = 'kontrollzonen (WFS-BBOX)';
  if (!features.length) return [problem(L, 'bbox', 'Kein Treffer für die lat,lon-BBOX um EDDM. SkyCheck-Folge: fetchCtrSubzones findet keine Sub-Zonen, Höhengitter leer (Achsenfolge/CRS geändert?).')];
  const bad = features.filter(f => { const c = firstCoord(f.geometry); return !c || !(c[0] >= 5 && c[0] <= 16 && c[1] >= 47 && c[1] <= 56); });
  return bad.length ? [problem(L, 'geometry', `${bad.length} von ${features.length} Features mit Koordinaten nicht in lon,lat innerhalb Deutschlands (erste: ${JSON.stringify(firstCoord(bad[0].geometry))}). SkyCheck-Folge: Achsenreihenfolge geändert, Punkt-in-Polygon im Höhengitter trifft nichts.`)] : [];
}

export function checkWmsLayers(names, expected) {
  const have = names instanceof Set ? names : new Set(names);
  return expected.filter(l => !have.has(l)).map(l => problem('WMS', l,
    `Ebene fehlt in GetCapabilities. SkyCheck-Folge: Layer steht in DIPUL_ALL_LAYERS, die Karte/GetFeatureInfo schlägt mit ServiceException fehl.`));
}

// Inaktiv-Ebene: nur prüfbar, wenn eine Zeile geliefert wurde (Daten ändern sich) — keine Zeile ist KEIN Fehler.
export function checkInactiveGfi({ columns, rows }, helpers) {
  const L = INACTIVE_LAYER;
  if (!rows.length) return { problems: [], skipped: true, note: 'keine Zeile geliefert — Spalten nicht prüfbar (kein Fehler)' };
  const problems = checkFields(L, columns, INACTIVE_COLUMNS);
  const badTime = ['start_time', 'end_time'].filter(f => rows.some(r => r[f] && helpers.parseDipulTime(r[f]) === null));
  badTime.forEach(f => problems.push(problem(L, f, `Zeitformat nicht lesbar (z. B. ${JSON.stringify(rows.find(r => r[f] && helpers.parseDipulTime(r[f]) === null)[f])}). SkyCheck-Folge: Start-/Ende-Hinweis der inaktiven U_NFZ fehlt.`)));
  return { problems, note: `${rows.length} Zeilen, Spalten: ${columns.join(', ')}` };
}

// ---------------------------------------------------------------------------------------------
// Netzwerk
// Zeitbudget (Workflow-Schritt: 8 min): alle Prüfungen laufen PARALLEL. Je Anfrage höchstens 2 Versuche
// à 25 s + 3 s Pause = 53 s; eine „Ebene unbekannt“-Antwort wird einmal wiederholt (2. Runde) -> je Prüfung
// im schlimmsten Fall 2 × 53 s = 106 s. Gesamt (parallel) also ~106 s, weit unter 8 min — auch wenn jede
// Verbindung im Nichts hängt. Jedes Ergebnis wird sofort ausgegeben, ein abgebrochener Lauf hat ein Log.
// ---------------------------------------------------------------------------------------------
export async function fetchWithRetry(url, { fetchImpl = fetch, retries = 2, timeoutMs = 25000, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  let last;
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), headers: { 'User-Agent': 'SkyCheck-Schema-Monitor/1.0 (+https://github.com/mradeck/skycheck-project)' } });
      const text = await r.text();
      if (r.status >= 500 || r.status === 429 || r.status === 408) { last = new ServiceUnavailable(`HTTP ${r.status}`); }
      else return { status: r.status, text };
    } catch (e) { last = e instanceof ServiceUnavailable ? e : new ServiceUnavailable(`${e.name}: ${e.message}`); }
    if (i < retries - 1) await sleep(3000);
  }
  throw last;
}

const wfsUrl = (type, extra) => `${WFS_URL}?service=WFS&version=2.0.0&request=${extra}&typeNames=dipul:${type}`;
// Testpunkte in EDDM (Flughafen München): GFI-BBOX liegt in Zone 1; die WFS-BBOX hat dasselbe Format wie
// fetchCtrSubzones (lat,lon: minLat,minLon,maxLat,maxLon, ±0,45° / ±0,6° um den Flughafen).
const GFI_KZ_URL = `${WMS_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=dipul:kontrollzonen&QUERY_LAYERS=dipul:kontrollzonen&CRS=EPSG:4326&BBOX=48.34,11.75,48.36,11.77&WIDTH=101&HEIGHT=101&I=50&J=50&INFO_FORMAT=text/html&FEATURE_COUNT=50`;
const EDDM_BBOX = `${(48.3538 - 0.45).toFixed(4)},${(11.7861 - 0.6).toFixed(4)},${(48.3538 + 0.45).toFixed(4)},${(11.7861 + 0.6).toFixed(4)}`;

// Führt alle Prüfungen aus und liefert den Exit-Code (0/1). out = Ausgabefunktion (je Zeile sofort).
export async function run({ html, fetchImpl = fetch, out = console.log, sleep, retries, timeoutMs } = {}) {
  const helpers = loadSkycheckHelpers(html);
  const problems = [], warnings = [], blocked = [], unavailable = [], notes = [], skipped = [];
  const netOpts = { fetchImpl, ...(sleep ? { sleep } : {}), ...(retries ? { retries } : {}), ...(timeoutMs ? { timeoutMs } : {}) };
  const log = line => out(line);
  const addProblems = list => list.forEach(p => { problems.push(p); log(`::error::DiPUL-Schema geändert — ${formatProblem(p)}`); });
  const addWarnings = list => list.forEach(p => { warnings.push(p); log(`::warning::${formatProblem(p)}`); });
  // Eine Anfrage; „Ebene unbekannt“ wird einmal wiederholt, bevor sie als Schemaproblem zählt.
  const get = async (kind, url, layer) => {
    const once = async () => { const { status, text } = await fetchWithRetry(url, netOpts); return interpretResponse(kind, status, text, layer); };
    const r = await once();
    if (!r.missingLayer) return r;
    await (sleep ? sleep(3000) : new Promise(res => setTimeout(res, 3000)));
    return once();
  };
  const probes = [];
  const probe = (name, fn) => probes.push((async () => {
    try { const note = await fn(); log(note === 'Ebene unbekannt' ? `FAIL ${name}: ${note}` : `ok   ${name}${note ? ': ' + note : ''}`); notes.push(name); }
    catch (e) {
      if (e instanceof ServiceBlocked) { blocked.push(`${name}: ${e.message}`); log(`::error::${name}: ${e.message} (blockiert/verschoben)`); }
      else if (e instanceof ServiceUnavailable) { unavailable.push(`${name}: ${e.message}`); log(`::warning::${name} nicht auswertbar — ${e.message}`); }
      else throw e;
    }
  })());
  const missing = (name, type, r) => { addProblems([problem(type, '(Ebene)', `${name}: Dienst meldet die Ebene wiederholt als unbekannt (${r.detail}). SkyCheck-Folge: ${(WFS_REQUIREMENTS[type] || INACTIVE_COLUMNS)[0].breaks}.`)]); return 'Ebene unbekannt'; };

  for (const type of Object.keys(WFS_REQUIREMENTS)) {
    probe(`WFS DescribeFeatureType ${type}`, async () => {
      const r = await get('xsd', wfsUrl(type, 'DescribeFeatureType'), type);
      if (r.missingLayer) return missing(`DescribeFeatureType ${type}`, type, r);
      const fields = parseXsdFields(r.text);
      addProblems(checkFields(type, fields, WFS_REQUIREMENTS[type]));
      return `${fields.length} Felder im Schema`;
    });
  }
  probe('WFS GetFeature kontrollzonen (Daten)', async () => {
    const r = await get('json', `${wfsUrl('kontrollzonen', 'GetFeature')}&outputFormat=application/json&count=2000`, 'kontrollzonen');
    if (r.missingLayer) return missing('GetFeature kontrollzonen', 'kontrollzonen', r);
    const feats = parseJsonFeatures(r.text);
    addProblems(checkKontrollzonen(feats));
    return `${feats.length} Features`;
  });
  probe('WFS GetFeature kontrollzonen (lat,lon-BBOX um EDDM)', async () => {
    const r = await get('json', `${wfsUrl('kontrollzonen', 'GetFeature')}&outputFormat=application/json&count=300&bbox=${EDDM_BBOX}`, 'kontrollzonen');
    if (r.missingLayer) return missing('GetFeature kontrollzonen (BBOX)', 'kontrollzonen', r);
    const feats = parseJsonFeatures(r.text);
    addProblems(checkBboxProbe(feats));
    return `${feats.length} Features`;
  });
  probe('WFS GetFeature temporaere_betriebseinschraenkungen (Daten)', async () => {
    const r = await get('json', `${wfsUrl('temporaere_betriebseinschraenkungen', 'GetFeature')}&outputFormat=application/json&count=2000`, 'temporaere_betriebseinschraenkungen');
    if (r.missingLayer) return missing('GetFeature temporaere_betriebseinschraenkungen', 'temporaere_betriebseinschraenkungen', r);
    const feats = parseJsonFeatures(r.text);
    const res = checkTemporaere(feats, helpers);
    addProblems(res.problems); addWarnings(res.warnings);
    return `${feats.length} Features${feats.length ? '' : ' (leer ist gültig)'}`;
  });
  probe('WMS GetCapabilities', async () => {
    const r = await get('wms-caps', `${WMS_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`, '');
    const names = parseWmsLayerNames(r.text);
    addProblems(checkWmsLayers(names, helpers.layers));
    return `${names.size} Namen, ${helpers.layers.length} erwartete Layer geprüft`;
  });
  probe('WMS GetFeatureInfo kontrollzonen (EDDM Zone 1)', async () => {
    const r = await get('gfi-html', GFI_KZ_URL, 'kontrollzonen');
    if (r.missingLayer) return missing('GetFeatureInfo kontrollzonen', 'kontrollzonen', r);
    const t = parseGfiTable(r.text);
    addProblems(checkGfiKontrollzonen(t));
    return `${t.rows.length} Zeile(n)`;
  });
  probe('WMS GetFeatureInfo Inaktiv-Ebene', async () => {
    // Deutschland-weite BBox + BUFFER, damit irgendeine (zeitlich begrenzte) inaktive Zone getroffen wird.
    const l = INACTIVE_LAYER;
    const url = `${WMS_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=dipul:${l}&QUERY_LAYERS=dipul:${l}&CRS=EPSG:4326&BBOX=47,5.5,55.5,15.5&WIDTH=1000&HEIGHT=850&I=500&J=425&INFO_FORMAT=text/html&FEATURE_COUNT=20&BUFFER=600`;
    const r = await get('gfi-html', url, l);
    if (r.missingLayer) return missing('GetFeatureInfo Inaktiv-Ebene', l, r);
    const res = checkInactiveGfi(parseGfiTable(r.text), helpers);
    addProblems(res.problems);
    if (res.skipped) skipped.push('Inaktiv-Ebene: keine Zeile geliefert, Spalten nicht geprüft');
    return res.note;
  });
  await Promise.all(probes);

  const total = probes.length;
  const notChecked = [...unavailable, ...blocked, ...skipped];
  if (blocked.length || unavailable.length === total) {
    log(`::error::Dienst nicht erreichbar, blockiert oder verschoben — keine Aussage über das Schema. ${blocked.length ? 'Blockiert: ' + blocked.join('; ') + '. ' : ''}${unavailable.length ? 'Nicht erreichbar: ' + unavailable.join('; ') + '.' : ''}`);
  }
  if (problems.length) {
    log(`\n${problems.length} Schemaproblem(e). skycheck.html anpassen (dipulLimits/computeCtrFlightInfo/fetchCtrSubzones/parseFeatureInfo).`);
  }
  if (problems.length || blocked.length || unavailable.length === total) return 1;
  if (notChecked.length || warnings.length) {
    log(`\nKeine Schemaprobleme in den geprüften Teilen. NICHT (vollständig) geprüft: ${notChecked.length ? notChecked.join('; ') : 'nichts'}.${warnings.length ? ` Warnungen: ${warnings.length}.` : ''}`);
    return 0;
  }
  log('\nDiPUL-Schema unverändert — alles wie von SkyCheck erwartet.');
  return 0;
}

async function main() {
  const html = readFileSync(fileURLToPath(new URL('../skycheck.html', import.meta.url)), 'utf8');
  const t0 = Date.now();
  const code = await run({ html });
  console.log(`Laufzeit: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  process.exit(code);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(e => { console.error(`::error::Monitor-Fehler: ${e.stack || e}`); process.exit(2); });
}
