#!/usr/bin/env node
// TO-DOS #133 — sync German country-name labels from
// work/german-countries/de-names.json into:
//   1. the three canonical Map_Coordinates_upd.csv files (adds a "German name" column)
//   2. mapCoordinates in joyride-data.js / laguna-data.js / wander-data.js (adds `de: "..."`)
//
// The CSV is source of truth (CLAUDE.md); this script is the sync step the brief
// says to write since none existed. Re-run it any time de-names.json changes.
// X/Y/region values are never touched — only the `de` label is added or updated.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const DE_NAMES = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'work/german-countries/de-names.json'), 'utf8')
);
delete DE_NAMES._source;

const CSVS = [
  'assets/Template_Joyride/SVG/FP Spread 1 - Special Files/Map_Coordinates_upd.csv',
  'assets/Template_Laguna/SVG/FP Travel Itinerary/Map_Coordinates_upd.csv',
  'assets/Template_Wander/FP Spread 1 - Special Files/Map_Coordinates_upd.csv',
];

const DATA_FILES = [
  'assets/Template_Joyride/joyride-data.js',
  'assets/Template_Laguna/laguna-data.js',
  'assets/Template_Wander/wander-data.js',
];

function updateCsv(relPath) {
  const full = path.join(ROOT, relPath);
  const raw = fs.readFileSync(full, 'utf8'); // preserve existing LF-only, no-BOM encoding
  const lines = raw.split('\n');
  const out = [];
  let dataStarted = false;
  let missing = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === '' && i === lines.length - 1) { out.push(line); continue; } // trailing newline
    if (i === 0) { out.push(line); continue; } // filler title row, untouched
    if (i === 1) { out.push(line + ';German name'); dataStarted = true; continue; }
    if (!dataStarted) { out.push(line); continue; }
    const country = line.split(';')[0];
    const de = DE_NAMES[country];
    if (!de) missing.push(country);
    out.push(line + ';' + (de || ''));
  }
  if (missing.length) throw new Error(`${relPath}: missing German name for: ${missing.join(', ')}`);
  fs.writeFileSync(full, out.join('\n'));
  console.log(`updated ${relPath}`);
}

function updateDataFile(relPath) {
  const full = path.join(ROOT, relPath);
  let src = fs.readFileSync(full, 'utf8');
  let count = 0;
  const missing = [];
  src = src.replace(
    /"([^"]+)":\s*\{\s*region:\s*"([^"]+)",\s*xMm:\s*(-?[\d.]+),\s*yMm:\s*(-?[\d.]+)\s*\}/g,
    (match, country, region, x, y) => {
      const de = DE_NAMES[country];
      if (!de) { missing.push(country); return match; }
      count++;
      return `"${country}": { region: "${region}", xMm: ${x}, yMm: ${y}, de: "${de}" }`;
    }
  );
  if (missing.length) throw new Error(`${relPath}: missing German name for: ${missing.join(', ')}`);
  fs.writeFileSync(full, src);
  console.log(`updated ${relPath} (${count} countries)`);
}

for (const csv of CSVS) updateCsv(csv);
for (const df of DATA_FILES) updateDataFile(df);
console.log('done');
