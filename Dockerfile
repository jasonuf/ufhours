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

# 1) Install node deps first (so npx uses YOUR Playwright version)
COPY package*.json ./
RUN npm ci --omit=dev

# 2) Now install browsers + OS deps for the SAME Playwright version
RUN npx playwright install --with-deps chromium

# App build output
COPY --from=builder /app/dist ./dist

ENV PORT=9000
EXPOSE 9000
CMD ["node", "dist/index.js"]
