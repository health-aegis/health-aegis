FROM node:20-alpine

WORKDIR /app

RUN apk update && apk upgrade --no-cache && apk add --no-cache wget && npm install -g npm@latest

COPY package*.json ./
RUN npm install --omit=dev

COPY src/ ./src/

EXPOSE 5001

USER node

CMD ["node", "src/index.js"]
