// SkyCheck — France UAS zones provider (ED-269 JSON)
// Reads only the 2° spatial tiles touched by the query bbox. This avoids parsing
// the complete 8.8 MB country snapshot on every serverless cold start.

const fs = require('fs');
const path = require('path');

let cachedManifest = null;
let cachedDataDir = null;
const cachedTiles = new Map();

function findDataDir() {
  const candidates = [
    path.join(__dirname, '..', '..', 'data', 'fr-zones-tiles'),
    path.join(__dirname, 'data', 'fr-zones-tiles'),
    path.join(process.cwd(), 'data', 'fr-zones-tiles'),
  ];
  for (const directory of candidates) {
    try { fs.statSync(path.join(directory, 'manifest.json')); return directory; } catch (_) {}
  }
  throw new Error('France zone tile manifest not found');
}

function loadManifest() {
  if (cachedManifest) return cachedManifest;
  cachedDataDir = findDataDir();
  cachedManifest = JSON.parse(fs.readFileSync(path.join(cachedDataDir, 'manifest.json'), 'utf8'));
  cachedManifest.tileSet = new Set(cachedManifest.tiles || []);
  return cachedManifest;
}

function tileKeysForBBox(bbox, manifest) {
  const size = Number(manifest.tileSize) || 2;
  const keys = [];
  for (let x = Math.floor(bbox.minLon / size); x <= Math.floor(bbox.maxLon / size); x++) {
    for (let y = Math.floor(bbox.minLat / size); y <= Math.floor(bbox.maxLat / size); y++) {
      const key = `${x}_${y}`;
      if (manifest.tileSet.has(key)) keys.push(key);
    }
  }
  return keys;
}

function loadTile(key) {
  if (cachedTiles.has(key)) return cachedTiles.get(key);
  const data = JSON.parse(fs.readFileSync(path.join(cachedDataDir, `${key}.json`), 'utf8'));
  const zones = Array.isArray(data.zones) ? data.zones : [];
  cachedTiles.set(key, zones);
  return zones;
}

function compactBBoxOverlap(bbox, query) {
  return bbox[0] <= query.maxLat && bbox[1] >= query.minLat
      && bbox[2] <= query.maxLon && bbox[3] >= query.minLon;
}

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const lat = parseFloat(qs.lat);
  const lon = parseFloat(qs.lon);
  const radiusM = parseFloat(qs.radius) || 100;
  if (!isFinite(lat) || !isFinite(lon)) {
    return { statusCode: 400, body: 'Missing lat/lon' };
  }

  // Query bbox: ±(radius in degrees, latitude-aligned)
  const δ = Math.max(0.001, radiusM / 111320);
  const queryBox = {
    minLat: lat - δ,
    maxLat: lat + δ,
    minLon: lon - δ,
    maxLon: lon + δ,
  };

  let manifest;
  let zones;
  try {
    manifest = loadManifest();
    zones = tileKeysForBBox(queryBox, manifest).flatMap(loadTile);
  } catch (e) {
    return { statusCode: 500, body: 'Data file unavailable: ' + e.message };
  }

  const hits = [];
  const seen = new Set();
  for (const zone of zones) {
    if (compactBBoxOverlap(zone.b, queryBox)) {
      if (seen.has(zone.i)) continue;
      seen.add(zone.i);
      hits.push(zone.z);
      if (hits.length >= 50) break; // safety cap
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
    body: JSON.stringify({ title: manifest.title || '', zones: hits }),
  };
};
