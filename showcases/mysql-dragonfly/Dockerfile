FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# First, build the SmartSearch library
COPY package*.json tsconfig.json ./
COPY src/ ./src/
RUN npm install && npm run build

# Now set up the showcase application
WORKDIR /app/showcase
COPY showcases/mysql-dragonfly/package*.json ./
RUN npm install

# Copy showcase application code
COPY showcases/mysql-dragonfly/ ./

# Create directory for static files  
RUN mkdir -p public

# Expose port
EXPOSE 3003

# Add health check script
RUN echo '#!/bin/sh\ncurl -f http://localhost:3003/api/health || exit 1' > /app/healthcheck.sh && \
    chmod +x /app/healthcheck.sh

# Start the application
CMD ["npm", "start"]