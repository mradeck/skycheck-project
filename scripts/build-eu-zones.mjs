#!/usr/bin/env node
// SkyCheck — amtliche UAS-Geozonen (LU/NO/EE) → kanonisches ED-269-Array.
// Reine Transformation, kein Netzwerkzugriff. Aufruf:
//   node scripts/build-eu-zones.mjs <lu|no|ee> <eingabe> <ausgabe.json> [--min N]
// Schreibt <ausgabe.json> und daneben <ausgabe>.version (SHA-256 der Ausgabe).
// Bei jedem Fehler: Exit-Code 1, die Ausgabedatei bleibt unverändert.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// Schutz gegen abgeschnittene Downloads (echte Größen 2026-10: LU 43, NO 1390, EE 241).
const MIN_ZONES = { lu: 20, no: 500, ee: 100 };
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

const isTemporary = z => (z.applicability || []).some(a => a && a.permanent === 'NO');

export function buildZones(country, rawText, opts = {}) {
  if (!(country in MIN_ZONES)) throw new Error(`unbekanntes Land: ${country}`);
  let text = String(rawText);
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  let zones = toZones(country, JSON.parse(text));
  if (country === 'no') zones = zones.filter(z => !isTemporary(z));
  zones = zones
    .map(z => ({ ...z, geometry: (Array.isArray(z.geometry) ? z.geometry : []).map(cleanVolume).filter(Boolean) }))
    .filter(z => z.geometry.length > 0);
  const min = Number.isFinite(opts.min) ? opts.min : MIN_ZONES[country];
  if (zones.length < min) throw new Error(`zu wenige Zonen für ${country}: ${zones.length} < ${min}`);
  return zones;
}

function main(argv) {
  const [country, inFile, outFile, ...rest] = argv;
  if (!country || !inFile || !outFile) {
    console.error('Aufruf: build-eu-zones.mjs <lu|no|ee> <eingabe> <ausgabe.json> [--min N]');
    process.exit(2);
  }
  const i = rest.indexOf('--min');
  const opts = i >= 0 ? { min: Number(rest[i + 1]) } : {};
  const zones = buildZones(country, readFileSync(inFile, 'utf8'), opts);
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
