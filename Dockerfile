FROM node:20-alpine AS base

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Development target
FROM base AS development
CMD ["npm", "run", "dev", "--", "--host"]

# Production target
FROM base AS production
RUN npm run build
CMD ["node", "build"]

EXPOSE 9000
EXPOSE 24678 