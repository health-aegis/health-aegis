FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk update && apk upgrade --no-cache && apk add --no-cache wget \
    && npm install -g npm@latest --quiet \
    && npm install -g undici@6.27.0 --quiet \
    && rm -rf /usr/local/lib/node_modules/npm/node_modules/undici \
    && cp -r /usr/local/lib/node_modules/undici /usr/local/lib/node_modules/npm/node_modules/undici
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/
EXPOSE 5001
USER node
CMD ["node", "src/index.js"]
