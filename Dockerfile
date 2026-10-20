FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

# AnkiConnect runs on the host machine
ENV ANKI_CONNECT_URL=http://host.docker.internal:8765

# MCP over stdio: run with an attached stdin, e.g. `docker run -i --rm anki-connect-mcp`
CMD ["node", "dist/index.js"]
