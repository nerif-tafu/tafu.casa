FROM node:20-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000
EXPOSE 24678

CMD ["npm", "run", "dev", "--", "--host"] 