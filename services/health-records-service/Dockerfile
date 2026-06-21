FROM node:20-alpine

WORKDIR /app

RUN apk update && apk upgrade --no-cache && apk add --no-cache wget

COPY package*.json ./
RUN npm install --omit=dev && \
    rm -rf /usr/lib/node_modules/npm /usr/bin/npm /usr/bin/npx \
           /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY src/ ./src/

EXPOSE 5001

USER node

CMD ["node", "src/index.js"]
