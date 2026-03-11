# NEXUS OS - Complete Container Image
# This Dockerfile creates a portable, clonable version of NEXUS OS
# including Claude's soul, memories, and all data

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb* package-lock.json* ./
RUN npm install -g bun && bun install --frozen-lockfile || npm ci

# Copy source and build
COPY . .
RUN bun run build || npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    bash \
    sqlite \
    ca-certificates \
    tzdata

# Create non-root user
RUN addgroup --system --gid 1001 nexus && \
    adduser --system --uid 1001 nexus

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create directories for persistent data
RUN mkdir -p /app/db /app/backups /app/uploads && \
    chown -R nexus:nexus /app

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Environment
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/db/custom.db"
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Volumes for persistent data
VOLUME ["/app/db", "/app/backups", "/app/uploads"]

# Switch to non-root user
USER nexus

# Start
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
