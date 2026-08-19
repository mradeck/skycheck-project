#!/usr/bin/env node
/*
 * Converts the official GCG2016 GeoTIFF into the compact browser grid used by
 * coordinate-tools.js. Values are signed Int16 centimetres, north-to-south,
 * little-endian; 32767 is NoData. The 5 mm quantisation error is below both
 * GCG2016's centimetre accuracy and normal phone-GPS height uncertainty.
 *
 * Usage:
 *   node scripts/build-gcg-web-grid.mjs source.tif output.i16 /path/to/geotiff.js
 */
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const [source, output, geotiffModule] = process.argv.slice(2);
if (!source || !output || !geotiffModule) {
  console.error('Usage: build-gcg-web-grid.mjs source.tif output.i16 /path/to/geotiff.js');
  process.exit(1);
}

const { fromFile } = await import(pathToFileURL(geotiffModule));
const tiff = await fromFile(source);
const image = await tiff.getImage();
const [raster] = await image.readRasters();
const noData = Number(image.getGDALNoData());
const out = Buffer.allocUnsafe(raster.length * 2);
for (let i = 0; i < raster.length; i += 1) {
  const value = raster[i];
  const encoded = !Number.isFinite(value) || value === noData ? 32767 : Math.round(value * 100);
  out.writeInt16LE(encoded, i * 2);
}
await fs.mkdir(new URL('.', pathToFileURL(output)), { recursive: true });
await fs.writeFile(output, out);
console.log(`${image.getWidth()} × ${image.getHeight()} samples → ${out.length} bytes`);
