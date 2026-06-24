#
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk update && apk upgrade --no-cache && npm install -g npm@^10

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev && \
    rm -rf /usr/lib/node_modules/npm /usr/bin/npm /usr/bin/npx \
           /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY --from=builder /app/dist ./dist

USER node

CMD ["node", "dist/worker.js"]

