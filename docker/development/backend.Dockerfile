FROM node:20-alpine

WORKDIR /app

# We'll mount the source code as a volume, so we only need to install dependencies
COPY package.json ./
RUN npm install

EXPOSE 9000
ENV PORT=9000
CMD ["npm", "run", "dev:backend"] 