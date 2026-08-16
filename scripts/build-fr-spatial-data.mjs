#!/usr/bin/env node
// Builds 2° spatial tiles for France from the canonical full-country snapshots.
// The browser then loads one bundled context tile per viewport instead of four
// complete country files. The Netlify point-query function likewise opens only
// the zone tiles touched by its small query bbox.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const TILE_SIZE = 2;
const CONTEXT_LAYERS = ['protected', 'motorways', 'powerlines', 'rail'];
const contextOut = path.join(DATA, 'context', 'fr');
const zonesOut = path.join(DATA, 'fr-zones-tiles');

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const tileKey = (x, y) => `${x}_${y}`;
const tileRange = bbox => ({
  minX: Math.floor(bbox.minLon / TILE_SIZE),
  maxX: Math.floor(bbox.maxLon / TILE_SIZE),
  minY: Math.floor(bbox.minLat / TILE_SIZE),
  maxY: Math.floor(bbox.maxLat / TILE_SIZE),
});

function coordinateBBox(coordinates) {
  const bbox = { minLon: Infinity, minLat: Infinity, maxLon: -Infinity, maxLat: -Infinity };
  const visit = value => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === 'number' && typeof value[1] === 'number') {
      bbox.minLon = Math.min(bbox.minLon, value[0]);
      bbox.minLat = Math.min(bbox.minLat, value[1]);
      bbox.maxLon = Math.max(bbox.maxLon, value[0]);
      bbox.maxLat = Math.max(bbox.maxLat, value[1]);
      return;
    }
    value.forEach(visit);
  };
  visit(coordinates);
  return Number.isFinite(bbox.minLon) ? bbox : null;
}

function zoneBBox(feature) {
  const bbox = { minLon: Infinity, minLat: Infinity, maxLon: -Infinity, maxLat: -Infinity };
  for (const volume of (feature.geometry || [])) {
    const hp = volume.horizontalProjection;
    if (!hp) continue;
    if (hp.type === 'Polygon') {
      const part = coordinateBBox(hp.coordinates);
      if (!part) continue;
      bbox.minLon = Math.min(bbox.minLon, part.minLon);
      bbox.minLat = Math.min(bbox.minLat, part.minLat);
      bbox.maxLon = Math.max(bbox.maxLon, part.maxLon);
      bbox.maxLat = Math.max(bbox.maxLat, part.maxLat);
    } else if (hp.type === 'Circle' && Array.isArray(hp.center)) {
      const [lon, lat] = hp.center;
      const radiusDeg = (Number(hp.radius) || 0) / 111320;
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
      bbox.minLon = Math.min(bbox.minLon, lon - radiusDeg);
      bbox.minLat = Math.min(bbox.minLat, lat - radiusDeg);
      bbox.maxLon = Math.max(bbox.maxLon, lon + radiusDeg);
      bbox.maxLat = Math.max(bbox.maxLat, lat + radiusDeg);
    }
  }
  return Number.isFinite(bbox.minLon) ? bbox : null;
}

function zoneColor(restriction) {
  if (restriction === 'PROHIBITED') return '#ef4444';
  if (restriction === 'REQ_AUTHORISATION') return '#f59e0b';
  if (restriction === 'CONDITIONAL') return '#f97316';
  return '#64748b';
}

function formatAltitude(value, reference, unit) {
  if (value === undefined || value === null || value === '') return '—';
  if (value === 0 && (reference === 'AGL' || reference === 'SFC')) return 'GND';
  return `${Math.round(value)} ${unit === 'FT' ? 'ft' : 'm'} ${reference || ''}`.trim();
}

function normalizeZone(feature) {
  const restriction = feature.restriction || '';
  const firstVolume = (feature.geometry || [])[0] || {};
  const reason = Array.isArray(feature.reason) ? feature.reason.join(', ') : (feature.reason || '');
  const legal = [reason, feature.otherReasonInfo || '', feature.regulationExemption || '']
    .filter(Boolean).join(' · ') || '—';
  const geometry = (feature.geometry || []).map(volume => {
    const hp = volume.horizontalProjection;
    if (hp?.type === 'Polygon') return { type: 'Polygon', coordinates: hp.coordinates };
    if (hp?.type === 'Circle' && Array.isArray(hp.center)) {
      return { type: 'Circle', center: hp.center, radius: hp.radius || 0 };
    }
    return null;
  }).filter(Boolean);
  return {
    name: (feature.name || feature.identifier || '—') + (feature.country ? ` [${feature.country}]` : ''),
    type: restriction || 'UAS_ZONE',
    lower: formatAltitude(firstVolume.lowerLimit, firstVolume.lowerVerticalReference, firstVolume.uomDimensions),
    upper: formatAltitude(firstVolume.upperLimit, firstVolume.upperVerticalReference, firstVolume.uomDimensions),
    legal,
    color: zoneColor(restriction),
    geometry,
  };
}

function forEachTile(bbox, callback) {
  const range = tileRange(bbox);
  for (let x = range.minX; x <= range.maxX; x++) {
    for (let y = range.minY; y <= range.maxY; y++) callback(tileKey(x, y));
  }
}

function resetOutput(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
}

function buildContextTiles() {
  resetOutput(contextOut);
  // tile -> layer -> original feature index -> geometry components
  const tiles = new Map();
  const sources = new Map();

  for (const layer of CONTEXT_LAYERS) {
    const collection = readJson(path.join(DATA, `fr-${layer}.json`));
    sources.set(layer, collection.features || []);
    (collection.features || []).forEach((feature, featureIndex) => {
      const geometry = feature.geometry || {};
      const components = geometry.type === 'MultiLineString' || geometry.type === 'MultiPolygon'
        ? geometry.coordinates
        : [geometry.coordinates];
      for (const coordinates of components) {
        const bbox = coordinateBBox(coordinates);
        if (!bbox) continue;
        forEachTile(bbox, key => {
          if (!tiles.has(key)) tiles.set(key, new Map());
          const byLayer = tiles.get(key);
          if (!byLayer.has(layer)) byLayer.set(layer, new Map());
          const byFeature = byLayer.get(layer);
          if (!byFeature.has(featureIndex)) byFeature.set(featureIndex, []);
          byFeature.get(featureIndex).push(coordinates);
        });
      }
    });
  }

  const keys = [...tiles.keys()].sort();
  let bytes = 0;
  for (const key of keys) {
    const layers = {};
    for (const layer of CONTEXT_LAYERS) {
      const features = [];
      const source = sources.get(layer);
      for (const [featureIndex, coordinates] of (tiles.get(key).get(layer) || new Map())) {
        const original = source[featureIndex];
        const isLine = /LineString$/.test(original.geometry.type);
        features.push({
          type: 'Feature',
          properties: original.properties || {},
          geometry: {
            type: isLine ? 'MultiLineString' : 'MultiPolygon',
            coordinates,
          },
        });
      }
      layers[layer] = { type: 'FeatureCollection', features };
    }
    const json = JSON.stringify({ version: 1, tileSize: TILE_SIZE, key, layers });
    fs.writeFileSync(path.join(contextOut, `${key}.json`), json);
    bytes += Buffer.byteLength(json);
  }
  fs.writeFileSync(path.join(contextOut, 'manifest.json'), JSON.stringify({
    version: 1,
    country: 'fr',
    tileSize: TILE_SIZE,
    layers: CONTEXT_LAYERS,
    tiles: keys,
  }));
  console.log(`France context: ${keys.length} tiles, ${(bytes / 1e6).toFixed(2)} MB`);
}

function buildZoneTiles() {
  resetOutput(zonesOut);
  const source = readJson(path.join(DATA, 'uas-zones-fr.json'));
  const tiles = new Map();
  for (const feature of (source.features || [])) {
    const bbox = zoneBBox(feature);
    if (!bbox) continue;
    const entry = {
      b: [bbox.minLat, bbox.maxLat, bbox.minLon, bbox.maxLon],
      i: String(feature.identifier || `${feature.name}|${feature.type}`),
      z: normalizeZone(feature),
    };
    forEachTile(bbox, key => {
      if (!tiles.has(key)) tiles.set(key, []);
      tiles.get(key).push(entry);
    });
  }

  const keys = [...tiles.keys()].sort();
  let bytes = 0;
  for (const key of keys) {
    const json = JSON.stringify({ version: 1, key, zones: tiles.get(key) });
    fs.writeFileSync(path.join(zonesOut, `${key}.json`), json);
    bytes += Buffer.byteLength(json);
  }
  fs.writeFileSync(path.join(zonesOut, 'manifest.json'), JSON.stringify({
    version: 1,
    country: 'FR',
    title: source.title || '',
    tileSize: TILE_SIZE,
    tiles: keys,
  }));
  console.log(`France zones: ${keys.length} tiles, ${(bytes / 1e6).toFixed(2)} MB`);
}

buildContextTiles();
buildZoneTiles();
