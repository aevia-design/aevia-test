FROM node:20-slim

# sharp needs libvips; librsvg is required for SVG rendering via sharp
RUN apt-get update && apt-get install -y \
    libvips-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps at the app root so BOTH the service entrypoint
# (services/pdf-renderer/index.js) and the ported renderer (scripts/export-pdf.js)
# resolve sharp/pdf-lib/fontkit from /app/node_modules. Node walks up from each
# file's directory to /app/node_modules, so a single root install serves both.
COPY services/pdf-renderer/package.json ./package.json
RUN npm install --production

# Service entrypoint
COPY services/pdf-renderer/index.js ./services/pdf-renderer/index.js

# Core PDF rendering logic (imported by the entrypoint)
COPY scripts/export-pdf.js ./scripts/export-pdf.js

# Template assets — SVGs, fonts, and the *-data.js files export-pdf.js requires at load
COPY assets/ ./assets/

CMD ["node", "services/pdf-renderer/index.js"]
