FROM node:20

WORKDIR /app

# We'll mount the source code as a volume, so we only need to install dependencies
COPY package.json ./

# Install dependencies with platform-specific flags
RUN npm install --platform=linux --arch=x64 && \
    npm rebuild rollup --platform=linux --arch=x64

EXPOSE 9000
ENV PORT=9000
ENV NODE_ENV=development
ENV ROLLUP_NATIVE_BUILD=0

CMD ["npm", "run", "dev:frontend"] 