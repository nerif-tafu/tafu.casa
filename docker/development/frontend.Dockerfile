FROM node:20

WORKDIR /app

# Copy package files
COPY package*.json ./

# Remove any existing node_modules to prevent Windows/Linux conflicts
RUN rm -rf node_modules

# Install dependencies for Linux
RUN npm install --platform=linux --arch=x64 && \
    npm rebuild @rollup/rollup-linux-x64-gnu && \
    npm rebuild rollup

# Create a directory for the node_modules that won't be overwritten by the volume mount
RUN mkdir -p /docker-node_modules && \
    cp -r node_modules/* /docker-node_modules/

# The source code will be mounted at runtime
EXPOSE 9000
ENV PORT=9000
ENV NODE_ENV=development
ENV ORIGIN=https://localhost:443

# Script to copy node_modules and start the app
CMD cp -r /docker-node_modules/* /app/node_modules/ && \
    VITE_ALLOW_ALL_HOSTS=true npm run dev:frontend 