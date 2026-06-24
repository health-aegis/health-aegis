FROM node:20-alpine AS builder

# workspace root mirrors the repo so ../../../../shared/types resolves from src/models/
WORKDIR /workspace

COPY shared/ ./shared/

COPY services/api-gateway/package*.json ./services/api-gateway/
COPY services/api-gateway/tsconfig.json ./services/api-gateway/

WORKDIR /workspace/services/api-gateway
RUN npm install

COPY services/api-gateway/src/ ./src/
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk update && apk upgrade --no-cache && npm install -g npm@^10

ENV NODE_ENV=production
ENV PORT=5000

COPY services/api-gateway/package*.json ./
RUN npm install --only=production && \
    rm -rf /usr/lib/node_modules/npm /usr/bin/npm /usr/bin/npx \
           /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY --from=builder /workspace/services/api-gateway/dist ./dist

EXPOSE 5000

USER node

CMD ["node", "dist/services/api-gateway/src/index.js"]
