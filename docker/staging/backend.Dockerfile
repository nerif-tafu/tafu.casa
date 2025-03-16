FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --production --platform=linux --arch=x64

# Copy source code
COPY server ./server

EXPOSE 9000
ENV PORT=9000
ENV NODE_ENV=production

CMD ["node", "server/server.js"] 