# Stage 1: install dependencies
FROM node:trixie-slim AS deps
WORKDIR /app

# Sistem paketlerini güncelle, güvenli init ekle
RUN apt-get update && apt-get upgrade -y && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# Paketleri kur
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: build application
FROM node:trixie-slim AS build
WORKDIR /app
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: production image
FROM node:trixie-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get upgrade -y && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Production dependencies'leri yeniden kur
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Uygulama dosyalarını ekle
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/.next ./.next

EXPOSE 3000
USER node
CMD ["dumb-init", "npm", "run", "start"]
