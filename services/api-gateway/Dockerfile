# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Use project root as workspace so the directory structure mirrors the repo:
#   /workspace/shared/types.ts
#   /workspace/services/api-gateway/src/models/models.ts
# This makes the import '../../../../shared/types' resolve correctly:
#   from src/models/ → ../../../../ → /workspace/ → shared/types ✅
WORKDIR /workspace

# Copy shared types (needed by TypeScript at compile time)
COPY shared/ ./shared/

# Copy api-gateway package files and install ALL deps (incl. typescript/ts-node)
COPY services/api-gateway/package*.json ./services/api-gateway/
COPY services/api-gateway/tsconfig.json ./services/api-gateway/

WORKDIR /workspace/services/api-gateway
RUN npm install

# Copy source and compile
COPY services/api-gateway/src/ ./src/
RUN npm run build
# TypeScript rootDir auto-resolves to /workspace/ (common ancestor of src/ and shared/)
# So output lands at: dist/services/api-gateway/src/index.js

# ── Production stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production deps only
COPY services/api-gateway/package*.json ./
RUN npm install --only=production

# Copy the full compiled dist tree from builder
COPY --from=builder /workspace/services/api-gateway/dist ./dist

EXPOSE 5000

# Entry point matches the TypeScript rootDir-computed output path
CMD ["node", "dist/services/api-gateway/src/index.js"]
