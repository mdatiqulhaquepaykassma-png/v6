# ==============================================================================
# Multi-stage Production Dockerfile for Dokploy & Docker VPS Deployment
# ==============================================================================

# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies needed for build
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy all source files
COPY . .

# Build client assets into /app/dist and server into /app/server-dist/server.js
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Production runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATA_DIR=/data
ENV PERSISTENT_DATA_DIR=/data

# Install curl for healthcheck
RUN apk add --no-cache curl

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy pre-built client and bundled server artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server-dist ./server-dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/index.html ./index.html

# Ensure persistent data directory exists with write permissions
RUN mkdir -p /data && chmod 777 /data

# Expose production port
EXPOSE 3000

# Volume definition for persistent database storage
VOLUME ["/data"]

# Healthcheck monitoring
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fs http://localhost:3000/api/health || exit 1

# Start production server
CMD ["node", "server-dist/server.js"]
