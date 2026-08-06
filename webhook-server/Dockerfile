# ──────────────────────────────────────────────────────────────────────────────
# Webhook Server Dockerfile
#
# Builds a minimal Node.js 20 Alpine image for the GitHub Issues receiver.
# Designed to run alongside Jenkins in the same docker-compose stack so it can
# reach Jenkins at http://jenkins:8080 without exposing credentials externally.
# ──────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine

# Non-root user for security
RUN addgroup -S webhook && adduser -S webhook -G webhook

WORKDIR /app

# Install dependencies first (layer-cached unless package.json changes)
COPY package.json ./
RUN npm install --omit=dev

# Copy application source
COPY server.js ./

# Own the files
RUN chown -R webhook:webhook /app

USER webhook

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
