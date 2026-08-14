// Stage 2: add svgDe fields beside the EN svg paths in the template data files.
// Each entry must replace exactly once; anything else aborts loudly.
// Papercut's two Art files are intentionally NOT wired (still live-text, awaiting
// Xenia's re-export). Toys/Steps V variants reuse the H DE file — H==V artwork
// was validated path-identical in stage0 (see stage0-report.md).
import { readFileSync, writeFileSync } from 'node:fs';

const EDITS = {
  'assets/Template_Scribble/scribble-data.js': [
    ['FP Spread 1/FP Birthday 01 L.svg', 'FP Spread 1/FP Birthday 01 L-DE.svg'],
    ['FP Spread 2/FP Words 03 L.svg', 'FP Spread 2/FP Words 03 L-DE.svg'],
    ['FP Spread 3/FP Toy 05 H L.svg', 'FP Spread 3/FP Toy 05 H L-DE.svg'],
    ['FP Spread 3/FP Toy 05 V L.svg', 'FP Spread 3/FP Toy 05 H L-DE.svg'], // V==H artwork
    ['FP Spread 4/FP Steps 07 H L.svg', 'FP Spread 4/FP Steps 07 H L-DE.svg'],
    ['FP Spread 4/FP Steps 07 V L.svg', 'FP Spread 4/FP Steps 07 H L-DE.svg'], // V==H artwork
    ['FP Spread 5/FP Art 09 H L.svg', 'FP Spread 5/FP Art H 09 Left-DE.svg'],
    ['FP Spread 5/FP Art 09 V L.svg', 'FP Spread 5/FP Art V 09 Left-DE.svg'],
    ['FP Spread 5/FP Art 10 H R.svg', 'FP Spread 5/FP Art H 10 Right-DE.svg'],
    ['FP Spread 5/FP Art 12 V R.svg', 'FP Spread 5/FP Art V 12 Right-DE.svg'],
  ],
  'assets/Template_Papercut/papercut-data.js': [
    ['FP Spread 1 Birthday/FP Birthday 01 Left.svg', 'FP Spread 1 Birthday/FP Birthday 01 Left-DE.svg'],
    ['FP Spread 2 Words/FP Words 03 Left.svg', 'FP Spread 2 Words/FP Words 03 Left-DE.svg'],
    ['FP Spread 3 Toys/FP Toy 05 H Left.svg', 'FP Spread 3 Toys/FP Toy 05 Left-DE.svg'],
    ['FP Spread 3 Toys/FP Toy 05 V Left.svg', 'FP Spread 3 Toys/FP Toy 05 Left-DE.svg'], // V==H artwork
    ['FP Spread 4 Steps/FP Steps 07 H Left.svg', 'FP Spread 4 Steps/FP Steps 07 Left-DE.svg'],
    ['FP Spread 4 Steps/FP Steps 07 V Left.svg', 'FP Spread 4 Steps/FP Steps 07 Left-DE.svg'], // V==H artwork
    // FP Art 09 Left/Right-DE: NOT wired — live <text>, awaiting re-export (stage0-report.md)
  ],
  'assets/Template_Tender/tender-data.js': [
    ['FP Spread 1 Our story/FP 02 Our story Right.svg', 'FP Spread 1 Our story/FP 02 Our story Right-DE.svg'],
    ['FP Spread 2 Words/FP 03 Words Left.svg', 'FP Spread 2 Words/FP 03 Words Left-DE.svg'],
  ],
  'assets/Template_Wander/wander-data.js': [
    ['FP Spread 1/FP 01 Map Right.svg', 'FP Spread 1/FP 01 Map Right-DE.svg'],
  ],
  'assets/Template_Joyride/joyride-data.js': [
    ['FP Spread 1/FP 01 Right.svg', 'FP Spread 1/FP 01 Right-DE.svg'],
  ],
  'assets/Template_Laguna/laguna-data.js': [
    ['FP Travel Itinerary/Travel Itinerary.svg', 'FP Travel Itinerary/Travel Itinerary-DE.svg'],
  ],
  'assets/Template_Heirloom/Beige/heirloom-data.js': [
    ['FP Spread 1 Our story/FP 02 Our story Right.svg', 'FP Spread 1 Our story/Our story DE Right Brown-DE.svg'],
    ['FP Spread 2.3 Why I love Her.Him/FP 03 Why Him Left.svg', 'FP Spread 2.3 Why I love Her.Him/Why Him DE Left-DE.svg'],
    ['FP Spread 2.3 Why I love Her.Him/FP 03 Why Her Left.svg', 'FP Spread 2.3 Why I love Her.Him/Why Her DE Left-DE.svg'],
  ],
  'assets/Template_Heirloom/Brown/heirloom-brown-data.js': [
    ['FP Spread 1 Our story/FP 02 Our story Right.svg', 'FP Spread 1 Our story/Our story DE Right Brown-DE.svg'],
    ['FP Spread 2.3 Why I love Her.Him/FP 03 Why Him Left.svg', 'FP Spread 2.3 Why I love Her.Him/Why Him DE Left-DE.svg'],
    ['FP Spread 2.3 Why I love Her.Him/FP 03 Why Her Left.svg', 'FP Spread 2.3 Why I love Her.Him/Why Her DE Left-DE.svg'],
  ],
  'assets/Template_Heirloom/Blue/heirloom-blue-data.js': [
    ['FP Spread 1 Our story/FP 02 Our story Right.svg', 'FP Spread 1 Our story/Our story Right-DE.svg'],
    ['FP Spread 2 Why I love/FP 03 Why Him Left.svg', 'FP Spread 2 Why I love/Why Him Left-DE.svg'],
    ['FP Spread 2 Why I love/FP 03 Why Her Left.svg', 'FP Spread 2 Why I love/Why Her Left-DE.svg'],
  ],
  'assets/Template_Heirloom/Green/heirloom-green-data.js': [
    ['FP Spread 1 Our story/FP 02 Our story Right.svg', 'FP Spread 1 Our story/Our story Right-DE.svg'],
    ['FP Spread 2 Why I love/FP 03 Why Him Left.svg', 'FP Spread 2 Why I love/Why Him Left-DE.svg'],
    ['FP Spread 2 Why I love/FP 03 Why Her Left.svg', 'FP Spread 2 Why I love/Why Her Left-DE.svg'],
  ],
};

let fail = false;
for (const [file, edits] of Object.entries(EDITS)) {
  let src = readFileSync(file, 'utf8');
  for (const [en, de] of edits) {
    const needle = `svg: '${en}'`;
    const count = src.split(needle).length - 1;
    if (count !== 1) { console.error(`✗ ${file}: "${needle}" found ${count}× (need exactly 1)`); fail = true; continue; }
    src = src.replace(needle, `svg: '${en}', svgDe: '${de}'`);
  }
  if (!fail) writeFileSync(file, src);
  console.log(`✓ ${file}: ${edits.length} svgDe added`);
}
process.exit(fail ? 1 : 0);
