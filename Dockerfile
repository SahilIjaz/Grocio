FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy all files for build
COPY . .

# Install all dependencies (needed for monorepo catalogs)
RUN pnpm install --frozen-lockfile

# Build API only
RUN pnpm build --filter=@grocio/api

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy entire repo structure
COPY . .

# Copy built dist from builder stage
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Install production dependencies only (skip prepare scripts)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || true

# Start the application
WORKDIR /app/apps/api
CMD ["node", "dist/server.js"]
