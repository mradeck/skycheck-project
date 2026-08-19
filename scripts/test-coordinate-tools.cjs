#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');

global.window = global;
let fetchAttempts = 0;
global.fetch = async () => {
  fetchAttempts += 1;
  if (fetchAttempts === 1) throw new Error('simulated stale cache failure');
  return {
    ok: true,
    arrayBuffer: async () => {
      const bytes = fs.readFileSync('data/gcg2016v2023-cm.i16');
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
  };
};
require('../coordinate-tools.js');

const lat = 51 + 56 / 60 + 31.768 / 3600;
const lon = 13 + 53 / 60 + 46.094 / 3600;
const converted = GeoCoordinates.convert(lat, lon);

assert.equal(converted.utm.zoneBand, '33U');
assert.ok(Math.abs(converted.utm.easting - 424122.72) < 0.02);
assert.ok(Math.abs(converted.utm.northing - 5755180.43) < 0.02);

const gk4 = GeoCoordinates.gaussKrueger(lat, lon, 4);
assert.ok(Math.abs(gk4.easting - 4630489.194) < 0.02);
assert.ok(Math.abs(gk4.northing - 5758166.217) < 0.02);

(async () => {
  const geoid = await GeoCoordinates.geoidAt(lat, lon);
  assert.ok(Math.abs(geoid - 41.01) < 0.01);
  assert.ok(Math.abs(GeoCoordinates.normalHeight(94.04, geoid) - 53.03) < 0.01);
  assert.equal(fetchAttempts, 2, 'failed first grid request must retry once');
  console.log('Lübben control point: UTM, GK4 and DHHN2016 OK');
})().catch(error => { console.error(error); process.exitCode = 1; });
