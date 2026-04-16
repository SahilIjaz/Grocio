FROM node:20-alpine

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json .
COPY pnpm-lock.yaml .

# Install production dependencies only
RUN pnpm install --prod --no-frozen-lockfile

# Copy the rest of the API files
COPY . .

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || true

# Start the application
CMD ["node", "dist/server.js"]
