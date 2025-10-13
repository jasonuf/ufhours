# ---- Builder stage ----
FROM node:20-bookworm-slim AS builder

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# ---- Production stage ----
FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install Playwright browsers and system deps (Debian)
# This will apt-get the OS deps and download browsers.
RUN npx playwright install --with-deps chromium

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ENV PORT=9000
EXPOSE 9000
CMD ["node", "dist/index.js"]
