"""
Aevia Motif Generator
---------------------
Generates small decorative interior motifs for photobook templates
using Replicate API.

Setup:
  pip install replicate
  set REPLICATE_API_TOKEN=your_token_here   (Windows)
  export REPLICATE_API_TOKEN=your_token_here (Mac/Linux)

Usage:
  python generate.py
  python generate.py --motif tent
  python generate.py --motif mountain_peak --no-style-image
"""

import os
import json
import base64
import argparse
import datetime
import urllib.request
from pathlib import Path

# Auto-load .env file from the same folder as this script
# So you just put REPLICATE_API_TOKEN=xxx in motif-engine/.env and it works
def load_env(env_path):
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

load_env(Path(__file__).parent / ".env")


# ── Load config ────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent
config_path = SCRIPT_DIR / "config.json"

with open(config_path) as f:
    config = json.load(f)


# ── CLI args ───────────────────────────────────────────────────────────────────

parser = argparse.ArgumentParser(description="Generate Aevia interior motifs")
parser.add_argument("--motif", default=config["active_motif"],
                    help="Motif name (must match a file in prompts/)")
parser.add_argument("--no-style-image", action="store_true",
                    help="Skip passing the reference image even if configured")
args = parser.parse_args()

motif = args.motif
use_style_image = (
    not args.no_style_image
    and config["replicate"].get("style_image_input_field")
    and config["replicate"].get("style_image_reference")
)


# ── Load prompt ────────────────────────────────────────────────────────────────

prompt_path = SCRIPT_DIR / "prompts" / f"{motif}.txt"
if not prompt_path.exists():
    raise FileNotFoundError(f"No prompt file found at {prompt_path}")

prompt_text = prompt_path.read_text(encoding="utf-8").strip()
print(f"\nMotif: {motif}")
print(f"Model: {config['replicate']['model']}")
print(f"Style image: {'yes' if use_style_image else 'no'}")
print(f"Outputs: {config['replicate']['num_outputs']}\n")


# ── Prepare output folder ──────────────────────────────────────────────────────

date_str = datetime.date.today().strftime("%Y-%m-%d")
output_dir = SCRIPT_DIR / config["output"]["base_folder"] / motif / date_str
output_dir.mkdir(parents=True, exist_ok=True)

# Find the next run index (so reruns don't overwrite)
existing = list(output_dir.glob("*.png"))
run_index = (len(existing) // config["replicate"]["num_outputs"]) + 1
print(f"Saving to: {output_dir}  (run {run_index})\n")


# ── Build model input ──────────────────────────────────────────────────────────

model_input = {
    "prompt": prompt_text,
    "size": config["replicate"]["size"],
    "style": config["replicate"]["style"],
    "num_outputs": config["replicate"]["num_outputs"],
}

# Attach style reference image if configured
if use_style_image:
    ref_folder = SCRIPT_DIR / config["references"]["folder"]
    ref_image_path = ref_folder / config["replicate"]["style_image_reference"]

    if not ref_image_path.exists():
        print(f"WARNING: Style image not found at {ref_image_path} — skipping style image.\n")
    else:
        # Encode image as base64 data URI (works with most Replicate models)
        with open(ref_image_path, "rb") as img_file:
            image_data = base64.b64encode(img_file.read()).decode("utf-8")
        ext = ref_image_path.suffix.lower().replace(".", "")
        mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
        field_name = config["replicate"]["style_image_input_field"]
        model_input[field_name] = f"data:{mime};base64,{image_data}"
        print(f"Style reference: {ref_image_path.name}\n")


# ── Call Replicate ─────────────────────────────────────────────────────────────

# Import here so missing package gives a clean error message
try:
    import replicate
except ImportError:
    raise ImportError("Run:  pip install replicate")

print("Calling Replicate... (this may take 20–60 seconds)\n")

outputs = replicate.run(
    config["replicate"]["model"],
    input=model_input
)

# replicate.run() returns a list of output URLs (or file-like objects)
output_urls = list(outputs)
print(f"Got {len(output_urls)} outputs.\n")


# ── Save outputs + metadata ────────────────────────────────────────────────────

metadata = {
    "motif": motif,
    "date": date_str,
    "run": run_index,
    "model": config["replicate"]["model"],
    "style_image_used": use_style_image,
    "style_image_reference": config["replicate"].get("style_image_reference") if use_style_image else None,
    "num_outputs": len(output_urls),
    "files": [],
    "prompt": prompt_text,
}

for i, output in enumerate(output_urls, start=1):
    filename = f"{motif}_run{run_index:02d}_{i:02d}.png"
    filepath = output_dir / filename

    # output can be a URL string or a file-like object depending on replicate version
    if isinstance(output, str):
        urllib.request.urlretrieve(output, filepath)
    else:
        # Newer replicate library returns FileOutput objects
        with open(filepath, "wb") as f:
            f.write(output.read())

    print(f"  Saved: {filename}")
    metadata["files"].append(filename)

# Write metadata JSON alongside the images
meta_path = output_dir / f"metadata_run{run_index:02d}.json"
with open(meta_path, "w") as f:
    json.dump(metadata, f, indent=2)

print(f"\nDone. Metadata saved to {meta_path.name}")
print(f"Open folder: {output_dir}\n")
