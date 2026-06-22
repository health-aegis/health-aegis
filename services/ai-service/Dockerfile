FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk update && apk upgrade --no-cache && apk add --no-cache wget && npm install -g npm@latest
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/
EXPOSE 5003
USER node
CMD ["node", "src/index.js"]
