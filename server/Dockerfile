FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY scripts ./scripts
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 CMD wget -qO- http://127.0.0.1:4000/healthz || exit 1
CMD ["node", "src/server.js"]
