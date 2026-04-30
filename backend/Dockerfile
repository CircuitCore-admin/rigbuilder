# ---- Build stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Build TypeScript
COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:22-alpine AS runner

# Install tini for proper PID 1 signal handling
RUN apk add --no-cache tini

WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy production artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Uploads directory (will be mounted as a volume in docker-compose)
RUN mkdir -p uploads && chown -R appuser:appgroup uploads

USER appuser

EXPOSE 4000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
