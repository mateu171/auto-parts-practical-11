# ---------- Етап 1: збірка (builder) ----------
FROM node:22-alpine AS builder
WORKDIR /app

# окремий шар для залежностей — кешується, поки package*.json не змінюється
COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---------- Етап 2: мінімальний виробничий образ ----------
FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY public ./public

# запуск не від root
USER node

EXPOSE 3000
CMD ["node", "dist/main"]
