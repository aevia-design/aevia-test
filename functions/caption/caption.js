/**
 * Aevia Caption Generator
 * -----------------------
 * Generates a single caption for a photobook page using GPT-4o mini vision.
 *
 * Usage:
 *   node caption.js --image path/to/photo.jpg --collection travel
 *   node caption.js --image path/to/photo.jpg --collection kids --note "First steps"
 *   node caption.js --image https://signed-gcs-url --collection love
 *
 * Collections: travel, kids, love
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

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) {
  console.error("ERROR: OPENAI_API_KEY not found in .env file.");
  process.exit(1);
}

// ── Load voice guide ─────────────────────────────────────────────────────────

const voicePath = path.join(__dirname, "caption-voice.md");
if (!fs.existsSync(voicePath)) {
  console.error("ERROR: caption-voice.md not found.");
  process.exit(1);
}
const voiceGuide = fs.readFileSync(voicePath, "utf8").trim();

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(name) {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
}

const imagePath = getArg("--image");
const collection = getArg("--collection") || "travel";
const customerNote = getArg("--note") || null;

const VALID_COLLECTIONS = ["travel", "kids", "love"];

if (!imagePath) {
  console.error("ERROR: --image is required.");
  console.error("Usage: node caption.js --image photo.jpg --collection travel");
  process.exit(1);
}

if (!VALID_COLLECTIONS.includes(collection)) {
  console.error(`ERROR: --collection must be one of: ${VALID_COLLECTIONS.join(", ")}`);
  process.exit(1);
}

// ── Load image ───────────────────────────────────────────────────────────────

async function loadImageAsBase64(src) {
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      https.get(src, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          loadImageAsBase64(res.headers.location).then(resolve).catch(reject);
          return;
        }
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          resolve({ data: buffer.toString("base64") });
        });
      }).on("error", reject);
    });
  }

  const resolved = path.resolve(src);
  if (!fs.existsSync(resolved)) {
    console.error(`ERROR: Image not found at ${resolved}`);
    process.exit(1);
  }
  const buffer = fs.readFileSync(resolved);
  return { data: buffer.toString("base64") };
}

function getMediaType(src) {
  const ext = src.split(".").pop().toLowerCase().split("?")[0];
  const map = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  return map[ext] || "image/jpeg";
}

// ── Build prompt ─────────────────────────────────────────────────────────────

function buildUserPrompt() {
  const lines = [`Collection: ${collection}`];
  if (customerNote) lines.push(`Customer note: "${customerNote}"`);
  lines.push("", "Generate one caption for this photo. Return only the caption text, nothing else.");
  return lines.join("\n");
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const OpenAI = require("openai");
  const client = new OpenAI.default({ apiKey: OPENAI_KEY });

  console.log(`\nImage:      ${imagePath}`);
  console.log(`Collection: ${collection}`);
  if (customerNote) console.log(`Note:       "${customerNote}"`);
  console.log("\nGenerating caption...\n");

  const { data } = await loadImageAsBase64(imagePath);
  const mediaType = getMediaType(imagePath);

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 100,
    messages: [
      { role: "system", content: voiceGuide },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mediaType};base64,${data}` } },
          { type: "text", text: buildUserPrompt() },
        ],
      },
    ],
  });

  const caption = response.choices[0].message.content.trim();

  console.log(`Caption:\n\n  ${caption}\n`);

  // Save output
  const today = new Date().toISOString().split("T")[0];
  const outDir = path.join(__dirname, "outputs", today);
  fs.mkdirSync(outDir, { recursive: true });

  const existingFiles = fs.readdirSync(outDir).filter(f => f.endsWith(".json"));
  const runIndex = existingFiles.length + 1;
  const outFile = path.join(outDir, `caption_${String(runIndex).padStart(3, "0")}.json`);

  fs.writeFileSync(outFile, JSON.stringify({
    date: today,
    image: imagePath,
    collection,
    customer_note: customerNote,
    caption,
    model: "gpt-4o-mini",
  }, null, 2));

  console.log(`Saved to: ${outFile}\n`);
}

run().catch((err) => {
  console.error("\nERROR:", err.message || err);
  process.exit(1);
});
