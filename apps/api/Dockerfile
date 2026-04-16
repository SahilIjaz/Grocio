# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root level files (since build context is apps/api)
COPY ../.. ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build API
RUN pnpm build --filter=@grocio/api

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy root level files
COPY ../.. ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
WORKDIR /app/apps/api
CMD ["node", "dist/server.js"]
