# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache g++ make python3

COPY package.json package-lock.json ./
COPY packages/toolwall-langchain/package.json ./packages/toolwall-langchain/package.json
COPY packages/toolwall-vercel-ai/package.json ./packages/toolwall-vercel-ai/package.json
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src/ ./src/
COPY packages/ ./packages/
RUN npm run build && npm run build --workspaces --if-present

COPY ui/package.json ui/package-lock.json ./ui/
RUN npm --prefix ui ci

COPY ui/ ./ui/
RUN npm --prefix ui run build

FROM node:20-alpine AS production-deps

WORKDIR /app

RUN apk add --no-cache g++ make python3

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --workspaces=false --ignore-scripts \
    && npm rebuild better-sqlite3 --build-from-source \
    && npm cache clean --force

FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="Toolwall" \
      org.opencontainers.image.description="Fail-closed stdio firewall for MCP tool traffic with an HTTP review harness" \
      org.opencontainers.image.source="https://github.com/shleder/toolwall" \
      org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production
ENV MCP_CACHE_DIR=/data/.mcp-cache

WORKDIR /app

RUN apk add --no-cache dumb-init \
    && addgroup -S toolwall \
    && adduser -S -G toolwall -h /home/toolwall-user toolwall-user \
    && mkdir -p /app /data/.mcp-cache \
    && chown -R toolwall-user:toolwall /app /data

COPY --chown=toolwall-user:toolwall package.json ./
COPY --chown=toolwall-user:toolwall --from=production-deps /app/node_modules ./node_modules
COPY --chown=toolwall-user:toolwall --from=builder /app/dist ./dist
COPY --chown=toolwall-user:toolwall --from=builder /app/ui/dist ./ui/dist

USER toolwall-user

EXPOSE 3000
EXPOSE 9090

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
