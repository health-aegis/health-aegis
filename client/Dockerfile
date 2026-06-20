# Build stage — React JSX SPA
FROM node:20-alpine AS builder

WORKDIR /usr/src/app/client

# Accept api-gateway URL at build time so Socket.io connects directly to ACA
# Usage: docker build --build-arg VITE_API_URL=https://api-gateway.<env>.azurecontainerapps.io
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY client/package*.json ./
RUN npm install

COPY client/index.html ./
COPY client/vite.config.js ./
COPY client/tsconfig.json ./
COPY client/src/ ./src/

RUN npm run build

# ── Nginx static server stage ─────────────────────────────────────────────────
FROM nginx:alpine

COPY client/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /usr/src/app/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
