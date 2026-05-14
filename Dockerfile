# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY ui/package*.json ./ui/
RUN npm --prefix ui ci --ignore-scripts

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

COPY ui/ ./ui/
RUN npm --prefix ui run build

FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="Toolwall" \
      org.opencontainers.image.description="Fail-closed stdio firewall for MCP tool traffic with an HTTP review harness" \
      org.opencontainers.image.source="https://github.com/shleder/toolwall" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

RUN apk add --no-cache dumb-init \
    && mkdir -p /data/.mcp-cache \
    && chown -R node:node /app /data

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/ui/dist ./ui/dist
COPY --chown=node:node examples/ ./examples/
COPY --chown=node:node scripts/ ./scripts/
COPY --chown=node:node docs/ ./docs/

ENV NODE_ENV=production
ENV MCP_CACHE_DIR=/data/.mcp-cache

USER node

EXPOSE 3000
EXPOSE 9090

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
