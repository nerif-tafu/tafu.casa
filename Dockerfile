FROM node:20-alpine as base

WORKDIR /app

# Copy package files and scripts first
COPY package*.json ./
COPY scripts ./scripts/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Development target
FROM base as development
CMD ["npm", "run", "dev", "--", "--host"]

# Production target
FROM base as production
RUN npm run build
CMD ["node", "build"]

EXPOSE 3000
EXPOSE 24678 