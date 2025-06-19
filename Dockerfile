# Base Node.js image (using LTS version for stability)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Set default environment variable (can be overridden at runtime)
ENV ANKI_CONNECT_URL=http://host.docker.internal:8765

# Document the exposed port (documentation only, doesn't actually expose it)
# This is the port the MCP server uses, not AnkiConnect
EXPOSE 3000

# Run the MCP server
CMD ["npm", "start"]