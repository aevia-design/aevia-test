/**
 * Aevia LoRA Trainer
 * ------------------
 * Trains a FLUX LoRA on the artist's reference images so that
 * generate.js can produce motifs in the correct visual style.
 *
 * What this does:
 *   1. Zips all images from assets/Template Mountains/References/
 *   2. Uploads the zip to Replicate
 *   3. Starts a LoRA training run (ostris/flux-dev-lora-trainer)
 *   4. Polls until training completes (~10–20 min, ~$3–5)
 *   5. Saves the trained model version to config.json
 *
 * Requires in motif-engine/.env:
 *   REPLICATE_API_TOKEN=...
 *   REPLICATE_USERNAME=aevia-design
 *   REPLICATE_MODEL_NAME=aevia-kevinlucbert
 *
 * Usage:
 *   node train.js
 */

const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

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
if (!REPLICATE_TOKEN) { console.error("ERROR: REPLICATE_API_TOKEN not found in .env"); process.exit(1); }

const REPLICATE_USERNAME = process.env.REPLICATE_USERNAME;
if (!REPLICATE_USERNAME) { console.error("ERROR: REPLICATE_USERNAME not found in .env"); process.exit(1); }

const REPLICATE_MODEL_NAME = process.env.REPLICATE_MODEL_NAME || "aevia-kevinlucbert";

// ── Load config ──────────────────────────────────────────────────────────────

const configPath = path.join(__dirname, "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const referencesFolder = path.resolve(__dirname, config.references.folder);

// ── Step 1: Zip reference images ─────────────────────────────────────────────

function createZip() {
  return new Promise((resolve, reject) => {
    const zipPath = path.join(__dirname, "training-images.zip");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log(`  Zip created (${(archive.pointer() / 1024).toFixed(1)} KB)`);
      resolve(zipPath);
    });
    archive.on("error", reject);
    archive.pipe(output);

    const images = fs.readdirSync(referencesFolder).filter(f =>
      /\.(jpg|jpeg|png|webp)$/i.test(f)
    );

    if (images.length === 0) {
      reject(new Error(`No images found in ${referencesFolder}`));
      return;
    }

    console.log(`  Adding ${images.length} images:`);
    for (const img of images) {
      console.log(`    - ${img}`);
      // Sanitize filename for zip (remove spaces)
      const safeName = img.replace(/ /g, "-");
      archive.file(path.join(referencesFolder, img), { name: safeName });
    }

    archive.finalize();
  });
}

// ── Step 2: Create model on Replicate (if it doesn't exist) ──────────────────

async function ensureModelExists(replicate) {
  const destination = `${REPLICATE_USERNAME}/${REPLICATE_MODEL_NAME}`;
  console.log(`\n2. Checking model: ${destination}`);

  try {
    await replicate.models.get(REPLICATE_USERNAME, REPLICATE_MODEL_NAME);
    console.log(`   Already exists — reusing.`);
  } catch (err) {
    if (err.response?.status === 404 || err.message?.includes("404") || err.status === 404) {
      console.log(`   Doesn't exist — creating...`);
      await replicate.models.create(REPLICATE_USERNAME, REPLICATE_MODEL_NAME, {
        visibility: "private",
        hardware: "gpu-l40s",
        description: "Kevin Lucbert style LoRA — for Aevia photobook interior motifs",
      });
      console.log(`   Model created.`);
    } else {
      throw err;
    }
  }

  return destination;
}

// ── Step 3: Upload zip to Replicate ──────────────────────────────────────────

async function uploadZip(replicate, zipPath) {
  console.log(`\n3. Uploading zip to Replicate...`);
  const fileBuffer = fs.readFileSync(zipPath);
  const blob = new Blob([fileBuffer], { type: "application/zip" });

  const uploadedFile = await replicate.files.create(blob, {
    filename: "training-images.zip",
  });

  console.log(`   Uploaded. File ID: ${uploadedFile.id}`);
  return uploadedFile.urls.get;
}

// ── Step 4: Start training ────────────────────────────────────────────────────

async function startTraining(replicate, fileUrl, destination) {
  console.log(`\n4. Starting LoRA training...`);
  console.log(`   Trigger word: kevinlucbert_style`);
  console.log(`   Steps: 1000 | Est. cost: ~$3–5 | Est. time: 10–20 min\n`);

  const trainer = await replicate.models.get("ostris", "flux-dev-lora-trainer");
  const trainerVersion = trainer.latest_version.id;
  console.log(`   Trainer version: ${trainerVersion}`);

  const training = await replicate.trainings.create(
    "ostris",
    "flux-dev-lora-trainer",
    trainerVersion,
    {
      destination,
      input: {
        input_images: fileUrl,
        steps: 1000,
        lora_rank: 16,
        optimizer: "adamw8bit",
        batch_size: 1,
        resolution: "512,768,1024",
        autocaption: true,
        trigger_word: "kevinlucbert_style",
      },
    }
  );

  console.log(`\n   Training started!`);
  console.log(`   ID: ${training.id}`);
  console.log(`   Track at: https://replicate.com/p/${training.id}\n`);
  return training;
}

// ── Step 5: Poll until done ───────────────────────────────────────────────────

async function waitForTraining(replicate, training) {
  console.log("5. Waiting for training to complete...");
  console.log("   Checking every 30 seconds. You can also track progress at:");
  console.log(`   https://replicate.com/p/${training.id}\n`);

  let lastStatus = "";
  while (true) {
    await new Promise(r => setTimeout(r, 30000));

    const updated = await replicate.trainings.get(training.id);
    if (updated.status !== lastStatus) {
      console.log(`   [${new Date().toLocaleTimeString()}] Status: ${updated.status}`);
      lastStatus = updated.status;
    }

    if (updated.status === "succeeded") return updated;
    if (updated.status === "failed" || updated.status === "canceled") {
      console.error(`\nTraining ${updated.status}.`);
      if (updated.error) console.error("Error:", updated.error);
      process.exit(1);
    }
  }
}

// ── Step 6: Save result to config.json ───────────────────────────────────────

function saveToConfig(destination, versionId) {
  console.log(`\n6. Saving to config.json...`);

  config.lora = {
    model: destination,
    version: versionId,
    trigger_word: "kevinlucbert_style",
    trained_on: new Date().toISOString().split("T")[0],
  };

  config.replicate.model = `${destination}:${versionId}`;
  config.replicate.style = null;
  config.replicate.style_image_input_field = null;
  config.replicate.style_image_reference = null;

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`   config.json updated.`);
  console.log(`   generate.js will now use kevinlucbert_style automatically.`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const Replicate = require("replicate");
  const replicate = new Replicate({ auth: REPLICATE_TOKEN });

  console.log("=== Aevia LoRA Training ===\n");
  console.log(`Username:   ${REPLICATE_USERNAME}`);
  console.log(`Model:      ${REPLICATE_MODEL_NAME}`);
  console.log(`References: ${referencesFolder}\n`);

  console.log("1. Creating zip of reference images...");
  const zipPath = await createZip();

  const destination = await ensureModelExists(replicate);
  const fileUrl = await uploadZip(replicate, zipPath);
  const training = await startTraining(replicate, fileUrl, destination);
  const result = await waitForTraining(replicate, training);

  // Extract version ID from result
  const versionId = result.output?.version
    || result.urls?.get?.split("/").pop()
    || result.id;

  console.log(`\nTraining complete!`);
  console.log(`Version: ${versionId}`);

  saveToConfig(destination, versionId);

  fs.unlinkSync(zipPath);
  console.log(`\nZip cleaned up.`);
  console.log(`\nDone! Run: node generate.js\n`);
}

run().catch(err => {
  console.error("\nERROR:", err.message || err);
  process.exit(1);
});
