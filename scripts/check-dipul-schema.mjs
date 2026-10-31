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
// kind: 'xsd' | 'json' | 'wms-caps' | 'gfi-html'. Liefert {text} oder wirft ServiceUnavailable;
// {missingLayer:true} wenn der Dienst sauber sagt, die Ebene/der Typ existiert nicht.
export function interpretResponse(kind, status, text) {
  text = String(text ?? '');
  const head = text.slice(0, 4000);
  const ogcException = /ExceptionReport|ServiceExceptionReport/i.test(head);
  const unknownLayer = /LayerNotDefined|InvalidParameterValue|could not find|unknown (feature )?type|not a valid (feature )?type|typeName/i.test(head);
  if (ogcException && unknownLayer && (status === 200 || status === 400 || status === 404)) return { missingLayer: true, detail: head.replace(/\s+/g, ' ').slice(0, 200) };
  if (status >= 500 || status === 408 || status === 429 || status === 403 || status === 401) throw new ServiceUnavailable(`HTTP ${status}`);
  if (status >= 400) throw new ServiceUnavailable(`HTTP ${status} ohne verwertbare OGC-Fehlermeldung`);
  if (ogcException) throw new ServiceUnavailable('OGC-Ausnahme ohne Bezug zu einer unbekannten Ebene');
  const ok = {
    xsd: /<(xsd|xs):schema\b/i,
    json: /^\s*\{/,
    'wms-caps': /<(WMS_Capabilities|WMT_MS_Capabilities)\b/,
    'gfi-html': /<html|<table|^\s*$/i,   // leer = keine Treffer
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

export function parseGfiTable(html) {
  const rows = [];
  let columns = [];
  const tables = [...String(html).matchAll(/<table[^>]*class="featureInfo"[^>]*>([\s\S]*?)<\/table>/g)];
  for (const t of tables) {
    const trs = [...t[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(m => m[1]);
    if (!trs.length) continue;
    const heads = [...trs[0].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(m => m[1].trim());
    columns = heads;
    for (const tr of trs.slice(1)) {
      const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1].trim());
      if (cells.length === heads.length) rows.push(Object.fromEntries(heads.map((h, i) => [h, cells[i]])));
    }
  }
  return { columns, rows };
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
export function checkTemporaere(features, helpers) {
  const L = 'temporaere_betriebseinschraenkungen', out = [];
  const fs = (features || []).map(f => f.properties || {});
  if (!fs.length) return out;
  const badType = fs.filter(p => !/^U_NFZ$/i.test(String(p.type_code ?? '')));
  if (badType.length) out.push(problem(L, 'type_code', `${badType.length} von ${fs.length} Features nicht U_NFZ (z. B. ${JSON.stringify(badType[0].type_code)}). SkyCheck-Folge: Erkennung/Rotfärbung temporärer Flugverbote greift nicht.`));
  for (const f of ['start_time', 'end_time']) {
    const bad = fs.filter(p => p[f] != null && String(p[f]).trim() !== '' && helpers.parseDipulTime(p[f]) === null);
    if (bad.length) out.push(problem(L, f, `${bad.length} Werte nicht lesbar (z. B. ${JSON.stringify(bad[0][f])}). SkyCheck-Folge: Gültigkeitsfenster unlesbar, U_NFZ gelten immer als aktiv.`));
  }
  if (fs.every(p => p.start_time == null && p.end_time == null)) {
    out.push(problem(L, 'start_time | end_time', 'Bei allen Features leer. SkyCheck-Folge: kein Gültigkeitsfenster, abgelaufene U_NFZ blieben dauerhaft aktiv.'));
  }
  const badLim = fs.filter(p => { try { return !Number.isFinite(helpers.dipulLimits(p).lowerRaw); } catch { return true; } });
  if (badLim.length) out.push(problem(L, 'lower_limit_*', `${badLim.length} Features, deren Höhengrenzen dipulLimits nicht lesen kann. SkyCheck-Folge: Höhenangaben der U_NFZ fehlerhaft.`));
  return out;
}

export function checkWmsLayers(names, expected) {
  const have = names instanceof Set ? names : new Set(names);
  return expected.filter(l => !have.has(l)).map(l => problem('WMS', l,
    `Ebene fehlt in GetCapabilities. SkyCheck-Folge: Layer steht in DIPUL_ALL_LAYERS, die Karte/GetFeatureInfo schlägt mit ServiceException fehl.`));
}

// Inaktiv-Ebene: nur prüfbar, wenn eine Zeile geliefert wurde (Daten ändern sich) — keine Zeile ist KEIN Fehler.
export function checkInactiveGfi({ columns, rows }, helpers) {
  const L = INACTIVE_LAYER;
  if (!rows.length) return { problems: [], note: 'keine Zeile geliefert — Spalten nicht prüfbar (kein Fehler)' };
  const problems = checkFields(L, columns, INACTIVE_COLUMNS);
  const badTime = ['start_time', 'end_time'].filter(f => rows.some(r => r[f] && helpers.parseDipulTime(r[f]) === null));
  badTime.forEach(f => problems.push(problem(L, f, `Zeitformat nicht lesbar (z. B. ${JSON.stringify(rows.find(r => r[f] && helpers.parseDipulTime(r[f]) === null)[f])}). SkyCheck-Folge: Start-/Ende-Hinweis der inaktiven U_NFZ fehlt.`)));
  return { problems, note: `${rows.length} Zeilen, Spalten: ${columns.join(', ')}` };
}

// ---------------------------------------------------------------------------------------------
// Netzwerk
// ---------------------------------------------------------------------------------------------
export async function fetchWithRetry(url, { fetchImpl = fetch, retries = 3, timeoutMs = 45000, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  let last;
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), headers: { 'User-Agent': 'SkyCheck-Schema-Monitor/1.0 (+https://github.com/mradeck/skycheck-project)' } });
      const text = await r.text();
      if (r.status >= 500 || r.status === 429 || r.status === 408) { last = new ServiceUnavailable(`HTTP ${r.status}`); }
      else return { status: r.status, text };
    } catch (e) { last = e instanceof ServiceUnavailable ? e : new ServiceUnavailable(`${e.name}: ${e.message}`); }
    if (i < retries - 1) await sleep(2000 * (i + 1));
  }
  throw last;
}

const wfsUrl = (type, extra) => `${WFS_URL}?service=WFS&version=2.0.0&request=${extra}&typeNames=dipul:${type}`;

async function main() {
  const html = readFileSync(fileURLToPath(new URL('../skycheck.html', import.meta.url)), 'utf8');
  const helpers = loadSkycheckHelpers(html);
  const problems = [], unavailable = [], notes = [];
  const step = async (label, fn) => {
    try { await fn(); }
    catch (e) { if (e instanceof ServiceUnavailable) unavailable.push(`${label}: ${e.message}`); else throw e; }
  };
  const get = async (kind, url) => {
    const { status, text } = await fetchWithRetry(url);
    return interpretResponse(kind, status, text);
  };

  for (const type of Object.keys(WFS_REQUIREMENTS)) {
    await step(`WFS DescribeFeatureType ${type}`, async () => {
      const r = await get('xsd', wfsUrl(type, 'DescribeFeatureType'));
      if (r.missingLayer) { problems.push(problem(type, '(Ebene)', `WFS kennt die Ebene nicht mehr (${r.detail}). SkyCheck-Folge: ${WFS_REQUIREMENTS[type][0].breaks}.`)); return; }
      const fields = parseXsdFields(r.text);
      problems.push(...checkFields(type, fields, WFS_REQUIREMENTS[type]));
      notes.push(`${type}: ${fields.length} Felder im Schema`);
    });
  }

  await step('WFS GetFeature kontrollzonen', async () => {
    const r = await get('json', `${wfsUrl('kontrollzonen', 'GetFeature')}&outputFormat=application/json&count=2000`);
    if (r.missingLayer) return;                              // schon oben gemeldet
    const feats = parseJsonFeatures(r.text);
    problems.push(...checkKontrollzonen(feats));
    notes.push(`kontrollzonen: ${feats.length} Features`);
  });

  await step('WFS GetFeature temporaere_betriebseinschraenkungen', async () => {
    const r = await get('json', `${wfsUrl('temporaere_betriebseinschraenkungen', 'GetFeature')}&outputFormat=application/json&count=2000`);
    if (r.missingLayer) return;
    const feats = parseJsonFeatures(r.text);
    problems.push(...checkTemporaere(feats, helpers));
    notes.push(`temporaere_betriebseinschraenkungen: ${feats.length} Features${feats.length ? '' : ' (leer ist gültig)'}`);
  });

  await step('WMS GetCapabilities', async () => {
    const r = await get('wms-caps', `${WMS_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`);
    const names = parseWmsLayerNames(r.text);
    problems.push(...checkWmsLayers(names, helpers.layers));
    notes.push(`WMS: ${names.size} Namen, ${helpers.layers.length} erwartete Layer geprüft`);
  });

  await step('WMS GetFeatureInfo Inaktiv-Ebene', async () => {
    // Deutschland-weite BBox + BUFFER, damit irgendeine (zeitlich begrenzte) inaktive Zone getroffen wird.
    const l = INACTIVE_LAYER;
    const url = `${WMS_URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=dipul:${l}&QUERY_LAYERS=dipul:${l}&CRS=EPSG:4326&BBOX=47,5.5,55.5,15.5&WIDTH=1000&HEIGHT=850&I=500&J=425&INFO_FORMAT=text/html&FEATURE_COUNT=20&BUFFER=600`;
    const r = await get('gfi-html', url);
    if (r.missingLayer) return;
    const res = checkInactiveGfi(parseGfiTable(r.text), helpers);
    problems.push(...res.problems);
    notes.push(`${l}: ${res.note}`);
  });

  notes.forEach(n => console.log(`ok   ${n}`));
  unavailable.forEach(u => console.log(`::warning::DiPUL nicht auswertbar — ${u}`));
  if (problems.length) {
    problems.forEach(p => console.log(`::error::DiPUL-Schema geändert — ${formatProblem(p)}`));
    console.log(`\n${problems.length} Problem(e). skycheck.html anpassen (dipulLimits/computeCtrFlightInfo/fetchCtrSubzones/parseFeatureInfo).`);
    process.exit(1);
  }
  console.log(unavailable.length ? `\nKeine Schemaprobleme gefunden, aber ${unavailable.length} Prüfung(en) wegen Dienstausfall übersprungen.` : '\nDiPUL-Schema unverändert — alles wie von SkyCheck erwartet.');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(e => { console.error(`::error::Monitor-Fehler: ${e.stack || e}`); process.exit(2); });
}
