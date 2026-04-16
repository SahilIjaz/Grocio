FROM node:20-alpine

WORKDIR /app

# Copy only necessary files from apps/api
COPY package.json package.json
COPY dist dist
COPY node_modules node_modules

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || true

# Start the application
CMD ["node", "dist/server.js"]
