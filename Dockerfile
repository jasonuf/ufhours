# ---- Builder stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install   # installs *all* deps, including typescript

COPY . .
RUN npm run build # compiles .ts → dist/*.js


# ---- Production stage ----
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production  # installs only runtime deps

COPY --from=builder /app/dist ./dist

ENV PORT=9000
EXPOSE 9000

CMD ["node", "dist/index.js"]
