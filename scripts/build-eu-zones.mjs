#!/usr/bin/env node
// SkyCheck — amtliche UAS-Geozonen (LU/NO/EE/SE/BE) → kanonisches ED-269-Array.
// Reine Transformation, kein Netzwerkzugriff. Aufruf:
//   node scripts/build-eu-zones.mjs <lu|no|ee|be> <eingabedatei> <ausgabe.json> [--min N]
//   node scripts/build-eu-zones.mjs se <eingabeverzeichnis> <ausgabe.json> [--min N]
// Schreibt <ausgabe.json> und daneben <ausgabe>.version (SHA-256 der Ausgabe).
// Bei jedem Fehler: Exit-Code 1, die Ausgabedatei bleibt unverändert.
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// Schutz gegen abgeschnittene Downloads (echte Größen 2026-10: LU 43, NO 1390, EE 241, SE ~390, BE 582).
const MIN_ZONES = { lu: 20, no: 500, ee: 100, se: 250, be: 300 };
// Reine Darstellungs-/Doppelfelder der EANS-Karte, die SkyCheck nicht braucht.
const EE_DROP = ['strokeColor', 'fillColor', 'hidden', 'metaData', 'lower', 'lowerMeters',
  'upper', 'upperMeters', 'airspacetype', 'airspaceclass'];

const r5 = n => Math.round(n * 1e5) / 1e5;

function cleanRing(ring) {
  const out = [];
  for (const p of ring || []) {
    if (!Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue;
    const q = [r5(p[0]), r5(p[1])];
    const last = out[out.length - 1];
    if (!last || last[0] !== q[0] || last[1] !== q[1]) out.push(q);
  }
  return out.length >= 4 ? out : null;   // geschlossener Ring braucht ≥ 4 Punkte
}

function cleanVolume(g) {
  const hp = g && g.horizontalProjection;
  if (!hp) return null;
  if (hp.type === 'Polygon') {
    const rings = (hp.coordinates || []).map(cleanRing);
    if (!rings[0]) return null;            // ohne Außenring keine Fläche
    return { ...g, horizontalProjection: { type: 'Polygon', coordinates: rings.filter(Boolean) } };
  }
  if (hp.type === 'Circle' && Array.isArray(hp.center)
      && Number.isFinite(hp.center[0]) && Number.isFinite(hp.center[1])) {
    return { ...g, horizontalProjection: { ...hp, center: [r5(hp.center[0]), r5(hp.center[1])] } };
  }
  return null;
}

function toZones(country, data) {
  if (country === 'ee') {
    return (data.features || [])
      .filter(f => f && f.properties && f.properties.hidden !== true)
      .map(f => {
        const p = { ...f.properties };
        p.geometry = Array.isArray(p.geometry) ? p.geometry : (p.geometry ? [p.geometry] : []);
        if (typeof p.reason === 'string') p.reason = [p.reason];
        for (const k of EE_DROP) delete p[k];
        return p;
      });
  }
  return Array.isArray(data) ? data : (data.features || data.UASZoneVersion || data.zones || []);
}

// ───────────────────────── Schweden (LFV / Transportstyrelsen, CC BY 4.0) ─────────────────────────
// Eingabe: Verzeichnis mit diesen Dateien (WFS-GeoJSON bzw. die ED-318-Datei).
export const SE_FILES = ['RSTA.json', 'DNGA.json', 'ATZ.json', 'TIZ.json', 'CTR.json',
  'HKP1K.json', 'RWY5K.json', 'uas_zones_ED318.json'];
const SE_AUTHORITY = [{ name: 'LFV / Transportstyrelsen (CC BY 4.0)', siteURL: 'https://dronechart.lfv.se/' }];
const SE_RULES = 'Conditions for drone flights apply — see dronechart.lfv.se and the rules of Transportstyrelsen.';
// Feste neutrale Sätze für Layer ohne eigenen Beschreibungstext (kein eigener Regeltext).
const SE_TEXT = {
  CTR: `Control zone. ${SE_RULES}`,
  ATZ: `Aerodrome traffic zone. ${SE_RULES}`,
  TIZ: `Traffic information zone. ${SE_RULES}`,
  RWY5K: `Airport zone, 5 km around an airport. ${SE_RULES}`,
  HKP1K: `Heliport zone, 1 km around a heliport. ${SE_RULES}`,
};
const SE_RESTRICTION = { RSTA: 'REQ_AUTHORISATION', RWY5K: 'REQ_AUTHORISATION',
  DNGA: 'CONDITIONAL', CTR: 'CONDITIONAL', ATZ: 'CONDITIONAL', TIZ: 'CONDITIONAL', HKP1K: 'CONDITIONAL' };

// Höhe aus den LFV-Textfeldern: 'GND' → 0 AGL; Zahl → Fuß AMSL; 'FL nnn' → nnn×100 Fuß, Bezug STD;
// 'UNL'/leer/unbekannt → kein Wert.
function parseSeAlt(v) {
  const t = String(v == null ? '' : v).trim();
  if (/^GND$/i.test(t)) return { value: 0, ref: 'AGL' };
  if (/^\d+(\.\d+)?$/.test(t)) return { value: Number(t), ref: 'AMSL' };
  const fl = /^FL\s*(\d+)$/i.exec(t);
  if (fl) return { value: Number(fl[1]) * 100, ref: 'STD' };
  return null;
}

// GeoJSON-Geometrie → Liste horizontaler Projektionen (MultiPolygon: je Teilpolygon eine).
function projectionsOf(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') return [{ type: 'Polygon', coordinates: geom.coordinates }];
  if (geom.type === 'MultiPolygon') {
    return (geom.coordinates || []).map(c => ({ type: 'Polygon', coordinates: c }));
  }
  return [];
}

function seVolumes(geom, limits) {
  return projectionsOf(geom).map(hp => ({ ...limits, horizontalProjection: hp }));
}

function seLfvLimits(p, withHeights) {
  if (!withHeights) return { uomDimensions: 'M' };
  const lo = parseSeAlt(p.LOWER), up = parseSeAlt(p.UPPER);
  const o = { uomDimensions: 'FT' };
  if (lo) { o.lowerLimit = lo.value; o.lowerVerticalReference = lo.ref; }
  if (up) { o.upperLimit = up.value; o.upperVerticalReference = up.ref; }
  return o;
}

function seZone(layer, key, name, message, geometry, restriction) {
  return { identifier: `SE-${layer}-${key}`, country: 'SWE', name, type: 'COMMON', restriction,
    typeCode: layer, message, zoneAuthority: SE_AUTHORITY, geometry };
}

const seFeatures = (text, file) => {
  const d = JSON.parse(String(text).replace(/^﻿/, ''));
  if (!d || !Array.isArray(d.features) || !d.features.length) throw new Error(`${file}: keine Features`);
  return d.features.filter(f => f && f.properties && f.geometry);
};

const enText = arr => {
  const a = Array.isArray(arr) ? arr.filter(x => x && typeof x.text === 'string' && x.text) : [];
  const en = a.find(x => String(x.lang || '').toLowerCase().startsWith('en'));
  return { a, best: (en || a[0] || {}).text || '' };
};

function seEd318(f) {
  const p = f.properties, g = f.geometry, L = g.layer || {};
  const uom = String(L.uom || '').toLowerCase() === 'ft' ? 'FT' : 'M';
  const limits = { uomDimensions: uom };
  if (Number.isFinite(L.lower)) { limits.lowerLimit = L.lower; limits.lowerVerticalReference = L.lowerReference; }
  if (Number.isFinite(L.upper)) { limits.upperLimit = L.upper; limits.upperVerticalReference = L.upperReference; }
  let geometry;
  if (g.type === 'Point' && g.extent && g.extent.subType === 'Circle' && Number.isFinite(g.extent.radius)) {
    geometry = [{ ...limits, horizontalProjection: { type: 'Circle', center: g.coordinates, radius: g.extent.radius } }];
  } else {
    geometry = seVolumes(g, limits);
  }
  const restriction = p.type === 'REQ_AUTHORIZATION' ? 'REQ_AUTHORISATION' : p.type;
  if (!['REQ_AUTHORISATION', 'CONDITIONAL', 'PROHIBITED'].includes(restriction)) {
    throw new Error(`ED-318 ${p.identifier}: unbekannte Einstufung ${p.type}`);
  }
  const name = enText(p.name).best || p.identifier;
  const msgs = enText(p.message);
  const z = seZone('ED318', p.identifier, name, msgs.best, geometry, restriction);
  if (Array.isArray(p.reason)) z.reason = p.reason;
  if (msgs.a.length > 1) {
    z.extendedProperties = { localizedMessages: msgs.a.map(m => ({ language: m.lang, message: m.text })) };
  }
  return z;
}

export function buildSeZones(files, opts = {}) {
  const out = [];
  const lfv = (layer, keyOf, nameOf, msgOf, { withHeights = true, keep = () => true } = {}) => {
    for (const f of seFeatures(files[layer], layer)) {
      const p = f.properties;
      if (!keep(p)) continue;
      out.push(seZone(layer, keyOf(p), nameOf(p), msgOf(p),
        seVolumes(f.geometry, seLfvLimits(p, withHeights)), SE_RESTRICTION[layer]));
    }
  };
  const loc = p => p.LOCATION || p.NAMEOFAREA;
  const idnr = p => p.IDNR;
  lfv('RSTA', idnr, loc, p => p.COMMENT_2 || '', { keep: p => p.LOWER === 'GND' });
  lfv('DNGA', idnr, loc, p => p.COMMENT_2 || '');
  lfv('CTR', idnr, loc, () => SE_TEXT.CTR, { keep: p => p.POSITIONINDICATOR !== 'ESGP' });
  lfv('ATZ', idnr, loc, () => SE_TEXT.ATZ, { keep: p => p.POSITIONINDICATOR !== 'ESGP' });
  lfv('TIZ', idnr, loc, () => SE_TEXT.TIZ);
  lfv('RWY5K', p => p.POSITIONIN, p => `Airport 5 km: ${p.NAMEOFAREA}`, () => SE_TEXT.RWY5K, { withHeights: false });
  lfv('HKP1K', p => p.POSITIONIN, p => `Heliport 1 km: ${p.LOCATION}`, () => SE_TEXT.HKP1K, { withHeights: false });
  for (const f of seFeatures(files.ED318, 'uas_zones_ED318')) out.push(seEd318(f));
  return finish('se', out, opts);
}

// Liest die acht Dateien; fehlt eine oder ist sie leer/unlesbar → Abbruch (kein Teil-Snapshot).
export function buildZonesFromDir(country, dir, opts = {}) {
  if (country !== 'se') throw new Error(`Verzeichnis-Eingabe nur für se, nicht ${country}`);
  const files = {};
  for (const name of SE_FILES) {
    let text;
    try { text = readFileSync(join(dir, name), 'utf8'); }
    catch (e) { throw new Error(`Datei fehlt oder unlesbar: ${name}`); }
    if (!text.trim()) throw new Error(`Datei leer: ${name}`);
    files[name.replace(/\.json$/, '').replace('uas_zones_ED318', 'ED318')] = text;
  }
  return buildSeZones(files, opts);
}

// ───────────────────────── Belgien (BCAA / skeyes Droneguide) ─────────────────────────
const BE_DROP_TYPES = new Set(['TIME_ZONE', 'NOTAM', 'TEMPORARY-NO-FLY-ZONE']);
const BE_AUTHORITY = [{ name: 'BCAA / skeyes (Droneguide)', siteURL: 'https://map.droneguide.be/' }];
const BE_LANGS = ['en', 'nl', 'fr'];

// Feld ist entweder ein JSON-String {"en":…,"nl":…} oder Klartext → { best, all: {lang: text} | null }
function beText(v) {
  if (v == null) return { best: '', all: null };
  const s = String(v);
  if (s.trim().startsWith('{')) {
    try {
      const o = JSON.parse(s);
      if (o && typeof o === 'object' && !Array.isArray(o)) {
        const vals = Object.entries(o).filter(([, t]) => typeof t === 'string' && t);
        const best = BE_LANGS.map(l => o[l]).find(t => typeof t === 'string' && t) || (vals[0] && vals[0][1]) || '';
        return { best, all: vals.length > 1 ? Object.fromEntries(vals) : null };
      }
    } catch { /* kein JSON → Klartext */ }
  }
  return { best: s, all: null };
}

function buildBeZones(data, opts) {
  const out = [];
  for (const f of data.features || []) {
    const p = f && f.properties;
    if (!p || !f.geometry || BE_DROP_TYPES.has(p.type_code)) continue;
    const lowRaw = Number.isFinite(p.lower_limit_altitude_meter_agl) ? p.lower_limit_altitude_meter_agl : 0;
    if (lowRaw > 120) continue;                       // wie die Standardansicht der amtlichen Karte
    const limits = { uomDimensions: 'M', lowerLimit: Math.round(lowRaw), lowerVerticalReference: 'AGL' };
    if (Number.isFinite(p.upper_limit_altitude_meter_agl)) {
      limits.upperLimit = Math.round(p.upper_limit_altitude_meter_agl);
      limits.upperVerticalReference = 'AGL';
    }
    const id = p.unique_identifier || p.code;
    const desc = beText(p.description);
    const z = { identifier: String(id), country: 'BEL', name: beText(p.name).best || String(p.code || id),
      type: 'COMMON', restriction: p.restriction, typeCode: p.type_code,
      message: desc.best, zoneAuthority: BE_AUTHORITY, geometry: seVolumes(f.geometry, limits) };
    if (desc.all) {
      z.extendedProperties = { localizedMessages: Object.entries(desc.all).map(([language, message]) => ({ language, message })) };
    }
    out.push(z);
  }
  return finish('be', out, opts);
}

function finish(country, zones, opts = {}) {
  zones = zones
    .map(z => ({ ...z, geometry: (Array.isArray(z.geometry) ? z.geometry : []).map(cleanVolume).filter(Boolean) }))
    .filter(z => z.geometry.length > 0);
  const min = Number.isFinite(opts.min) ? opts.min : MIN_ZONES[country];
  if (zones.length < min) throw new Error(`zu wenige Zonen für ${country}: ${zones.length} < ${min}`);
  return zones;
}

const isTemporary = z => (z.applicability || []).some(a => a && a.permanent === 'NO');

export function buildZones(country, rawText, opts = {}) {
  if (!(country in MIN_ZONES)) throw new Error(`unbekanntes Land: ${country}`);
  let text = String(rawText);
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  if (country === 'se') throw new Error('se braucht ein Verzeichnis: buildZonesFromDir');
  if (country === 'be') return buildBeZones(JSON.parse(text), opts);
  let zones = toZones(country, JSON.parse(text));
  if (country === 'no') zones = zones.filter(z => !isTemporary(z));
  return finish(country, zones, opts);
}

function main(argv) {
  const [country, inFile, outFile, ...rest] = argv;
  if (!country || !inFile || !outFile) {
    console.error('Aufruf: build-eu-zones.mjs <lu|no|ee|be|se> <eingabe> <ausgabe.json> [--min N]');
    process.exit(2);
  }
  const i = rest.indexOf('--min');
  const opts = i >= 0 ? { min: Number(rest[i + 1]) } : {};
  const zones = country === 'se' && statSync(inFile).isDirectory()
    ? buildZonesFromDir(country, inFile, opts)
    : buildZones(country, readFileSync(inFile, 'utf8'), opts);
  const body = JSON.stringify(zones);
  writeFileSync(outFile, body);
  writeFileSync(outFile.replace(/\.json$/, '') + '.version',
    createHash('sha256').update(body).digest('hex') + '\n');
  console.log(`${country}: ${zones.length} Zonen → ${outFile} (${Math.round(body.length / 1024)} KB)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try { main(process.argv.slice(2)); }
  catch (e) { console.error(`FEHLER: ${e.message}`); process.exit(1); }
}
