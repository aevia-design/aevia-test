# Aevia Motif Engine

Generates small decorative motifs for Aevia photobook interiors using a custom AI model trained on Kevin Lucbert's illustration style.

The style: bold flat shapes, dense directional pen hatching, vibrant flat color. Objects isolated on white — designed to sit as quiet decorative fragments on a printed page, legible at 2–3cm.

---

## Setup (first time only)

**1. Install Node.js**
Download from https://nodejs.org — install the LTS version.

**2. Install dependencies**
Open a terminal in the `motif-engine/` folder and run:
```
npm install
```

**3. Add your API key**
Create a file called `.env` in the `motif-engine/` folder (this file is never committed to git):
```
REPLICATE_API_TOKEN=your_token_here
```
Get the token from Evgeny — or from replicate.com → Account → API tokens.

---

## Generating motifs

Run from inside the `motif-engine/` folder.

**Generate the active motif** (set in `config.json`):
```
node generate.js
```

**Generate a specific motif:**
```
node generate.js --motif tent
node generate.js --motif boots
node generate.js --motif van
```

Each run generates 4 images and saves them to `outputs/<motif>/<date>/`.
A `metadata_run01.json` file is saved alongside with the prompt and model used.

---

## Adding a new motif

1. Create a new file in `prompts/` — e.g. `prompts/compass.txt`
2. Write the prompt following the pattern of existing prompts:
   - Start with `kevinlucbert_style.`
   - Describe the object, its size on canvas (~15%), and color palette
   - End with the isolation and print-size note
3. Run: `node generate.js --motif compass`

---

## Config

`config.json` controls which model, how many outputs per run, and which motif runs by default.

Key fields:
- `active_motif` — which motif runs when you call `node generate.js` with no arguments
- `replicate.num_outputs` — how many images per run (4 is a good default)
- `lora` — the Kevin Lucbert model details (do not change without checking with Evgeny)

---

## Existing motifs

| Motif | Description |
|-------|-------------|
| `tent` | Camping tent, warm orange/coral body |
| `boots` | Hiking boots hanging by laces |
| `backpack` | Hiking backpack |
| `van` | Camper van |
| `hiker` | Walking figure |
| `mug` | Enamel camping mug |
| `gasstove` | Portable gas stove |
| `rock` | Rock / boulder |
| `bg_crosshatch` | Background crosshatch texture tile |

These are all mountain/outdoor template motifs. New templates will have their own motif sets.
