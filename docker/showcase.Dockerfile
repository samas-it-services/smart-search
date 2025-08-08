FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Create app directory
WORKDIR /app

# Copy and build the main library (this is stable, won't change often)
COPY package*.json tsconfig.json ./
COPY src/ ./src/
RUN npm install && npm run build

# Create showcase directory (source will be mounted as volume)
WORKDIR /app/showcase
RUN npm init -y && npm install express

# Create health check script
RUN echo '#!/bin/sh\ncurl -f http://localhost:${PORT:-3000}/api/health || exit 1' > /app/healthcheck.sh && \
    chmod +x /app/healthcheck.sh

# Default command (can be overridden)
CMD ["node", "app.js"]