# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --platform=linux --arch=x64

# Copy source code
COPY . .

# Build the application
RUN npm run build:frontend

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --production --platform=linux --arch=x64

# Copy built application
COPY --from=builder /app/build ./build

EXPOSE 9000
ENV PORT=9000
ENV NODE_ENV=production

CMD ["node", "build"] 