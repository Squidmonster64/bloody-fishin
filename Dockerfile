FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy server and dist
COPY server.js ./
COPY dist/ ./dist/

# Expose port (Railway sets PORT env var automatically)
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
