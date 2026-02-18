FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* pnpm-lock.yaml* bun.lockb* ./

RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile; \
  elif [ -f bun.lockb ]; then bun install --frozen-lockfile; \
  else npm install; \
  fi

COPY . .

RUN npm run build

FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "build/index.js"]

