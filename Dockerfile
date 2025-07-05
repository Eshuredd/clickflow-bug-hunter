# Use Node.js 18 as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files first (for better caching)
COPY backend/package*.json ./

# Install ALL dependencies (including devDependencies for TypeScript)
RUN npm ci

# Copy backend source code
COPY backend/ ./

# Build the TypeScript code
RUN npm run build

# Verify the build worked
RUN ls -la dist/

# Remove devDependencies after build
RUN npm ci --only=production

# Expose port
EXPOSE 4000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Start the application
CMD ["npm", "start"] 