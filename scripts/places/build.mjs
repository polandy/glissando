#!/usr/bin/env node
// Reduces a GeoNames "cities15000.txt" dump to the three columns trip chapters need: name,
// latitude, longitude (ADR-0043). Columns per GeoNames' documented dump format: 1 geonameid,
// 2 name, 3 asciiname, 4 alternatenames, 5 latitude, 6 longitude, 7+ feature/admin/population.

import { readFileSync, writeFileSync } from "node:fs";

const NAME_COLUMN = 1;
const LATITUDE_COLUMN = 4;
const LONGITUDE_COLUMN = 5;
const MIN_COLUMNS = 6;
/** Degrees rounded to this many decimals (about 110 m), far tighter than the 50 km lookup needs. */
const COORDINATE_DECIMALS = 3;

const [, , inputPath, outputPath] = process.argv;
if (inputPath === undefined || outputPath === undefined) {
  console.error("usage: build.mjs <cities15000.txt> <output.tsv>");
  process.exit(1);
}

const lines = readFileSync(inputPath, "utf8").split("\n").filter((line) => line.length > 0);
const rows = lines.map((line, index) => {
  const columns = line.split("\t");
  if (columns.length < MIN_COLUMNS) {
    throw new Error(`line ${index + 1} of ${inputPath} has ${columns.length} columns, expected at least ${MIN_COLUMNS}`);
  }
  const name = columns[NAME_COLUMN];
  const latitude = Number(columns[LATITUDE_COLUMN]);
  const longitude = Number(columns[LONGITUDE_COLUMN]);
  if (name === "" || name === undefined || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`line ${index + 1} of ${inputPath} has an unreadable name or coordinate: ${line}`);
  }
  return { name, latitude, longitude };
});

const tsv = rows
  .map((row) => `${row.name}\t${row.latitude.toFixed(COORDINATE_DECIMALS)}\t${row.longitude.toFixed(COORDINATE_DECIMALS)}`)
  .join("\n");
writeFileSync(outputPath, `${tsv}\n`);
console.error(`${rows.length} places written to ${outputPath}`);
