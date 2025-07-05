# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Install system dependencies required for Puppeteer and Chrome
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    udev \
    ttf-liberation \
    && rm -rf /var/cache/apk/*

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install ALL dependencies (including dev dependencies for TypeScript build)
RUN npm ci

# Copy backend source code
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build to reduce image size
RUN npm ci --only=production && npm cache clean --force

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-accelerated-2d-canvas --no-first-run --no-zygote --single-process --disable-gpu"

# Change ownership of the app directory to nodejs user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 4000

# Start the application
CMD ["npm", "start"] 