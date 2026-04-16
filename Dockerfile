FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install build dependencies for bcrypt
RUN apk add --no-cache python3 make g++ openssl

# Set env vars
ENV HUSKY=0 CI=true NODE_ENV=production

# Copy everything
COPY . .

# Install all dependencies (this will work because prepare script will try to run husky but we have HUSKY=0)
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm prisma generate --schema=./apps/api/prisma/schema.prisma

# Build API
RUN pnpm build --filter=@grocio/api

# Copy the generated Prisma client to where it's needed at runtime
RUN cp -r node_modules/.prisma apps/api/node_modules/ 2>/dev/null || true

# Expose and run
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || true

WORKDIR /app/apps/api
CMD ["node", "dist/server.js"]
