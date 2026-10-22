# Multi-stage Dockerfile for AI Coding Interview Platform
# Base image with Node.js 22 LTS & Python 3 for sandbox execution
FROM node:22-alpine AS base
RUN apk add --no-cache python3 py3-pip sqlite libc6-compat
WORKDIR /app

# Dependency installation stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Production runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root system user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy build artifacts and dependencies
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Ensure writable temp dir for isolated code runner
RUN mkdir -p /tmp/devinterview-runner && chown -R nextjs:nodejs /tmp/devinterview-runner

USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start"]
