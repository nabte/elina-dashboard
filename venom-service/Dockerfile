# ============================================
# Dockerfile optimizado para Venom WhatsApp Service
# Con Chrome headless y dependencias mínimas
# ============================================

FROM node:20-alpine

# Metadatos
LABEL maintainer="ELINA"
LABEL description="Multi-tenant WhatsApp service using Venom"

# Instalar dependencias del sistema para Chrome/Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    npm \
    dumb-init

# Variables de entorno para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/lib/chromium/ \
    NODE_ENV=production

# Crear directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --only=production && npm cache clean --force

# Copiar código fuente
COPY src/ ./src/

# Crear directorio para sesiones con permisos correctos
RUN mkdir -p /sessions /app/logs && \
    chown -R node:node /sessions /app/logs /app

# Cambiar a usuario no-root
USER node

# Exponer puerto
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Usar dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicio
CMD ["node", "src/index.js"]
