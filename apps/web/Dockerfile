FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/web ./apps/web

# Install dependencies
RUN npm install -g pnpm && pnpm install --no-frozen-lockfile

# Build frontend
RUN pnpm --filter web build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/web ./apps/web

# Install production dependencies only
RUN npm install -g pnpm && pnpm install --prod --no-frozen-lockfile

# Copy built assets from builder
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public

# Expose port
EXPOSE 3000

# Start Next.js
WORKDIR /app/apps/web
CMD ["pnpm", "start"]
