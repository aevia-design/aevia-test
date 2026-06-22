FROM node:20-slim

# sharp needs libvips; librsvg is required for SVG rendering via sharp
RUN apt-get update && apt-get install -y \
    libvips-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy service deps
COPY services/pdf-renderer/package.json ./services/pdf-renderer/package.json
RUN cd services/pdf-renderer && npm install --production

# Copy the renderer service entrypoint
COPY services/pdf-renderer/index.js ./services/pdf-renderer/index.js

# Copy the PDF rendering script (the core logic lives here)
COPY scripts/export-pdf.js ./scripts/export-pdf.js

# Copy template assets (SVGs, fonts, data files)
COPY assets/ ./assets/

CMD ["node", "services/pdf-renderer/index.js"]
