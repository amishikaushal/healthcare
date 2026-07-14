# Stage 1: Build the Node.js application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies needed for build)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application (TypeScript to JavaScript)
RUN npm run build

# Stage 2: Run the application
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the built output from the builder stage
COPY --from=builder /app/dist ./dist

# The seed script is written in TypeScript, but when compiled it will be in dist/database/seed.js.
# Ensure package.json scripts that rely on ts-node are either not used in prod or adjusted.
# In production, we run the compiled js: node dist/app.js.

EXPOSE 5001

# Add a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/api/v1/health || exit 1

# Start the server
CMD ["npm", "start"]
