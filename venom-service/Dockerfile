# ============================================
# Dockerfile - WhatsApp Multi-Tenant Service
# Baileys (WebSocket puro, sin navegador)
# ============================================

FROM node:20-alpine

LABEL maintainer="ELINA"
LABEL description="Multi-tenant WhatsApp service using Baileys"

# Solo dependencias mínimas (NO Chromium)
RUN apk add --no-cache \
    ca-certificates \
    dumb-init

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY src/ ./src/

RUN mkdir -p /sessions /app/logs && \
    chown -R node:node /sessions /app/logs /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "src/index.js"]
