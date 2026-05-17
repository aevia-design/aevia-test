/**
 * Aevia Motif Generator
 * ---------------------
 * Generates small decorative interior motifs for photobook templates
 * using Replicate API.
 *
 * Setup:
 *   node --version   (must be 18+ for built-in fetch)
 *   npm install      (installs replicate package)
 *
 * Usage:
 *   node generate.js
 *   node generate.js --motif tent
 *   node generate.js --motif tent --no-style-image
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

// ── Load .env ────────────────────────────────────────────────────────────────

const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...rest] = trimmed.split("=");
      process.env[key.trim()] = rest.join("=").trim();
    }
  }
}

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!REPLICATE_TOKEN) {
  console.error("ERROR: REPLICATE_API_TOKEN not found in .env file.");
  process.exit(1);
}

// ── Load config ──────────────────────────────────────────────────────────────

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const motif = args.includes("--motif")
  ? args[args.indexOf("--motif") + 1]
  : config.active_motif;
const noStyleImage = args.includes("--no-style-image");

const useStyleImage =
  !noStyleImage &&
  config.replicate.style_image_input_field &&
  config.replicate.style_image_reference;

// ── Load prompt ──────────────────────────────────────────────────────────────

const promptPath = path.join(__dirname, "prompts", `${motif}.txt`);
if (!fs.existsSync(promptPath)) {
  console.error(`ERROR: No prompt file found at ${promptPath}`);
  process.exit(1);
}
const promptText = fs.readFileSync(promptPath, "utf8").trim();

console.log(`\nMotif:       ${motif}`);
console.log(`Model:       ${config.replicate.model}`);
console.log(`Style image: ${useStyleImage ? "yes" : "no"}`);
console.log(`Outputs:     ${config.replicate.num_outputs}\n`);

// ── Prepare output folder ────────────────────────────────────────────────────

const today = new Date().toISOString().split("T")[0];
const outputDir = path.join(__dirname, config.output.base_folder, motif, today);
fs.mkdirSync(outputDir, { recursive: true });

const existingFiles = fs.readdirSync(outputDir).filter(f => f.endsWith(".png"));
const existingRuns = existingFiles.map(f => {
  const m = f.match(/_run(\d+)_/);
  return m ? parseInt(m[1]) : 0;
});
const runIndex = existingRuns.length > 0 ? Math.max(...existingRuns) + 1 : 1;
console.log(`Saving to:   ${outputDir}  (run ${runIndex})\n`);

// ── Build model input ────────────────────────────────────────────────────────

const modelInput = {
  prompt: promptText,
  size: config.replicate.size,
  style: config.replicate.style,
  num_outputs: config.replicate.num_outputs,
};

if (useStyleImage) {
  const refFolder = path.join(__dirname, config.references.folder);
  const refImagePath = path.join(refFolder, config.replicate.style_image_reference);

  if (!fs.existsSync(refImagePath)) {
    console.warn(`WARNING: Style image not found at ${refImagePath} — skipping.\n`);
  } else {
    const imageData = fs.readFileSync(refImagePath).toString("base64");
    const ext = path.extname(refImagePath).slice(1).toLowerCase();
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
    modelInput[config.replicate.style_image_input_field] = `data:${mime};base64,${imageData}`;
    console.log(`Style reference: ${path.basename(refImagePath)}\n`);
  }
}

// ── Helper: download file from URL ───────────────────────────────────────────

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (err) => {
      fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

// ── Call Replicate API ───────────────────────────────────────────────────────

async function run() {
  const Replicate = require("replicate");
  const replicate = new Replicate({ auth: REPLICATE_TOKEN });

  console.log("Calling Replicate... (this may take 20–60 seconds)\n");

  const outputs = await replicate.run(config.replicate.model, { input: modelInput });
  const outputList = Array.isArray(outputs) ? outputs : [outputs];

  console.log(`Got ${outputList.length} outputs.\n`);

  const metadata = {
    motif,
    date: today,
    run: runIndex,
    model: config.replicate.model,
    style_image_used: useStyleImage,
    style_image_reference: useStyleImage ? config.replicate.style_image_reference : null,
    num_outputs: outputList.length,
    files: [],
    prompt: promptText,
  };

  for (let i = 0; i < outputList.length; i++) {
    const output = outputList[i];
    const filename = `${motif}_run${String(runIndex).padStart(2, "0")}_${String(i + 1).padStart(2, "0")}.png`;
    const filepath = path.join(outputDir, filename);

    // output is either a URL string or a FileOutput object
    const url = typeof output === "string" ? output : output.url?.() ?? String(output);
    await downloadFile(url, filepath);

    console.log(`  Saved: ${filename}`);
    metadata.files.push(filename);
  }

  const metaPath = path.join(outputDir, `metadata_run${String(runIndex).padStart(2, "0")}.json`);
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

  console.log(`\nDone. Metadata saved to ${path.basename(metaPath)}`);
  console.log(`Open folder: ${outputDir}\n`);
}

run().catch((err) => {
  console.error("\nERROR:", err.message || err);
  process.exit(1);
});
