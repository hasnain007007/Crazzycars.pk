# syntax=docker/dockerfile:1.7
# VPS / Coolify test image for storecraft-store (Next.js standalone)
# BuildKit cache mounts keep npm + Next.js caches between deploys (much faster rebuilds).

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Public env baked at build time when provided by Coolify/build args
ARG NEXT_PUBLIC_STORE_NAME=Crazzycars.pk
ARG NEXT_PUBLIC_APP_NAME=Crazzycars.pk
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_STORE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_ADMIN_URL
ENV NEXT_PUBLIC_STORE_NAME=$NEXT_PUBLIC_STORE_NAME \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_STORE_URL=$NEXT_PUBLIC_STORE_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL
# Some routes touch DB during `next build` page collection
ARG MONGODB_URI
ENV MONGODB_URI=$MONGODB_URI
RUN --mount=type=cache,target=/app/.next/cache \
    --mount=type=cache,target=/root/.npm \
    npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV MEDIA_ROOT=/app/media
# Coolify HTTP checks call curl (not in bookworm-slim). Probe with Node fetch instead.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 nextjs \
  && mkdir -p /app/media \
  && chown -R nextjs:nodejs /app/media
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod 755 /app/docker-entrypoint.sh \
  && chown nextjs:nodejs /app/docker-entrypoint.sh
COPY --chown=nextjs:nodejs healthcheck.js ./healthcheck.js
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
VOLUME ["/app/media"]
HEALTHCHECK --interval=30s --timeout=8s --start-period=60s --retries=5 \
  CMD node /app/healthcheck.js
ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
