FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget

COPY package*.json ./
RUN npm install --omit=dev

COPY src/ ./src/

EXPOSE 5001

USER node

CMD ["node", "src/index.js"]
