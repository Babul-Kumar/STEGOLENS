# ================================================================
# StegoLens - Production Dockerfile
# Multi-stage build with Node.js and Python PyTorch CPU runtime
# ================================================================

# Stage 1: Builder
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js ./
COPY shared/ ./shared/
COPY client/ ./client/
COPY server/ ./server/

# Compile production bundles (frontend vite + backend esbuild)
RUN npm run build

# Stage 2: Production Runtime
FROM python:3.11-slim-bookworm AS runner

# Install Node.js 20 and system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python ML and Forensics dependencies (CPU-optimized PyTorch)
RUN pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    torch torchvision \
    && pip install --no-cache-dir \
    timm \
    pillow \
    numpy \
    exifread

# Copy Node dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled bundles and assets
COPY --from=builder /app/dist ./dist
COPY shared/ ./shared/
COPY server/python-service/ ./server/python-service/
COPY model/ ./model/

# Create runtime directories for SQLite and ephemeral uploads
RUN mkdir -p uploads data && chmod 777 uploads data

# Environment defaults
ENV NODE_ENV=production \
    PORT=5000 \
    PYTHON_BIN=python3

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "dist/index.js"]
